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
| Styling      | TailwindCSS + Playful Geometric Design System           |
| Fonts        | Outfit (headings), Plus Jakarta Sans (body) — Google Fonts |
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
- **All frontend styling must follow the Playful Geometric Design System** defined below — no generic Tailwind defaults.

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
│   │   └── ProctorLog.js
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
    │   │   └── gradingService.js
    │   ├── hooks/
    │   │   ├── useAuth.js
    │   │   ├── useExamTimer.js
    │   │   ├── useAutosave.js
    │   │   ├── useFullscreen.js
    │   │   └── useAntiCheat.js
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── components/
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
    │       │   └── SignupPage.jsx
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

| Model        | Key Fields                                                                              |
|--------------|-----------------------------------------------------------------------------------------|
| User         | name, email, password (hashed), role, resetPasswordToken, resetPasswordExpires |
| StudentGroup | name, description, createdBy (ref: User)                                                |
| GroupMember  | groupId, studentId                                                                      |
| Test         | title, timeLimitMinutes, passingScore, maxAttempts, allowResume, randomize*, createdBy  |
| TestSchedule | testId, startTime, endTime, assignedGroups[]                                            |
| Section      | testId, title, order, questionPoolSize, questionsToServe                                |
| Question     | sectionId, type (mcq/essay), content, points, maxWordCount                              |
| MCQOption    | questionId, text, isCorrect                                                             |
| TestAttempt  | testId, scheduleId, studentId, startedAt, submittedAt, status, violationsCount, score   |
| Answer       | attemptId, questionId, selectedOptionId, essayText, score, feedback, gradingStatus      |
| ProctorLog   | attemptId, eventType, timestamp, metadata                                               |

---

## API Modules & Endpoints

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password        { email } — generates reset token, logs it in dev
POST   /api/auth/reset-password         { token, newPassword }
PUT    /api/auth/change-password        { currentPassword, newPassword } — requires protect
```

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

## Design System — Playful Geometric

**Every frontend agent must read and apply this section.**
Configure `tailwind.config.js` tokens before writing any component or page.

### Philosophy

**"Stable Grid, Wild Decoration."**
Content (text, forms, data) lives in clean, readable areas. The space around it is alive
with shapes, color, and movement. Inspired by the Memphis Group (80s) — energetic but not chaotic.

**The Vibe: Friendly. Tactile. Pop. Energetic.**
It feels like a well-organized sticker book. Elements invite clicking. The UI smiles at you.

### Visual Signatures (apply throughout all pages)
- **Hard Shadows** — `box-shadow: 4px 4px 0px 0px #1E293B`: no blur, solid offset. Sticker/cut-out feel.
- **Primitive Shapes** — Circles, pills, triangles used as background decoration or icon containers. Never floating alone.
- **Chunky Borders** — `border-2` (2px) everywhere by default.
- **Varied Radii** — Mix `rounded-full` (pills) with `rounded-xl` (cards). Never uniform throughout a page.
- **Pattern Fills** — Polka dot or grid SVG backgrounds behind hero/dashboard sections.

---

### tailwind.config.js — Full Token Configuration

```js
// tailwind.config.js
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background:  '#FFFDF5',  // Warm cream — default page bg
        foreground:  '#1E293B',  // Slate 800 — primary text (AAA contrast)
        muted:       '#F1F5F9',  // Slate 100 — subtle backgrounds
        mutedFg:     '#64748B',  // Slate 500 — secondary/helper text
        accent:      '#8B5CF6',  // Vivid Violet — primary CTAs, brand color
        accentFg:    '#FFFFFF',  // White — text on accent backgrounds
        secondary:   '#F472B6',  // Hot Pink — decorative, featured cards
        tertiary:    '#FBBF24',  // Amber/Yellow — optimism, badges
        quaternary:  '#34D399',  // Emerald/Mint — success, freshness
        card:        '#FFFFFF',  // White card backgrounds
        border:      '#E2E8F0',  // Slate 200 — default borders
        ring:        '#8B5CF6',  // Violet — focus rings
      },
      fontFamily: {
        heading: ['"Outfit"', ...defaultTheme.fontFamily.sans],
        body:    ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        sm:   '8px',
        md:   '16px',
        lg:   '24px',
        full: '9999px',
      },
      boxShadow: {
        'pop':        '4px 4px 0px 0px #1E293B',
        'pop-hover':  '6px 6px 0px 0px #1E293B',
        'pop-press':  '2px 2px 0px 0px #1E293B',
        'pop-pink':   '6px 6px 0px 0px #F472B6',
        'pop-soft':   '6px 6px 0px 0px #E2E8F0',
      },
      transitionTimingFunction: {
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%':       { transform: 'rotate(3deg)' },
          '75%':       { transform: 'rotate(-3deg)' },
        },
        'pop-in': {
          '0%':   { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        wiggle:   'wiggle 0.4s ease-in-out',
        'pop-in': 'pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
```

---

