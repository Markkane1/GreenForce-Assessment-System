# AGENTS.md — Online Testing System (MERN)

## Project Overview

This is a production-ready Online Testing System built on the MERN stack.
Teachers create and schedule exams; students take timed, proctored tests.
The system supports MCQ auto-grading, essay manual grading, anti-cheat logging,
question pools, and sectioned tests.

---

## Tech Stack

| Layer        | Technology                                              |
|--------------|---------------------------------------------------------|
| Backend      | Node.js, Express.js, MongoDB, Mongoose                  |
| Frontend     | React (Vite), React Router, Axios                       |
| Styling      | TailwindCSS + Official Standard Design System           |
| Fonts        | Inter (UI), JetBrains Mono (code/monospace) — Google Fonts |
| Icons        | Lucide React — always strokeWidth={2.5}                 |
| Auth         | JWT (access + refresh tokens)                           |
| State        | React Context + custom hooks                            |

---

## Architecture Rules (Enforced for All Agents)

- **Controllers are thin** — they parse req/res and call service methods only.
- **Business logic lives in services** — never in controllers or routes.
- **All async handlers use try/catch** or a central `asyncHandler` wrapper.
- **Middleware handles** authentication (`protect`) and role authorization (`authorize(...roles)`).
- **Models live in `/server/models/`** and are imported only by their own module's service.
- **Frontend pages never call `axios` directly** — all API calls go through `/client/src/services/`.
- **Custom hooks** in `/client/src/hooks/` encapsulate stateful logic consumed by pages/components.
- **No `console.log` in production paths** — use a logger utility.
- **Environment variables** are accessed only through a central `config.js` (backend) or `env.js` (frontend).
- **All frontend styling must follow the Official Standard Design System** defined below — no generic Tailwind defaults.

---

## Folder Structure

```
root/
├── server/                          # Express backend
│   ├── config/
│   │   └── db.js                    # Mongoose connection
│   ├── models/
│   │   ├── User.js
│   │   ├── StudentGroup.js
│   │   ├── GroupMember.js
│   │   ├── Test.js
│   │   ├── TestSchedule.js
│   │   ├── Section.js
│   │   ├── Question.js
│   │   ├── MCQOption.js
│   │   ├── TestAttempt.js
│   │   ├── Answer.js
│   │   ├── ProctorLog.js
│   │   └── InviteCode.js
│   ├── middlewares/
│   │   ├── authMiddleware.js        # protect + authorize
│   │   └── errorMiddleware.js       # global error handler
│   ├── utils/
│   │   ├── asyncHandler.js
│   │   ├── generateToken.js
│   │   └── logger.js
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.routes.js
│   │   ├── users/
│   │   │   ├── users.controller.js
│   │   │   ├── users.service.js
│   │   │   └── users.routes.js
│   │   ├── groups/
│   │   │   ├── groups.controller.js
│   │   │   ├── groups.service.js
│   │   │   └── groups.routes.js
│   │   ├── tests/
│   │   │   ├── tests.controller.js
│   │   │   ├── tests.service.js
│   │   │   └── tests.routes.js
│   │   ├── sections/
│   │   │   ├── sections.controller.js
│   │   │   ├── sections.service.js
│   │   │   └── sections.routes.js
│   │   ├── questions/
│   │   │   ├── questions.controller.js
│   │   │   ├── questions.service.js
│   │   │   └── questions.routes.js
│   │   ├── schedules/
│   │   │   ├── schedules.controller.js
│   │   │   ├── schedules.service.js
│   │   │   └── schedules.routes.js
│   │   ├── examEngine/
│   │   │   ├── examEngine.controller.js
│   │   │   ├── examEngine.service.js
│   │   │   └── examEngine.routes.js
│   │   ├── grading/
│   │   │   ├── grading.controller.js
│   │   │   ├── grading.service.js
│   │   │   └── grading.routes.js
│   │   └── antiCheat/
│   │       ├── antiCheat.controller.js
│   │       ├── antiCheat.service.js
│   │       └── antiCheat.routes.js
│   │   └── inviteCodes/
│   │       ├── inviteCodes.controller.js
│   │       ├── inviteCodes.service.js
│   │       └── inviteCodes.routes.js
│   ├── app.js                       # Express app setup
│   └── server.js                    # HTTP server entry point
│
└── client/                          # React frontend (Vite)
    ├── index.html                   # Google Fonts link tags go here
    ├── vite.config.js
    ├── tailwind.config.js           # All design tokens configured here
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx                  # Router + route guards
    │   ├── index.css                # Tailwind directives + base body styles
    │   ├── env.js                   # import.meta.env wrappers
    │   ├── services/
    │   │   ├── api.js               # Axios instance + interceptors
    │   │   ├── authService.js
    │   │   ├── userService.js
    │   │   ├── groupService.js
    │   │   ├── testService.js
    │   │   ├── scheduleService.js
    │   │   ├── examService.js
    │   │   ├── gradingService.js
    │   │   └── inviteCodeService.js
    │   ├── hooks/
    │   │   ├── useAuth.js
    │   │   ├── useExamTimer.js
    │   │   ├── useAutosave.js
    │   │   ├── useFullscreen.js
    │   │   └── useAntiCheat.js
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── components/
    │   │   ├── admin/
    │   │   │   └── InviteCodesPanel.jsx  # invite code management modal
    │   │   ├── common/
    │   │   │   ├── Navbar.jsx
    │   │   │   ├── Sidebar.jsx
    │   │   │   ├── ProtectedRoute.jsx
    │   │   │   ├── RoleRoute.jsx
    │   │   │   ├── LoadingSpinner.jsx
    │   │   │   └── Modal.jsx
    │   │   ├── exam/
    │   │   │   ├── QuestionNavigator.jsx
    │   │   │   ├── MCQQuestion.jsx
    │   │   │   ├── EssayQuestion.jsx
    │   │   │   ├── CountdownTimer.jsx
    │   │   │   └── SubmitConfirmModal.jsx
    │   │   ├── builder/
    │   │   │   ├── SectionCard.jsx
    │   │   │   ├── QuestionForm.jsx
    │   │   │   ├── MCQOptionEditor.jsx
    │   │   │   └── TestSettingsForm.jsx
    │   │   └── grading/
    │   │       ├── EssayGradingCard.jsx
    │   │       └── ScoreSummary.jsx
    │   └── pages/
    │       ├── auth/
    │       │   ├── LoginPage.jsx
    │       │   ├── SignupPage.jsx        # two-step: invite code → account creation
    │       │   ├── ForgotPasswordPage.jsx
    │       │   └── ResetPasswordPage.jsx
    │       ├── admin/
    │       │   ├── AdminDashboard.jsx
    │       │   ├── UserManagement.jsx
    │       │   └── GroupManagement.jsx
    │       ├── teacher/
    │       │   ├── TeacherDashboard.jsx
    │       │   ├── TestBuilder.jsx
    │       │   ├── ExamScheduler.jsx
    │       │   ├── GradingPage.jsx
    │       │   └── MonitorPage.jsx          # live exam monitoring
    │       ├── student/
    │       │   ├── StudentDashboard.jsx
    │       │   ├── ExamPage.jsx
    │       │   └── ResultsPage.jsx
    │       └── utility/
    │           ├── NotFoundPage.jsx         # 404 catch-all
    │           └── UnauthorizedPage.jsx     # role mismatch target
```

