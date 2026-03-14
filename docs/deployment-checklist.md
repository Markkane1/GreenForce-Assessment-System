# Deployment Checklist

This checklist covers the minimum production setup for the Online Testing System.

## 1. Environment

Set these server variables before starting the API:

```env
PORT=5000
NODE_ENV=production
CLIENT_URL=https://your-client-domain.example
MONGO_URI=mongodb+srv://...
JWT_SECRET=use-a-long-random-secret-at-least-32-characters
JWT_EXPIRES_IN=7d
VIOLATION_THRESHOLD=3
TRUST_PROXY=1
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=true
```

Set the client API base URL:

```env
VITE_API_BASE_URL=https://your-api-domain.example/api
```

## 2. Cookie and origin model

The current auth flow is cookie-based and CSRF-protected.

- `CLIENT_URL` must match the deployed frontend origin exactly.
- `AUTH_COOKIE_SECURE=true` is required behind HTTPS.
- `AUTH_COOKIE_SAMESITE=lax` is correct for same-site frontend/API deployments.
- If the frontend and API are on different sites, use `AUTH_COOKIE_SAMESITE=none` and keep `AUTH_COOKIE_SECURE=true`.

## 3. Reverse proxy

If the API is behind Nginx, Caddy, Cloudflare, Render, Railway, or any other proxy:

- set `TRUST_PROXY=1`
- terminate HTTPS at the proxy
- forward the original client IP

Without `TRUST_PROXY`, rate limiting and secure cookie behavior can be inaccurate behind a proxy.

## 4. Build and startup

From the repo root:

```powershell
npm install
npm --prefix server install
npm --prefix client install
npm --prefix client run build
```

Start the API in production:

```powershell
npm --prefix server start
```

Serve the built client from your preferred static host or reverse proxy using:

```text
client/dist
```

## 5. Production smoke checks

Verify these after deployment:

- `/login` loads
- login succeeds and sets auth cookie
- `/api/auth/me` returns the current user after login
- admin can open `/admin/users` and `/admin/groups`
- teacher can create a test and schedule
- student can start, save, and submit an exam
- results page loads after submission
- invite code validation and student signup work

## 6. Security checks

Confirm these in production:

- HTTPS is enforced end to end
- auth cookie is `HttpOnly` and `Secure`
- CSRF header is sent on state-changing requests
- `JWT_SECRET` is not a placeholder value
- MongoDB is not publicly exposed
- proxy only exposes intended API routes

## 7. Data and operational hygiene

Before launch:

- remove QA/demo-only records if they should not appear in production
- seed only the accounts and groups you actually want available
- confirm the email reset flow points to the deployed frontend origin
- confirm log retention and backup strategy for MongoDB