### Google Fonts — Add to `index.html` `<head>`

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500&display=swap" rel="stylesheet">
```

### index.css — Base Styles

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-background text-foreground font-body;
  }
  h1, h2, h3, h4 {
    @apply font-heading;
  }
}
```

---

### Component Patterns

#### Primary Button — "The Candy Button"
```jsx
<button className="
  inline-flex items-center gap-2 px-6 py-3
  bg-accent text-accentFg font-heading font-bold
  rounded-full border-2 border-foreground shadow-pop
  transition-all duration-300 ease-bounce
  hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-pop-hover
  active:translate-x-0.5 active:translate-y-0.5 active:shadow-pop-press
  min-h-[48px]
">
  Label
  <span className="bg-white rounded-full p-0.5">
    <ArrowRight size={16} strokeWidth={2.5} className="text-accent" />
  </span>
</button>
```

#### Secondary Button
```jsx
<button className="
  px-6 py-3 bg-transparent text-foreground
  font-heading font-bold rounded-full
  border-2 border-foreground
  transition-all duration-300 ease-bounce
  hover:bg-tertiary
  min-h-[48px]
">
  Label
</button>
```

#### "Sticker" Card
```jsx
<div className="
  relative bg-card rounded-xl border-2 border-foreground
  shadow-pop-soft p-6 pt-10
  transition-all duration-300 ease-bounce
  hover:-rotate-1 hover:scale-[1.02] hover:shadow-pop
">
  {/* Floating icon circle — half above top border */}
  <div className="
    absolute -top-5 left-6
    w-10 h-10 rounded-full bg-accent
    flex items-center justify-center
    border-2 border-foreground shadow-pop-press
  ">
    <Icon size={18} strokeWidth={2.5} className="text-white" />
  </div>
  <h3 className="font-heading font-bold text-lg text-foreground">Title</h3>
  <p className="font-body text-mutedFg mt-1 text-sm">Description</p>
</div>
```

#### Input Field
```jsx
<div className="flex flex-col gap-1">
  <label className="font-body font-medium text-xs uppercase tracking-wide text-foreground">
    Field Label
  </label>
  <input className="
    bg-card border-2 border-[#CBD5E1] rounded-md px-4 py-3
    font-body text-foreground placeholder:text-mutedFg
    shadow-[4px_4px_0px_transparent]
    transition-all duration-200
    focus:outline-none focus:border-accent focus:shadow-[4px_4px_0px_#8B5CF6]
  " />
</div>
```

#### Modal Panel
```jsx
// Overlay
<div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center">
  // Panel
  <div className="bg-card rounded-xl border-2 border-foreground shadow-pop p-8 w-full max-w-md">
    <h2 className="font-heading font-bold text-2xl text-foreground mb-4">Title</h2>
    {/* content */}
  </div>
</div>
```

#### Badge / Tag
```jsx
<span className="
  inline-block px-3 py-1 rounded-full
  bg-tertiary text-foreground
  font-heading font-bold text-xs uppercase tracking-wide
  border-2 border-foreground shadow-pop-press
">
  Label
</span>
```

---

### Page-Level Design Rules

**All Pages**
- Page background: `bg-background`
- Container: `max-w-6xl mx-auto px-6`
- Section vertical padding: `py-16` minimum
- Never use `#000000` — always use `text-foreground` (`#1E293B`)

**Confetti Color Rule**
Use `accent` → `secondary` → `tertiary` → `quaternary` rotationally for decorative
elements on the same page (icon circles, card accent borders, section dividers).
Never all the same color on one page.

**Auth Pages (Login / Signup)**
- Two-column layout: left panel (decorative) + right panel (form)
- Left panel: `bg-accent` with floating SVG circles and triangles in `secondary`, `tertiary`, `quaternary`
  plus a dot-grid SVG pattern in the background
- Right panel: white, centered form card with `shadow-pop`
- Submit button: primary Candy Button
- On mobile: hide left panel, full-width form

**Dashboards (Admin / Teacher / Student)**
- Bold Outfit heading greeting with user name at top
- Stat cards in a responsive grid using the Sticker Card pattern
- Each card's floating icon circle uses a different confetti color
- Sidebar: `bg-card border-r-2 border-border`
  - Active nav item: `bg-accent text-accentFg rounded-lg`
  - Inactive: `text-mutedFg hover:bg-muted rounded-lg`

**TestBuilder (Teacher)**
- Sections stacked vertically; each `SectionCard` uses `shadow-pop-soft`
- Section header color rotates: `accent` → `secondary` → `tertiary` → `quaternary`
- "Add Question" → secondary button style
- "Save Draft" → secondary button; "Publish" → Candy Button with `bg-quaternary` override
- Drag handle icon for section reordering