---

## User Roles & Permissions

| Role    | Permissions                                                                 |
|---------|-----------------------------------------------------------------------------|
| admin   | Manage users (CRUD), manage groups, view system analytics                   |
| teacher | Create/edit tests, create questions, schedule exams, grade essays, monitor  |
| student | View scheduled exams assigned to their group, take exams, view own results  |

Route protection:
- `protect` middleware — verifies JWT on every protected route
- `authorize('admin')` / `authorize('teacher')` / `authorize('student')` — role gate

---

## Database Models (Summary)

| Model        | Key Fields                                                                                                    |
|--------------|---------------------------------------------------------------------------------------------------------------|
| User         | name, email, phone, password (hashed), role, resetPasswordToken, resetPasswordExpires                         |
| StudentGroup | name, description, createdBy (ref: User)                                                                      |
| GroupMember  | groupId, studentId                                                                                            |
| InviteCode   | code (unique), groupId (ref: StudentGroup), createdBy (ref: User), isUsed, usedBy, usedAt, expiresAt          |
| Test         | title, timeLimitMinutes, passingScore, maxAttempts, allowResume, randomize*, createdBy                        |
| TestSchedule | testId, startTime, endTime, assignedGroups[]                                                                  |
| Section      | testId, title, order, questionPoolSize, questionsToServe                                                      |
| Question     | sectionId, type (mcq/essay), content, points, maxWordCount                                                    |
| MCQOption    | questionId, text, isCorrect                                                                                   |
| TestAttempt  | testId, scheduleId, studentId, startedAt, submittedAt, status, violationsCount, score                         |
| Answer       | attemptId, questionId, selectedOptionId, essayText, score, feedback, gradingStatus                            |
| ProctorLog   | attemptId, eventType, timestamp, metadata                                                                     |

---

## API Modules & Endpoints

### Auth
```
POST   /api/auth/register-student       { name, email, phone, password, inviteCode } — public, students only
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password        { email }
POST   /api/auth/reset-password         { token, newPassword }
PUT    /api/auth/change-password        { currentPassword, newPassword } — requires protect
```
NOTE: POST /api/auth/register (open registration) is REMOVED. Students register via invite code only.
Teachers and admins are created via admin UserManagement UI or the seed script — never via public API.

### Invite Codes (admin only, except validate)
```
POST   /api/invite-codes/validate       { code } — PUBLIC, no auth — returns { valid, groupId, groupName }
POST   /api/invite-codes/single         { groupId } — generate one code
POST   /api/invite-codes/bulk           { groupId, count } — generate 1–500 codes
GET    /api/invite-codes/:groupId       — list all codes for a group
DELETE /api/invite-codes/:id            — delete unused code only
```

Code format: WORD1-WORD2-NN (e.g. TIGER-CLOUD-47)
- Two human-readable words from a fixed 200-word list (animals, nature, positive objects)
- Two digits (10–99), always 2 digits
- All uppercase, hyphen-separated
- Unique enforced at DB level (unique index on code field)
- Single-use: consumed atomically on successful student registration
- Consumed code is never deleted — isUsed: true + usedBy + usedAt are recorded for audit

