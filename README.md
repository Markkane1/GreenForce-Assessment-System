# Green Force Assessment System

Online testing platform for admins, teachers, and students. The system supports invite-code student onboarding, sectioned tests, exam scheduling, deterministic exam delivery, MCQ auto-grading, essay grading, anti-cheat logging, and result reporting.

## Stack

- Backend: Node.js, Express, MongoDB, Mongoose
- Frontend: React, Vite, React Router
- Auth: JWT in `httpOnly` cookie + CSRF token
- Runtime: PM2 + Nginx

## Local setup

1. Install dependencies
   - `npm install`
   - `npm --prefix server install`
   - `npm --prefix client install`
2. Create env files
   - copy `server/.env.example` to `server/.env`
   - copy `client/.env.example` to `client/.env`
3. Seed sample data
   - `npm --prefix server run seed`
4. Start development
   - `npm run dev`

## Current auth model

- Public registration is student-only via `POST /api/auth/register-student`
- Invite code validation is public via `POST /api/invite-codes/validate`
- Admins and teachers are created by admin UI or seed script
- The client does not use `localStorage` auth tokens as the primary auth path
- Protected requests rely on:
  - `auth_token` cookie
  - `csrf_token` cookie + `X-CSRF-Token` header on state-changing requests

## Seed credentials

- Admin: `admin@exam-pop.local` / `Admin123!`
- Teacher: `teacher@exam-pop.local` / `Teacher123!`
- Student: `student@exam-pop.local` / `Student123!`

EPA inspector accounts are also seeded by `npm --prefix server run seed`.

## Environment

### Server

Required:

- `PORT`
- `NODE_ENV`
- `CLIENT_URL`
- `MONGO_URI`
- `JWT_SECRET`

Important:

- `CORS_ALLOWED_ORIGINS`
  - comma-separated list of allowed frontend origins
  - if omitted, falls back to `CLIENT_URL`
- `TRUST_PROXY`
  - set to `1` behind Nginx
- `AUTH_COOKIE_SAMESITE`
  - `lax` for same-site frontend/API
  - `none` only when frontend and API are cross-site
- `AUTH_COOKIE_SECURE`
  - must be `true` in production over HTTPS

### Client

- `VITE_API_BASE_URL`
  - example: `https://greenforceassessment.duckdns.org/api`

## Build

- Client build:
  - `npm run build`
- API production start:
  - `npm run start`

## Oracle/Nginx/PM2 deployment

Recommended deployment shape:

- serve `client/dist` with Nginx
- reverse proxy `/api` to the Node API
- run the API on port `3004`
- use a single public domain for frontend + API if possible

Included deploy templates:

- PM2: `deploy/ecosystem.config.cjs`
- Nginx: `deploy/nginx-green-force-assessment.conf`
- Quick deploy script: `deploy/quick-deploy.sh`

### Quick deployment

On your Ubuntu server, from the checked-out repo:

```bash
chmod +x deploy/quick-deploy.sh

DOMAIN=greenforceassessment.duckdns.org \
JWT_SECRET='replace-with-a-long-random-secret-of-at-least-32-characters' \
MONGO_URI='mongodb://127.0.0.1:27017/green-force-assessment' \
./deploy/quick-deploy.sh
```

If you want the script to also issue/refresh the certificate:

```bash
DOMAIN=greenforceassessment.duckdns.org \
JWT_SECRET='replace-with-a-long-random-secret-of-at-least-32-characters' \
MONGO_URI='mongodb://127.0.0.1:27017/green-force-assessment' \
ENABLE_CERTBOT=true \
CERTBOT_EMAIL='you@example.com' \
./deploy/quick-deploy.sh
```

The script will:

- write/update `server/.env`
- write/update `client/.env.production`
- install dependencies
- build the client
- start or reload the API with PM2
- write and enable the Nginx site config
- test and reload Nginx

### Production env example

Server:

```env
PORT=3004
NODE_ENV=production
CLIENT_URL=https://greenforceassessment.duckdns.org
CORS_ALLOWED_ORIGINS=https://greenforceassessment.duckdns.org
MONGO_URI=mongodb://127.0.0.1:27017/green-force-assessment
JWT_SECRET=replace-with-a-long-random-secret-of-at-least-32-characters
JWT_EXPIRES_IN=7d
VIOLATION_THRESHOLD=3
TRUST_PROXY=1
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=true
```

Client:

```env
VITE_API_BASE_URL=https://greenforceassessment.duckdns.org/api
```

## Deployment notes

- If you deploy frontend and API on different origins, use:
  - `AUTH_COOKIE_SAMESITE=none`
  - `AUTH_COOKIE_SECURE=true`
- In production, the API now rejects startup if:
  - `JWT_SECRET` is weak/placeholder
  - `CLIENT_URL` is missing
  - `AUTH_COOKIE_SAMESITE=none` without `AUTH_COOKIE_SECURE=true`
- `CORS_ALLOWED_ORIGINS` accepts multiple origins as a comma-separated list.

## Reset-password caveat

The backend stores reset tokens correctly, but there is no SMTP mailer in this repo yet. In production, the forgot-password flow is not complete until you integrate email delivery.

## Sanity checklist before go-live

- `npm run build` passes
- API starts with production env
- `/login` loads behind Nginx
- login sets auth + CSRF cookies
- `/api/auth/me` succeeds after login
- admin can manage users and groups
- teacher can create, publish, and schedule a test
- student can start, save, submit, and view results
- invite-code signup works
- MongoDB is not exposed publicly
