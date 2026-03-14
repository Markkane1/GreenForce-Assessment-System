#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-green-force-assessment}"
PM2_NAME="${PM2_NAME:-green-force-assessment-api}"
PORT="${PORT:-3004}"
DOMAIN="${DOMAIN:-}"
APP_ROOT="${APP_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CLIENT_DIR="$APP_ROOT/client"
SERVER_DIR="$APP_ROOT/server"
CLIENT_BUILD_DIR="$CLIENT_DIR/dist"
SERVER_ENV_FILE="${SERVER_ENV_FILE:-$SERVER_DIR/.env}"
CLIENT_ENV_FILE="${CLIENT_ENV_FILE:-$CLIENT_DIR/.env.production}"
NGINX_AVAILABLE_DIR="${NGINX_AVAILABLE_DIR:-/etc/nginx/sites-available}"
NGINX_ENABLED_DIR="${NGINX_ENABLED_DIR:-/etc/nginx/sites-enabled}"
NGINX_CONF_NAME="${NGINX_CONF_NAME:-$APP_NAME.conf}"
NGINX_CONF_PATH="$NGINX_AVAILABLE_DIR/$NGINX_CONF_NAME"
ENABLE_CERTBOT="${ENABLE_CERTBOT:-false}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

usage() {
  cat <<EOF
Usage:
  DOMAIN=epagreenforceassesment.duckdns.org JWT_SECRET='...' MONGO_URI='...' ./deploy/quick-deploy.sh

Optional env:
  APP_NAME                 default: $APP_NAME
  PM2_NAME                 default: $PM2_NAME
  PORT                     default: $PORT
  APP_ROOT                 default: repo root
  CLIENT_URL               default: https://\$DOMAIN
  CORS_ALLOWED_ORIGINS     default: \$CLIENT_URL
  AUTH_COOKIE_SAMESITE     default: lax
  AUTH_COOKIE_SECURE       default: true
  TRUST_PROXY              default: 1
  ENABLE_CERTBOT           true|false, default: false
  CERTBOT_EMAIL            required if ENABLE_CERTBOT=true

Required env:
  DOMAIN
  JWT_SECRET
  MONGO_URI
EOF
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

set_env_key() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

write_server_env() {
  local client_url="${CLIENT_URL:-https://$DOMAIN}"
  local cors_origins="${CORS_ALLOWED_ORIGINS:-$client_url}"
  local auth_cookie_samesite="${AUTH_COOKIE_SAMESITE:-lax}"
  local auth_cookie_secure="${AUTH_COOKIE_SECURE:-true}"
  local trust_proxy="${TRUST_PROXY:-1}"
  local jwt_expires_in="${JWT_EXPIRES_IN:-7d}"
  local violation_threshold="${VIOLATION_THRESHOLD:-3}"

  touch "$SERVER_ENV_FILE"
  set_env_key "$SERVER_ENV_FILE" "PORT" "$PORT"
  set_env_key "$SERVER_ENV_FILE" "NODE_ENV" "production"
  set_env_key "$SERVER_ENV_FILE" "CLIENT_URL" "$client_url"
  set_env_key "$SERVER_ENV_FILE" "CORS_ALLOWED_ORIGINS" "$cors_origins"
  set_env_key "$SERVER_ENV_FILE" "MONGO_URI" "$MONGO_URI"
  set_env_key "$SERVER_ENV_FILE" "JWT_SECRET" "$JWT_SECRET"
  set_env_key "$SERVER_ENV_FILE" "JWT_EXPIRES_IN" "$jwt_expires_in"
  set_env_key "$SERVER_ENV_FILE" "VIOLATION_THRESHOLD" "$violation_threshold"
  set_env_key "$SERVER_ENV_FILE" "TRUST_PROXY" "$trust_proxy"
  set_env_key "$SERVER_ENV_FILE" "AUTH_COOKIE_SAMESITE" "$auth_cookie_samesite"
  set_env_key "$SERVER_ENV_FILE" "AUTH_COOKIE_SECURE" "$auth_cookie_secure"
}

write_client_env() {
  local api_base_url="${VITE_API_BASE_URL:-https://$DOMAIN/api}"
  mkdir -p "$CLIENT_DIR"
  cat > "$CLIENT_ENV_FILE" <<EOF
VITE_API_BASE_URL=$api_base_url
EOF
}

write_nginx_conf() {
  sudo mkdir -p "$NGINX_AVAILABLE_DIR" "$NGINX_ENABLED_DIR"

  sudo tee "$NGINX_CONF_PATH" >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    root $CLIENT_BUILD_DIR;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:$PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

  if [[ ! -L "$NGINX_ENABLED_DIR/$NGINX_CONF_NAME" ]]; then
    sudo ln -sf "$NGINX_CONF_PATH" "$NGINX_ENABLED_DIR/$NGINX_CONF_NAME"
  fi

  sudo nginx -t
  sudo systemctl reload nginx
}

reload_pm2() {
  sudo mkdir -p /var/log/pm2
  export APP_ROOT
  export PORT

  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 startOrReload "$APP_ROOT/deploy/ecosystem.config.cjs" --only "$PM2_NAME" --update-env
  else
    pm2 start "$APP_ROOT/deploy/ecosystem.config.cjs" --only "$PM2_NAME" --update-env
  fi

  pm2 save
}

run_certbot() {
  if [[ "$ENABLE_CERTBOT" != "true" ]]; then
    return
  fi

  if [[ -z "$CERTBOT_EMAIL" ]]; then
    echo "CERTBOT_EMAIL is required when ENABLE_CERTBOT=true" >&2
    exit 1
  fi

  sudo certbot --nginx --non-interactive --agree-tos -m "$CERTBOT_EMAIL" -d "$DOMAIN" --redirect
}

main() {
  if [[ "${1:-}" == "--help" ]]; then
    usage
    exit 0
  fi

  [[ -n "$DOMAIN" ]] || { echo "DOMAIN is required" >&2; usage; exit 1; }
  [[ -n "${JWT_SECRET:-}" ]] || { echo "JWT_SECRET is required" >&2; usage; exit 1; }
  [[ -n "${MONGO_URI:-}" ]] || { echo "MONGO_URI is required" >&2; usage; exit 1; }

  require_command node
  require_command npm
  require_command pm2
  require_command nginx

  cd "$APP_ROOT"

  write_server_env
  write_client_env

  npm install
  npm --prefix server install
  npm --prefix client install
  npm --prefix client run build

  reload_pm2
  write_nginx_conf
  run_certbot

  cat <<EOF
Deployment completed.

App root:        $APP_ROOT
Domain:          $DOMAIN
API port:        $PORT
PM2 process:     $PM2_NAME
Server env file: $SERVER_ENV_FILE
Client env file: $CLIENT_ENV_FILE
Nginx config:    $NGINX_CONF_PATH
EOF
}

main "$@"