### Users (admin)
```
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Groups (admin/teacher)
```
GET    /api/groups
POST   /api/groups
PUT    /api/groups/:id
DELETE /api/groups/:id
POST   /api/groups/:id/members
DELETE /api/groups/:id/members/:studentId
```

### Tests (teacher)
```
GET    /api/tests
POST   /api/tests
GET    /api/tests/:id
PUT    /api/tests/:id
DELETE /api/tests/:id
POST   /api/tests/:id/publish
```

### Sections
```
GET    /api/tests/:testId/sections
POST   /api/tests/:testId/sections
PUT    /api/sections/:id
DELETE /api/sections/:id
```

### Questions
```
GET    /api/sections/:sectionId/questions
POST   /api/sections/:sectionId/questions
PUT    /api/questions/:id
DELETE /api/questions/:id
```

### Schedules
```
GET    /api/schedules                   (teacher: own | student: assigned)
POST   /api/schedules
PUT    /api/schedules/:id
DELETE /api/schedules/:id
```

### Exam Engine (student)
```
POST   /api/exam/start                  { scheduleId } — creates or resumes attempt
GET    /api/exam/:attemptId/questions   (returns randomized question set)
POST   /api/exam/save-answer            { attemptId, questionId, answer }
POST   /api/exam/:attemptId/submit
GET    /api/exam/:attemptId/status
GET    /api/exam/my-attempts            — student's own submitted attempts list
```

### Monitor (teacher)
```
GET    /api/schedules/:id/active-attempts   — in-progress attempts with violation counts
```

### Grading (teacher)
```
GET    /api/grading/attempts            (filter by testId, status)
GET    /api/grading/attempts/:id
POST   /api/grading/essay               { answerId, score, feedback }
POST   /api/grading/:attemptId/finalize
```

### Anti-Cheat
```
POST   /api/proctor/log                 { attemptId, eventType, metadata }
GET    /api/proctor/:attemptId/logs     (teacher/admin only)
```

---

## Exam Engine Logic

1. Student calls `POST /api/exam/start` with `scheduleId`
2. Server validates: schedule window active, student in assigned group, attempts not exceeded
3. **Resume check**: if an `in_progress` attempt already exists for `studentId + scheduleId`
   AND `test.allowResume = true` → return the existing attempt immediately (skip steps 4–6)
4. Server creates `TestAttempt` with status `in_progress`
5. For each section: randomly sample `questionsToServe` from `questionPoolSize`
6. If `randomizeOptions`: shuffle MCQ option order per question; store in `optionOrder`
7. Store `questionOrder` array in attempt document
8. Return attempt ID + question set to client
9. Client starts countdown timer from `timeLimitMinutes` (adjusted for elapsed time on resume)
10. Autosave fires on question change + every 20 seconds
11. On submit (or timer expiry): `POST /api/exam/:attemptId/submit`
12. Server runs auto-grading for all MCQ answers
13. Essay answers set to `gradingStatus: pending`
14. Attempt status set to `submitted`; `score` stored (MCQ portion)

---

## Anti-Cheat Rules

| Event             | Client Action                        | Server Action                            |
|-------------------|--------------------------------------|------------------------------------------|
| Fullscreen exit   | Show warning, log violation          | `POST /api/proctor/log`, increment count |
| Tab switch        | Show warning, log violation          | Same                                     |
| Copy attempt      | Block + log                          | Same                                     |
| Threshold breach  | Auto-submit exam                     | Status → `force_submitted`               |

Default threshold: **3 violations** (configurable via env `VIOLATION_THRESHOLD`).

---

## Invite Code System

### Rules (enforced at every layer)

1. **Students only** — public registration is closed. Only students register via invite code. Teachers and admins are created by admin via UserManagement or seed script.
2. **Single use** — each code can create exactly one student account. The code is consumed atomically on successful registration using `findOneAndUpdate` to prevent race conditions.
3. **Group assignment** — the invite code determines which `StudentGroup` the student is added to. A `GroupMember` record is created automatically on registration.
4. **Code is never deleted after use** — `isUsed: true`, `usedBy`, `usedAt` are recorded for audit purposes.
5. **Validate before register** — `POST /invite-codes/validate` is a public read-only check. It does not consume the code. Consumption happens only in `registerStudent`.
6. **Phone is required** — the signup form collects phone number alongside name, email, and password.
7. **Role is server-enforced** — the `role` field is hardcoded to `'student'` in `registerStudent`. It is never read from the request body.

### Code Format
- Pattern: `WORD1-WORD2-NN` e.g. `TIGER-CLOUD-47`
- Words: two words from a fixed 200-word list (animals, nature, positive objects — all uppercase)
- Digits: always 2 digits in range 10–99 (never single digit)
- Uniqueness: checked at DB level via unique index + pre-insert collision retry (up to 5 attempts)

### Bulk Generation
- Admin selects a group → clicks "Generate in Bulk" → modal asks for count (1–500)
- Server generates all codes and inserts with `insertMany` (single DB operation)
- Admin can export all codes for a group as CSV (client-side generation, no server call)
- CSV includes: Code, Status, Group, Used By name, Used By email, Used At, Created At

---

## Design System — Official Standard

**Every frontend agent must read and apply this section in full.**
Configure `tailwind.config.js` tokens before writing any component or page.
Do not deviate from these tokens. Do not introduce new colors, shadows, or radii not listed here.

### Philosophy

**"Authority through clarity."**
This system is designed for government and military assessment environments.
The interface must communicate trust, legibility, and control at all times.
No decorative shapes, no playful shadows, no bouncing animations.
Every element earns its place by serving a functional purpose.

**The Vibe: Structured. Precise. Trustworthy. Authoritative.**
It feels like a well-designed government portal — clear hierarchy, no ambiguity, high contrast,
calm under pressure. Users must be able to focus entirely on the task, not the interface.

### Visual Signatures
- **Flat depth** — subtle `box-shadow` with blur for elevation. No hard offset shadows.
- **Strict grid** — 4px base unit. All spacing in multiples of 4.
- **Restrained color** — neutral base with a single authoritative accent. Status colors only for meaning.
- **Typographic hierarchy** — size and weight do all the work. No decorative fills or patterns.
- **Sharp but not harsh** — `rounded-md` (6px) as the default radius. Rounded-lg only for modals.

---

### tailwind.config.js — Full Token Configuration

```js
// tailwind.config.js
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class', // toggled by adding 'dark' class to <html>
  theme: {
    extend: {
      colors: {
        // ── Light mode tokens ──
        background:   '#F5F5F4',  // Warm stone-100 — main page bg
        surface:      '#FFFFFF',  // White — cards, panels, inputs
        surfaceAlt:   '#FAFAF9',  // Stone-50 — sidebar, secondary panels
        foreground:   '#1C1917',  // Stone-900 — primary text (AAA)
        muted:        '#E7E5E4',  // Stone-200 — dividers, subtle fills
        mutedFg:      '#78716C',  // Stone-500 — secondary/helper text
        accent:       '#1D4ED8',  // Blue-700 — primary CTAs, links, active states
        accentHover:  '#1E40AF',  // Blue-800 — hover on accent
        accentFg:     '#FFFFFF',  // White — text on accent bg
        accentSubtle: '#EFF6FF',  // Blue-50 — subtle accent bg (selected rows etc)
        border:       '#D6D3D1',  // Stone-300 — default borders
        borderStrong: '#A8A29E',  // Stone-400 — emphasized borders, table lines
        // ── Status colors (use ONLY for their semantic meaning) ──
        success:      '#15803D',  // Green-700 — pass, confirmed, active
        successBg:    '#F0FDF4',  // Green-50 — success backgrounds
        warning:      '#B45309',  // Amber-700 — caution, pending
        warningBg:    '#FFFBEB',  // Amber-50 — warning backgrounds
        danger:       '#B91C1C',  // Red-700 — fail, violation, error
        dangerBg:     '#FEF2F2',  // Red-50 — danger backgrounds
        info:         '#0369A1',  // Sky-700 — informational
        infoBg:       '#F0F9FF',  // Sky-50 — info backgrounds
      },
      fontFamily: {
        heading: ['"Inter"', ...defaultTheme.fontFamily.sans],
        body:    ['"Inter"', ...defaultTheme.fontFamily.sans],
        mono:    ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
      },
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1rem',    letterSpacing: '0.01em' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],
        'base': ['1rem',     { lineHeight: '1.5rem',  letterSpacing: '0em'    }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em'}],
        'xl':   ['1.25rem',  { lineHeight: '1.75rem', letterSpacing: '-0.01em'}],
        '2xl':  ['1.5rem',   { lineHeight: '2rem',    letterSpacing: '-0.02em'}],
        '3xl':  ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em'}],
        '4xl':  ['2.25rem',  { lineHeight: '2.5rem',  letterSpacing: '-0.03em'}],
      },
      borderRadius: {
        'sm':  '4px',
        'md':  '6px',   // default — use for inputs, buttons, small cards
        'lg':  '10px',  // use for modals, large panels
        'xl':  '14px',  // use sparingly — only full-page cards
        'full': '9999px',  // pills only — badges, tags
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'panel':   '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'modal':   '0 20px 25px -5px rgb(0 0 0 / 0.12), 0 8px 10px -6px rgb(0 0 0 / 0.08)',
        'input':   'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'focus':   '0 0 0 3px rgb(29 78 216 / 0.25)',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':      { transform: 'translateX(-6px)' },
          '40%':      { transform: 'translateX(6px)' },
          '60%':      { transform: 'translateX(-4px)' },
          '80%':      { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'shake':    'shake 0.4s ease-in-out',
      },
      transitionTimingFunction: {
        'standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
```

---

### Dark Mode Token Overrides

Apply dark mode via CSS variables in `index.css`. The `dark` class is toggled on `<html>` by the theme switcher.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: light;
  }

  .dark {
    color-scheme: dark;
  }

  body {
    @apply bg-background text-foreground font-body text-base antialiased;
  }

  .dark body,
  .dark {
    --tw-bg-opacity: 1;
    background-color: #0C0A09;   /* Stone-950 — dark bg */
    color: #F5F5F4;               /* Stone-100 — dark text */
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-heading font-semibold tracking-tight;
  }
}
```

Dark mode color equivalents (use in components via conditional class or CSS var):
| Token        | Light          | Dark                    |
|--------------|----------------|-------------------------|
| background   | #F5F5F4        | #0C0A09 (stone-950)     |
| surface      | #FFFFFF        | #1C1917 (stone-900)     |
| surfaceAlt   | #FAFAF9        | #292524 (stone-800)     |
| foreground   | #1C1917        | #F5F5F4 (stone-100)     |
| muted        | #E7E5E4        | #44403C (stone-700)     |
| mutedFg      | #78716C        | #A8A29E (stone-400)     |
| border       | #D6D3D1        | #44403C (stone-700)     |
| borderStrong | #A8A29E        | #78716C (stone-500)     |
| accent       | #1D4ED8        | #3B82F6 (blue-500)      |
| accentSubtle | #EFF6FF        | #1E3A5F (custom dark)   |

Apply dark mode in components using Tailwind's `dark:` prefix:
```jsx
<div className="bg-surface dark:bg-stone-900 border border-border dark:border-stone-700">
```

---

### Google Fonts — Add to `index.html` `<head>`

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

### Component Patterns

#### Primary Button
```jsx
<button className="
  inline-flex items-center gap-2 px-4 py-2
  bg-accent hover:bg-accentHover active:bg-accentHover
  text-accentFg text-sm font-semibold
  rounded-md border border-transparent
  shadow-sm
  transition-colors duration-150 ease-standard
  focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
  min-h-[40px]
  dark:focus:ring-offset-stone-900
">
  Label
</button>
```

#### Secondary Button (outlined)
```jsx
<button className="
  inline-flex items-center gap-2 px-4 py-2
  bg-surface hover:bg-muted active:bg-muted
  text-foreground text-sm font-medium
  rounded-md border border-border
  shadow-sm
  transition-colors duration-150 ease-standard
  focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
  min-h-[40px]
  dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100 dark:hover:bg-stone-700
">
  Label
</button>
```

#### Danger Button
```jsx
<button className="
  inline-flex items-center gap-2 px-4 py-2
  bg-danger hover:bg-red-800
  text-white text-sm font-semibold
  rounded-md border border-transparent
  shadow-sm
  transition-colors duration-150
  focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2
  min-h-[40px]
">
  Label
</button>
```

#### Card
```jsx
<div className="
  bg-surface dark:bg-stone-900
  border border-border dark:border-stone-700
  rounded-lg shadow-card
  p-6
">
  <h3 className="text-base font-semibold text-foreground dark:text-stone-100">Title</h3>
  <p className="text-sm text-mutedFg dark:text-stone-400 mt-1">Description</p>
</div>
```

#### Stat Card (Dashboard)
```jsx
<div className="
  bg-surface dark:bg-stone-900
  border border-border dark:border-stone-700
  rounded-lg shadow-card p-5
">
  <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-semibold uppercase tracking-wider text-mutedFg dark:text-stone-400">
      Label
    </span>
    <div className="w-8 h-8 rounded-md bg-accentSubtle dark:bg-blue-900/30 flex items-center justify-center">
      <Icon size={16} strokeWidth={2} className="text-accent dark:text-blue-400" />
    </div>
  </div>
  <p className="text-2xl font-bold text-foreground dark:text-stone-100">Value</p>
  <p className="text-xs text-mutedFg dark:text-stone-400 mt-1">Context line</p>
</div>
```

#### Input Field
```jsx
<div className="flex flex-col gap-1.5">
  <label className="text-sm font-medium text-foreground dark:text-stone-200">
    Field Label
    <span className="text-danger ml-0.5">*</span>
  </label>
  <input className="
    w-full px-3 py-2
    bg-surface dark:bg-stone-800
    border border-border dark:border-stone-600
    rounded-md shadow-input
    text-sm text-foreground dark:text-stone-100
    placeholder:text-mutedFg dark:placeholder:text-stone-500
    transition-colors duration-150
    focus:outline-none focus:border-accent focus:shadow-focus
    dark:focus:border-blue-500
    disabled:bg-muted disabled:cursor-not-allowed
  " />
  <p className="text-xs text-mutedFg dark:text-stone-400">Helper text</p>
</div>
```

#### Modal
```jsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="
    bg-surface dark:bg-stone-900
    border border-border dark:border-stone-700
    rounded-lg shadow-modal
    w-full max-w-md
    animate-fade-in
  ">
    <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-stone-700">
      <h2 className="text-base font-semibold text-foreground dark:text-stone-100">Title</h2>
      <button className="text-mutedFg hover:text-foreground dark:text-stone-400 dark:hover:text-stone-100">
        <X size={18} strokeWidth={2} />
      </button>
    </div>
    <div className="px-6 py-5">
      {/* content */}
    </div>
    <div className="flex justify-end gap-3 px-6 py-4 border-t border-border dark:border-stone-700">
      {/* action buttons */}
    </div>
  </div>
</div>
```

#### Badge / Status Chip
```jsx
// Status variants — use ONLY for their semantic meaning:
// success: pass, active, confirmed
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-successBg text-success dark:bg-green-900/30 dark:text-green-400">
  <span className="w-1.5 h-1.5 rounded-full bg-success dark:bg-green-400" />
  Passed
</span>

// warning: pending, in-review
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-warningBg text-warning dark:bg-amber-900/30 dark:text-amber-400">
  Pending
</span>

// danger: fail, violation, expired
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-dangerBg text-danger dark:bg-red-900/30 dark:text-red-400">
  Failed
</span>

// neutral: informational
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-mutedFg dark:bg-stone-700 dark:text-stone-300">
  Draft
</span>
```

#### Table
```jsx
<div className="border border-border dark:border-stone-700 rounded-lg overflow-hidden shadow-card">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-muted dark:bg-stone-800 border-b border-border dark:border-stone-700">
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-mutedFg dark:text-stone-400">
          Column
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border dark:divide-stone-700">
      <tr className="bg-surface dark:bg-stone-900 hover:bg-muted dark:hover:bg-stone-800 transition-colors">
        <td className="px-4 py-3 text-foreground dark:text-stone-100">
          Cell
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Sidebar Navigation Item
```jsx
// Active
<a className="flex items-center gap-3 px-3 py-2 rounded-md bg-accentSubtle dark:bg-blue-900/30 text-accent dark:text-blue-400 text-sm font-semibold">
  <Icon size={16} strokeWidth={2} />
  Label
</a>

// Inactive
<a className="flex items-center gap-3 px-3 py-2 rounded-md text-mutedFg dark:text-stone-400 hover:bg-muted dark:hover:bg-stone-800 hover:text-foreground dark:hover:text-stone-100 text-sm font-medium transition-colors">
  <Icon size={16} strokeWidth={2} />
  Label
</a>
```

#### Alert / Banner
```jsx
// Info alert
<div className="flex gap-3 px-4 py-3 bg-infoBg dark:bg-sky-900/20 border border-info/30 dark:border-sky-700/40 rounded-md text-sm text-info dark:text-sky-400">
  <Info size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
  <p>Message text here.</p>
</div>

// Warning alert
<div className="flex gap-3 px-4 py-3 bg-warningBg dark:bg-amber-900/20 border border-warning/30 rounded-md text-sm text-warning dark:text-amber-400">
  <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
  <p>Message text here.</p>
</div>

// Danger alert
<div className="flex gap-3 px-4 py-3 bg-dangerBg dark:bg-red-900/20 border border-danger/30 rounded-md text-sm text-danger dark:text-red-400">
  <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
  <p>Message text here.</p>
</div>
```

---

### Page-Level Design Rules

**All Pages**
- Page background: `bg-background dark:bg-stone-950`
- Content container: `max-w-7xl mx-auto px-6`
- No decorative SVG shapes, dot grids, or background patterns — ever
- No hard offset shadows — use `shadow-card` or `shadow-panel` only
- Vertical rhythm: use `space-y-6` between sections, `space-y-4` within sections
- Never use pure black `#000000` — use `text-foreground` or `dark:text-stone-100`

**Layout Shell**
- Sidebar: fixed left, `w-64`, `bg-surfaceAlt dark:bg-stone-900`, `border-r border-border dark:border-stone-700`
- Main content: `ml-64 min-h-screen bg-background dark:bg-stone-950`
- Top bar (where used): `h-14 bg-surface dark:bg-stone-900 border-b border-border dark:border-stone-700 flex items-center px-6`
- No floating sidebars or overlapping panels — all structure is grid-based

**Page Header Pattern**
```jsx
<div className="mb-6">
  <h1 className="text-2xl font-bold text-foreground dark:text-stone-100">Page Title</h1>
  <p className="text-sm text-mutedFg dark:text-stone-400 mt-1">Descriptive subtitle</p>
</div>
<div className="h-px bg-border dark:bg-stone-700 mb-6" /> {/* Divider */}
```

**Auth Pages (Login / Signup)**
- Single-column centered layout — no decorative left panel
- Card: `max-w-sm w-full bg-surface dark:bg-stone-900 border border-border dark:border-stone-700 rounded-lg shadow-panel p-8`
- System logo / wordmark at top: text-based, `font-semibold text-lg text-foreground dark:text-stone-100`
- Form title: `text-xl font-bold text-foreground dark:text-stone-100`
- Submit button: full-width Primary Button
- Links (forgot password, sign up): `text-sm text-accent dark:text-blue-400 hover:underline`
- No background decoration whatsoever

**LoginPage**
- Logo area: "ASSESSMENT SYSTEM" in `text-sm font-semibold uppercase tracking-widest text-mutedFg dark:text-stone-400`
- Beneath it: system name in `text-xl font-bold`
- "Enter your credentials to continue" subtitle in mutedFg
- "New user? Register with an access code" link at bottom

**SignupPage — Two-Step Flow**
- Step 1 — Access Code Entry:
  - Heading: "Enter Access Code" `text-xl font-bold`
  - Subtext: "Access codes are issued by your system administrator." `text-sm text-mutedFg`
  - Input: large, monospace font (`font-mono text-lg tracking-widest text-center uppercase`)
  - "Verify Code" full-width Primary Button
  - On valid: green success Alert (`bg-successBg border-success/30`) with code and group name shown
  - On invalid: danger Alert + `animate-shake` on input
  - Progress indicator: "Step 1 of 2" in `text-xs text-mutedFg uppercase tracking-wider`

- Step 2 — Account Creation:
  - "Step 2 of 2" progress indicator
  - Group assignment shown as info Alert: "You will be assigned to: [Group Name]"
  - Fields: Full Name, Email Address, Phone Number (helper: "Include country code"), Password
  - Password strength: text only (no bar) — "Weak / Fair / Strong" label in appropriate status color
  - "Create Account" full-width Primary Button
  - On success: success Alert then redirect to `/login` in 3s

**Dashboards (Admin / Teacher / Student)**
- Page title + subtitle header pattern (see Page Header Pattern above)
- Stat cards in a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` using Stat Card pattern
- No greeting animations — just the page title
- Section headings within dashboard: `text-sm font-semibold uppercase tracking-wider text-mutedFg dark:text-stone-400 mb-3`
- Data tables use the Table pattern — no cards for tabular data

**Sidebar**
- Logo at top: `h-14 px-4 flex items-center border-b border-border dark:border-stone-700`
  Text: system name `text-sm font-bold uppercase tracking-wider text-foreground dark:text-stone-100`
- Nav sections separated by `text-xs font-semibold uppercase tracking-wider text-mutedFg px-3 mb-1 mt-4` labels
- Active item: `bg-accentSubtle dark:bg-blue-900/30 text-accent dark:text-blue-400`
- Bottom: user info row + logout button

**TestBuilder (Teacher)**
- Sections as bordered panels (`border border-border dark:border-stone-700 rounded-lg`) stacked with `space-y-4`
- No color rotation on section headers — all uniform `bg-muted dark:bg-stone-800`
- Section header: `px-4 py-3 flex items-center justify-between border-b border-border dark:border-stone-700`
- "Save Draft" secondary button; "Publish" Primary Button — both right-aligned

**ExamPage (Student) — Fullscreen**
- No navbar or sidebar visible
- Top bar: `bg-surface dark:bg-stone-900 border-b border-border dark:border-stone-700 h-14 flex items-center px-6 justify-between`
- Timer: `font-mono text-sm font-semibold text-foreground dark:text-stone-100`
  When < 5 min: `text-danger dark:text-red-400`
  When < 1 min: `text-danger dark:text-red-400 animate-pulse`
- Question Navigator: left panel `w-48 bg-surfaceAlt dark:bg-stone-900 border-r border-border dark:border-stone-700`
  - Unanswered: `text-mutedFg dark:text-stone-400 hover:bg-muted dark:hover:bg-stone-800`
  - Answered: `bg-successBg dark:bg-green-900/20 text-success dark:text-green-400`
  - Current: `bg-accentSubtle dark:bg-blue-900/30 text-accent dark:text-blue-400 font-semibold`
- Question content: `max-w-[760px] mx-auto bg-surface dark:bg-stone-900 border border-border dark:border-stone-700 rounded-lg shadow-card p-8`
- MCQ options: full-width bordered rows, selected = `bg-accentSubtle dark:bg-blue-900/30 border-accent dark:border-blue-500`
- Essay textarea: standard input style, `min-h-[200px]`

**GradingPage (Teacher)**
- Table-based attempt list using Table pattern
- Status badge in Status column using Badge pattern
- Essay grading card: `bg-surface dark:bg-stone-900 border border-border dark:border-stone-700 rounded-lg p-5`
  Student answer in `bg-muted dark:bg-stone-800 rounded-md p-4 text-sm font-mono`

**ResultsPage (Student)**
- Score summary at top: large stat display inside a Card
  Pass: `border-l-4 border-success` on the card
  Fail: `border-l-4 border-danger` on the card
- Pass/fail badge using Badge success/danger variants
- Per-question breakdown: table using Table pattern
  Correct row: `bg-successBg dark:bg-green-900/10`
  Wrong row: `bg-dangerBg dark:bg-red-900/10`

**MonitorPage (Teacher)**
- Table using Table pattern — no polling animation on rows
- Violations column:
  - 0: success badge ("Clean")
  - 1–2: warning badge ("[N] Violations")
  - 3+: danger badge ("[N] Violations")
- "View Logs" → opens Modal with ProctorLog table inside
- Last updated: `text-xs text-mutedFg dark:text-stone-400` top-right of table

**InviteCodesPanel (Admin)**
- Full-width Modal (max-w-4xl)
- Modal header: panel title + close button (standard Modal pattern)
- Generate section: two secondary buttons side by side ("Generate Single" + "Generate Bulk")
  Generated code shown in a `font-mono bg-muted dark:bg-stone-800 px-3 py-2 rounded-md text-sm` code block with copy button
- Codes table: Table pattern with filter tabs above (All / Available / Used) as secondary button group
  Available: neutral badge; Used: success badge; filter active state = Primary Button style

**UnauthorizedPage**
- Centered, `max-w-sm mx-auto text-center py-24`
- Icon: `ShieldX` from Lucide, size 40, `text-danger dark:text-red-400`, no wrapping circle
- Heading: "Access Denied" `text-2xl font-bold text-foreground dark:text-stone-100`
- Subtext: `text-sm text-mutedFg dark:text-stone-400`
- Role shown in neutral badge
- "Return to Dashboard" Primary Button

**NotFoundPage**
- Centered, `max-w-sm mx-auto text-center py-24`
- "404" in `text-6xl font-bold text-muted dark:text-stone-700` (subdued, not colorful)
- Heading: "Page Not Found" `text-2xl font-bold text-foreground dark:text-stone-100`
- Subtext: `text-sm text-mutedFg dark:text-stone-400`
- "Go Home" Primary Button

**Violation / Anti-Cheat Overlays**
- All overlays: `fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center`
- Card: standard Modal card, `border-l-4 border-danger` for violations
- No animations other than `animate-fade-in` on card entrance
- "I Understand" button: secondary style (not danger — must feel calm, not alarming)

---

### Iconography Rules

- Always `strokeWidth={2}` on every Lucide icon (not 2.5 — that reads as heavy)
- Icons inline with text: `size={16}`, icons as standalone actions: `size={18}`, page-level icons: `size={20}`
- Do NOT wrap icons in colored circles — place icons directly inline or in a `bg-muted dark:bg-stone-800` square `rounded-md` only when grouping is needed
- Standalone icon buttons: `text-mutedFg hover:text-foreground dark:text-stone-400 dark:hover:text-stone-100 transition-colors`
- All icon buttons must have `aria-label`

---

### Animations & Motion

- Entrance: `animate-fade-in` (200ms ease-out) — use only on modals, alerts, and page transitions
- Error shake: `animate-shake` — use only on invalid input fields
- No bounce, no pop-in, no wiggle — ever
- All transitions: `transition-colors duration-150` or `transition-all duration-150`
- Respect `prefers-reduced-motion`: wrap entrance animations:
  ```jsx
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  className={reduced ? '' : 'animate-fade-in'}
  ```

---

### Responsive Rules

- Stack all grids on mobile: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Sidebar collapses to off-canvas drawer on mobile (`w-64 fixed left-0 top-0 bottom-0 z-40 -translate-x-full sm:translate-x-0`)
- Hamburger menu button shown on mobile only (`sm:hidden`)
- Minimum button height: `min-h-[44px]` (mobile tap target)
- ExamPage navigator: horizontal scrollable strip on mobile (`flex overflow-x-auto sm:flex-col sm:overflow-auto`)
- Auth card: no card border/shadow on mobile — full-width form (`sm:rounded-lg sm:shadow-panel sm:border`)

---

### Accessibility Rules

- Text contrast: `foreground` (#1C1917) on `background` (#F5F5F4) — AAA compliant
- Dark mode: `stone-100` on `stone-950` — AAA compliant
- Never use color as the only indicator — always pair status color with a label
- Focus states: `focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2` on all interactive elements
- Dark focus offset: `dark:focus:ring-offset-stone-900`
- Icon-only buttons: must have `aria-label`
- Form inputs: always associated with a `<label>` via `htmlFor` / `id`
- Tables: `<thead>` with `scope="col"` on every `<th>`

---

### Theme Switcher

Add a theme toggle button to the sidebar footer and the top bar on auth pages.

```jsx
// src/hooks/useTheme.js
// Reads from localStorage 'theme' key: 'light' | 'dark' | 'system'
// 'system' follows window.matchMedia('(prefers-color-scheme: dark)')
// Writes 'dark' or '' class to document.documentElement
```

Toggle button renders:
- Sun icon when dark mode active (click → light)
- Moon icon when light mode active (click → dark)
- Icon size 16, strokeWidth 2, `text-mutedFg hover:text-foreground`


---

## Frontend Routing (App.jsx)

```
/login                    → LoginPage              (public)
/signup                   → SignupPage             (public, students only — two-step invite flow)
/forgot-password          → ForgotPasswordPage     (public)
/reset-password           → ResetPasswordPage      (public, reads ?token= from query param)
/unauthorized             → UnauthorizedPage       (public)
/admin/*                  → RoleRoute admin
  /admin/dashboard        → AdminDashboard
  /admin/users            → UserManagement
  /admin/groups           → GroupManagement        (includes InviteCodesPanel per group)
/teacher/*                → RoleRoute teacher
  /teacher/dashboard      → TeacherDashboard
  /teacher/tests/new      → TestBuilder
  /teacher/tests/:id      → TestBuilder (edit)
  /teacher/schedule       → ExamScheduler
  /teacher/grade          → GradingPage
  /teacher/monitor/:id    → MonitorPage
/student/*                → RoleRoute student
  /student/dashboard      → StudentDashboard
  /student/exam/:id       → ExamPage
  /student/results/:id    → ResultsPage
*                         → NotFoundPage           (catch-all — must be last)
```

---

## State Management

- `AuthContext` holds `user`, `token`, `login()`, `logout()`
- `useAuth()` hook exposes context values
- Exam state lives locally in `ExamPage` + `useAutosave` + `useExamTimer`
- No global state library needed (React Context is sufficient)

---

## ExamPage Layout

```
┌──────────────────────────────────────────────────┐
│  Section Title                    ⏱ 00:42:17     │  ← bg-card border-b-2
├──────────────┬───────────────────────────────────┤
│              │                                   │
│  Question    │   Question Content (max 800px)    │
│  Navigator   │                                   │
│  (colored    │   [ MCQ options / Essay area ]    │
│   numbered   │                                   │
│   buttons)   │   [ ← Prev ]          [ Next → ] │
│              │                                   │
└──────────────┴───────────────────────────────────┘
```

---

## Environment Variables

### Backend (`server/.env`)
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/exam_system
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
VIOLATION_THRESHOLD=3
```

### Frontend (`client/.env`)
```
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Coding Conventions

- Use `ES Modules` (`import/export`) throughout
- Async/await everywhere; no raw `.then()` chains
- Mongoose models use timestamps: `{ timestamps: true }`
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Server Error
- Passwords hashed with `bcryptjs` (salt rounds: 12)
- JWT signed with `HS256`; payload: `{ id, role }`
- All IDs are MongoDB ObjectIds; use `.populate()` sparingly, only where needed for a response

---

## Agent Responsibilities

Each Codex agent prompt maps to one build step. Agents must:

1. Read this file before writing any code
2. Follow folder structure exactly as defined above
3. Never put business logic in controllers
4. Never call the DB directly from a controller
5. Always use `asyncHandler` wrapper for express route handlers
6. Write complete, runnable files — no `// TODO` stubs unless explicitly noted
7. Apply the Official Standard Design System to every frontend file
8. Configure `tailwind.config.js` tokens before building any UI component

---

*Last updated: Official Standard Design System — Government/Military, system-aware dark/light mode*