**ExamPage (Student) — Fullscreen**
- No navbar or sidebar visible in fullscreen mode
- Top bar: `bg-card border-b-2 border-border` — section title left, timer right
- `CountdownTimer`: `bg-accent text-accentFg` pill shape; switches to `bg-red-500` when < 5 min
- Question Navigator buttons (left panel):
  - Unanswered: `bg-muted border-2 border-border text-mutedFg`
  - Answered: `bg-quaternary border-2 border-foreground shadow-pop-press text-foreground`
  - Current: `bg-accent border-2 border-foreground shadow-pop-press text-accentFg`
- Question content: `max-w-[800px] mx-auto bg-card rounded-xl border-2 border-border shadow-pop-soft p-8`
- MCQ options: full-width pill buttons; selected = `bg-accent/10 border-2 border-accent`
- Essay textarea: input field style with word count badge (`bg-muted rounded-full px-2 py-0.5 text-xs`)

**GradingPage (Teacher)**
- Attempt list: table rows with a left color bar (`border-l-4`):
  - Pending essays: `border-tertiary`
  - Fully graded: `border-quaternary`
- Essay grading card: student answer in `bg-muted rounded-md p-4 font-body`
  with score input + feedback textarea below using input field styles

**ResultsPage (Student)**
- Score displayed in a large Sticker Card with `shadow-pop-pink` if passed, `shadow-pop-soft` if failed
- Pass/fail badge using Badge component (green `quaternary` for pass, pink `secondary` for fail)
- Per-question breakdown: MCQ correct answers highlighted in `bg-quaternary/20`, wrong in `bg-secondary/20`

**MonitorPage (Teacher)**
- Live table: student name, questions answered / total, violation count badge, elapsed time pill
- Violation count badge: `bg-quaternary` for 0, `bg-tertiary` for 1–2, `bg-secondary` for 3+
- Auto-refreshes every 15 seconds (polling); show last-updated timestamp
- "View Proctor Logs" link per row opens a slide-over panel with ProctorLog entries

**UnauthorizedPage**
- Centered layout, large lock icon in a `bg-secondary` circle with `shadow-pop`
- Heading: "Access Denied" in `font-heading font-extrabold`
- Subtext: explains user does not have permission for this page
- Button: "Go to Dashboard" — Candy Button — redirects to `/{role}/dashboard`

**NotFoundPage**
- Centered layout, large "404" in `font-heading font-extrabold text-8xl text-accent`
- Decorative floating shapes (circles, triangles) in confetti colors behind the number
- Subtext: "This page doesn't exist"
- Button: "Go Home" — Candy Button — redirects to `/login` or dashboard if authenticated

---

### Iconography Rules

- Always `strokeWidth={2.5}` on every Lucide icon
- Never place icons floating alone — always wrap in a shape:
  - Circle: `<div className="w-10 h-10 rounded-full bg-accent border-2 border-foreground flex items-center justify-center">`
  - Rounded square: same but `rounded-md`
- Icon color inside circles: `text-accentFg` (white)
- Standalone icons (e.g. inside input fields): `text-mutedFg`
- Interactive icon buttons: add `hover:animate-wiggle` (respecting reduced motion)

---

### Animations & Motion

```jsx
// Detect reduced motion preference at top of component
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Apply conditionally
className={prefersReducedMotion ? 'opacity-100' : 'animate-pop-in'}
```

- Cards and buttons: `transition-all duration-300 ease-bounce`
- Entrance animations: `animate-pop-in` (scale 0→1 with bounce)
- Icon hover: `hover:animate-wiggle`
- Never autoplay wiggle/pop-in for users with reduced motion preference

---

### Responsive Rules

- Stack all grids on mobile: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Hard shadows on mobile: reduce to 2px — use `shadow-pop-press` on mobile, `sm:shadow-pop` on larger
- Decorative floating shapes: `hidden sm:block`
- Minimum button height: `min-h-[48px]` for tap targets
- ExamPage navigator: collapses to horizontal scrollable strip on mobile (`flex overflow-x-auto sm:flex-col`)
- Auth page left panel: `hidden md:flex`

---

### Accessibility Rules

- Text contrast: `foreground` (#1E293B) on `background` (#FFFDF5) — AAA compliant. Never change this.
- Never use color as the only indicator — always pair with a label or icon
- Focus states: `focus:ring-2 focus:ring-ring focus:ring-offset-2` on all interactive elements
- Icon-only buttons must have `aria-label`
- Icons decorative to their parent button: `aria-hidden="true"`
- Motion: guard with `prefers-reduced-motion` check before applying bounce/wiggle

---

## Frontend Routing (App.jsx)

```
/login                    → LoginPage         (public)
/signup                   → SignupPage        (public)
/unauthorized             → UnauthorizedPage  (public)
/admin/*                  → RoleRoute admin
  /admin/dashboard        → AdminDashboard
  /admin/users            → UserManagement
  /admin/groups           → GroupManagement
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
*                         → NotFoundPage      (catch-all)
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
7. Apply the Playful Geometric design system to every frontend file
8. Configure `tailwind.config.js` tokens before building any UI component

---

*Last updated: Playful Geometric Design System integrated*
