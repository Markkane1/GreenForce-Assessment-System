```markdown
# AGENTS.md
AI Agent Development Guide — Online Testing System (MERN)

This file defines the architecture, constraints, and development workflow for AI agents working on this repository.

Agents MUST follow this document when generating or modifying code.

The goal is to ensure the system remains consistent, maintainable, and aligned with the exam platform design.

---

# 1. System Overview

This project is a **MERN-based Online Testing System**.

Stack:

Frontend
- React (Vite)
- React Router
- Axios
- TailwindCSS

Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

Authentication
- JWT

The system supports:

- Admin
- Teacher
- Student

Core features include:

- Test creation
- Exam scheduling
- Student group targeting
- MCQ and Essay questions
- Randomized question delivery
- Auto grading
- Manual essay grading
- Autosave answers
- Anti-cheat detection
- Exam monitoring

---

# 2. Core Design Principles

Agents must follow these rules.

### Separation of Concerns

Controllers:
- Handle request/response
- Validate input
- Call services

Services:
- Contain business logic

Models:
- Define database schema

Routes:
- Define endpoints

---

### Thin Controllers

Controllers should only:

- validate request
- call service
- return response

No business logic inside controllers.

---

### Stateless APIs

All APIs must be stateless.

Session state should be stored in the database.

---

### Deterministic Exam Sessions

Once an exam attempt is created:

- question order MUST remain fixed
- option order MUST remain fixed

Randomization must occur only once during session creation.

---

# 3. Project Structure

Repository layout:

```

root
│
├ client
│ ├ pages
│ ├ components
│ ├ hooks
│ ├ services
│ └ utils
│
├ server
│ ├ controllers
│ ├ services
│ ├ routes
│ ├ models
│ ├ middleware
│ ├ modules
│ └ utils
│
└ docs

```

---

# 4. Backend Modules

Each module must contain:

```

moduleName
├ controller.js
├ service.js
├ routes.js
└ model.js

```

Modules:

auth  
users  
groups  
tests  
sections  
questions  
schedules  
examEngine  
grading  
antiCheat  

---

# 5. Database Models

MongoDB models include:

User

- name
- email
- password
- role

StudentGroup

- name
- description
- createdBy

GroupMember

- groupId
- studentId

Test

- title
- description
- timeLimitMinutes
- passingScore
- maxAttempts
- allowResume
- randomizeQuestions
- randomizeOptions
- createdBy
- isPublished

TestSchedule

- testId
- startTime
- endTime
- assignedGroups

Section

- testId
- title
- order
- questionPoolSize
- questionsToServe

Question

- sectionId
- type (mcq, essay)
- content
- points
- maxWordCount

MCQOption

- questionId
- text
- isCorrect

TestAttempt

- testId
- scheduleId
- studentId
- startedAt
- submittedAt
- status
- violationsCount
- questionOrder
- optionOrder
- score

Answer

- attemptId
- questionId
- selectedOptionId
- essayText
- score
- feedback
- gradingStatus

ProctorLog

- attemptId
- eventType
- timestamp
- metadata

---

# 6. Exam Engine Rules

The exam engine is the most critical part of the system.

Agents MUST follow these rules.

### Session Creation

When a student starts an exam:

1. verify schedule window
2. verify student group membership
3. verify attempt limit
4. generate randomized question order
5. generate randomized option order
6. store them in TestAttempt

---

### Randomization

Randomization must:

- happen once
- be stored in database
- never change afterward

Example:

```

questionOrder = [q9, q2, q7, q5]
optionOrder = {
q9: [C, A, B, D]
}

```

---

### Timer Logic

Timer is based on:

```

expiresAt = startedAt + timeLimit

```

Server must verify timer on every request.

---

### Autosave

Answers should autosave:

- every 20 seconds
- on question navigation

Endpoint:

```

POST /exam/save-answer

```

---

### Auto Submit

Exam must auto-submit when:

- timer expires
- violation threshold reached

---

# 7. Anti-Cheat System

Client side detection:

- fullscreen exit
- tab switching
- copy attempts

Server logs violations.

Violations stored in:

```

ProctorLog

```

If violations exceed threshold:

```

auto submit exam

```

---

# 8. Exam Scheduling Rules

Tests cannot be taken without a schedule.

Schedule defines:

- startTime
- endTime
- allowed student groups

Students must satisfy:

```

currentTime >= startTime
currentTime <= endTime
student ∈ assignedGroup

```

---

# 9. Grading Rules

MCQ grading:

- automatic

Essay grading:

- manual by teacher

Essay answers must have status:

```

pending
graded

```

---

# 10. Frontend Plan

The frontend architecture is defined in a separate document.

Agents must load and follow:

```

docs/frontend-plan.md

```

This document defines:

- UI structure
- page layouts
- components
- design system

Agents must NOT deviate from that plan.

---

# 11. Coding Standards

Use:

- async/await
- centralized error handling
- validation middleware

Avoid:

- deeply nested logic
- duplicated code

---

# 12. Security Requirements

All protected APIs require JWT authentication.

Role-based middleware must protect routes.

Roles:

- admin
- teacher
- student

---

# 13. Development Workflow

Agents must generate code in this order:

1. database models
2. backend APIs
3. exam engine
4. grading system
5. anti-cheat logging
6. frontend pages
7. exam UI

Agents must NOT generate the entire system in one step.

---

# 14. Testing Requirements

Agents should create tests for:

- exam session creation
- question randomization
- grading logic
- scheduling validation

Use:

Jest (backend)

---

# 15. Important Constraints

Agents must ensure:

- exams are deterministic
- question order does not change
- option order does not change
- attempt limits are enforced
- schedule windows are enforced

Breaking these rules will cause exam inconsistencies.

---

# 16. Future Extensions (Optional)

Possible future additions:

- webcam proctoring
- plagiarism detection
- adaptive testing
- AI essay grading

These are NOT required for the initial version.

---

END OF AGENTS GUIDE
```