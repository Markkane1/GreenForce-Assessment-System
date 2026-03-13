# EPA Testing Suite

Online Testing System built with the MERN stack for admins, teachers, and students. The platform supports test authoring, sectioned exams, student group scheduling, deterministic exam delivery, auto-grading for MCQs, manual grading for essays, autosave, and anti-cheat logging.

## Prerequisites

- Node.js 18 or newer
- MongoDB running locally or a reachable MongoDB connection string

## Setup

1. Install root tooling:
   - `npm install`
2. Install backend dependencies:
   - `npm --prefix server install`
3. Install frontend dependencies:
   - `npm --prefix client install`
4. Create environment files:
   - copy `D:\web temps\EPA Testing Suite\server\.env.example` to `D:\web temps\EPA Testing Suite\server\.env`
   - copy `D:\web temps\EPA Testing Suite\client\.env.example` to `D:\web temps\EPA Testing Suite\client\.env`
5. Seed the database:
   - `node server/utils/seed.js`
6. Start both apps:
   - `npm run dev`

## Environment Variables

### Server

- `PORT` - API port, default `5000`
- `NODE_ENV` - environment name
- `CLIENT_URL` - allowed frontend origin for CORS
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - signing secret for JWTs
- `JWT_EXPIRES_IN` - token lifetime, for example `7d`
- `VIOLATION_THRESHOLD` - proctor violations before force submit

### Client

- `VITE_API_BASE_URL` - backend base URL, default `http://localhost:5000/api`

## Seed Credentials

The seed script creates these accounts:

- Admin: `admin@exam-pop.local` / `Admin123!`
- Teacher: `teacher@exam-pop.local` / `Teacher123!`
- Student: `student@exam-pop.local` / `Student123!`

## API Base URL

- Base URL: `http://localhost:5000/api`

## Authentication Flow

- `POST /api/auth/register` creates a new teacher or student account
- `POST /api/auth/login` returns a JWT token and user payload
- The client stores the JWT in `localStorage`
- Axios attaches `Authorization: Bearer <token>` automatically on protected requests
- A `401` response clears the token and redirects the client to `/login`

## Development Scripts

### Root

- `npm run dev` - runs backend and frontend together with `concurrently`

### Server

- `npm --prefix server run server` - starts the API with `nodemon`
- `npm --prefix server run seed` - seeds sample data
- `node server/utils/seed.js` - seeds the database directly from the repo root

### Client

- `npm --prefix client run dev` - starts the Vite development server

## Folder Structure

```text
root
|-- client
|   |-- pages
|   |-- components
|   |-- hooks
|   |-- services
|   `-- utils
|-- server
|   |-- controllers
|   |-- services
|   |-- routes
|   |-- models
|   |-- middlewares
|   |-- modules
|   `-- utils
`-- docs
```

## Key Routes

- `POST /api/auth/login`
- `GET /api/users`
- `GET /api/groups`
- `GET /api/tests`
- `PUT /api/sections/:id`
- `PUT /api/questions/:id`
- `GET /api/schedules`
- `POST /api/exam/start`
- `POST /api/exam/save-answer`
- `POST /api/exam/:attemptId/submit`
- `GET /api/exam/:attemptId/results`
- `GET /api/grading/attempts`
- `POST /api/proctor/log`
