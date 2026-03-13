# Codex Prompt — Exam Engine

You are a senior backend engineer.

Implement the exam engine for a MERN Online Testing System.

Stack

Node.js  
Express  
MongoDB  
Mongoose

Follow the repository rules defined in AGENTS.md.

Do not modify other modules.

Generate only the exam engine module.

Responsibilities

- start exams
- randomize questions
- autosave answers
- submit exams
- enforce timer
- record violations
- run MCQ grading

Database Models Used

Test  
Section  
Question  
MCQOption  
TestSchedule  
TestAttempt  
Answer  
ProctorLog

API Endpoints

Start Exam

POST /exam/start

Steps

1. validate schedule window
2. verify student group membership
3. verify attempt limits
4. create TestAttempt
5. randomize question order
6. randomize MCQ option order
7. return exam payload

Save Answer

POST /exam/save-answer

Payload

attemptId  
questionId  
selectedOptionId OR essayText

Behavior

- create or update answer
- return success

Submit Exam

POST /exam/submit

Steps

1. validate attempt
2. finalize answers
3. run MCQ auto grading
4. update attempt score
5. mark attempt submitted

Log Violation

POST /exam/violation

Payload

attemptId  
eventType

Behavior

- insert ProctorLog
- increment violationsCount

If violationsCount exceeds threshold

auto submit exam.

Randomization

Randomization occurs once when exam starts.

Shuffle

- sections
- questions
- options

Store order in TestAttempt

questionOrder  
optionOrder

Timer Enforcement

Every exam API must verify:

currentTime < expiresAt

expiresAt = startedAt + timeLimitMinutes

If expired

auto submit attempt.

Auto Grading

MCQ grading process

1. fetch answers
2. fetch correct options
3. compare selections
4. calculate score

Essay answers remain

gradingStatus = pending

Required Output

Generate module

server/modules/examEngine

Structure

examEngine
controller.js
service.js
routes.js
randomization.js
grading.js

Controllers must remain thin.

Business logic must be inside services.