import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import jwt from '../server/node_modules/jsonwebtoken/index.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';
const ROOT_DIR = path.resolve(process.cwd());
const OUTPUT_DIR = path.join(ROOT_DIR, '.qa-screens', 'security-sweep');

const credentials = {
  admin: { email: 'admin@exam-pop.local', password: 'Admin123!' },
  teacher: { email: 'teacher@exam-pop.local', password: 'Teacher123!' },
  student: { email: 'student@exam-pop.local', password: 'Student123!' },
};

const ids = {
  sampleGroupId: '69b44078b5f9d620416a7862',
  otherGroupScheduleId: '69b4fe19571bdb6a5d6bca7f',
  pastScheduleId: '69b445c79a7ec5127af89d49',
  otherStudentAttemptId: '69b445c79a7ec5127af89d62',
  otherTeacherEssayAnswerId: '69b445c79a7ec5127af89d69',
  studentUserId: '69b44078d5d720d588f4e278',
};

const results = [];

const ensureOutputDir = async () => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
};

const record = (name, pass, details = {}) => {
  results.push({ name, pass, ...details });
};

const request = async (pathname, options = {}) => {
  const url = `${API_BASE}${pathname}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    redirect: 'manual',
  });

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
};

const login = async (role) => {
  const response = await request('/auth/login', {
    method: 'POST',
    body: credentials[role],
  });

  if (response.status !== 200 || !response.data?.token) {
    throw new Error(`Login failed for ${role}: ${response.status} ${JSON.stringify(response.data)}`);
  }

  const cookies = response.headers.get('set-cookie') || '';
  return {
    token: response.data.token,
    user: response.data.user,
    cookies,
  };
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});

const createExpiredToken = (templateToken, jwtSecret) => {
  const payload = jwt.decode(templateToken);
  return jwt.sign(
    { id: payload.id, role: payload.role },
    jwtSecret,
    { expiresIn: -60 },
  );
};

const createActiveSchedule = async (teacherToken) => {
  const start = new Date(Date.now() - 60 * 1000);
  const end = new Date(Date.now() + 55 * 60 * 1000);
  const response = await request('/schedules', {
    method: 'POST',
    headers: authHeaders(teacherToken),
    body: {
      testId: '69b44574e42daf3b6cc47285',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      assignedGroups: [ids.sampleGroupId],
    },
  });

  if (response.status === 400 && /already overlaps/i.test(response.data?.message || '')) {
    const existingSchedules = await request('/schedules', {
      headers: authHeaders(teacherToken),
    });
    const activeSchedule = (existingSchedules.data?.schedules || existingSchedules.data || []).find((schedule) => {
      const assignedGroups = schedule.assignedGroups || [];
      const hasSampleGroup = assignedGroups.some((group) => (group._id || group).toString() === ids.sampleGroupId);
      const startsAt = new Date(schedule.startTime).getTime();
      const endsAt = new Date(schedule.endTime).getTime();
      return hasSampleGroup && startsAt <= Date.now() && endsAt >= Date.now();
    });

    if (activeSchedule?._id) {
      return activeSchedule._id;
    }
  }

  if (response.status !== 201) {
    throw new Error(`Failed to create active schedule: ${response.status} ${JSON.stringify(response.data)}`);
  }

  return response.data.schedule?._id || response.data._id;
};

const startExam = async (studentToken, scheduleId) =>
  request('/exam/start', {
    method: 'POST',
    headers: authHeaders(studentToken),
    body: { scheduleId },
  });

const createIsolatedExamFixture = async (teacherToken, label = 'security') => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const testResponse = await request('/tests', {
    method: 'POST',
    headers: authHeaders(teacherToken),
    body: {
      title: `QA ${label} ${suffix}`,
      description: 'Temporary security sweep fixture',
      timeLimitMinutes: 15,
      passingScore: 1,
      maxAttempts: 25,
      allowResume: false,
      randomizeQuestions: false,
      randomizeOptions: false,
    },
  });

  if (testResponse.status !== 201 || !testResponse.data?.test?._id) {
    throw new Error(`Failed to create isolated test fixture: ${testResponse.status} ${JSON.stringify(testResponse.data)}`);
  }

  const testId = testResponse.data.test._id;

  const mcqSectionResponse = await request(`/tests/${testId}/sections`, {
    method: 'POST',
    headers: authHeaders(teacherToken),
    body: {
      title: 'MCQ Section',
      order: 1,
      questionPoolSize: 1,
      questionsToServe: 1,
    },
  });

  const mcqSectionId = mcqSectionResponse.data?.section?._id;
  if (mcqSectionResponse.status !== 201 || !mcqSectionId) {
    throw new Error(`Failed to create MCQ section: ${mcqSectionResponse.status} ${JSON.stringify(mcqSectionResponse.data)}`);
  }

  const syncMcqSectionResponse = await request(`/sections/${mcqSectionId}`, {
    method: 'PUT',
    headers: authHeaders(teacherToken),
    body: {
      title: 'MCQ Section',
      order: 1,
      questionPoolSize: 1,
      questionsToServe: 1,
    },
  });

  if (syncMcqSectionResponse.status !== 200) {
    throw new Error(`Failed to sync MCQ section: ${syncMcqSectionResponse.status} ${JSON.stringify(syncMcqSectionResponse.data)}`);
  }

  const essaySectionResponse = await request(`/tests/${testId}/sections`, {
    method: 'POST',
    headers: authHeaders(teacherToken),
    body: {
      title: 'Essay Section',
      order: 2,
      questionPoolSize: 1,
      questionsToServe: 1,
    },
  });

  const essaySectionId = essaySectionResponse.data?.section?._id;
  if (essaySectionResponse.status !== 201 || !essaySectionId) {
    throw new Error(`Failed to create essay section: ${essaySectionResponse.status} ${JSON.stringify(essaySectionResponse.data)}`);
  }

  const essayQuestionResponse = await request(`/sections/${essaySectionId}/questions`, {
    method: 'POST',
    headers: authHeaders(teacherToken),
    body: {
      type: 'essay',
      content: 'Explain how the security fixture works.',
      points: 2,
      maxWordCount: 200,
    },
  });

  if (essayQuestionResponse.status !== 201) {
    throw new Error(`Failed to create essay question: ${essayQuestionResponse.status} ${JSON.stringify(essayQuestionResponse.data)}`);
  }

  const publishResponse = await request(`/tests/${testId}/publish`, {
    method: 'POST',
    headers: authHeaders(teacherToken),
  });

  if (publishResponse.status !== 200) {
    throw new Error(`Failed to publish fixture test: ${publishResponse.status} ${JSON.stringify(publishResponse.data)}`);
  }

  const start = new Date(Date.now() - 60 * 1000);
  const end = new Date(Date.now() + 30 * 60 * 1000);
  const scheduleResponse = await request('/schedules', {
    method: 'POST',
    headers: authHeaders(teacherToken),
    body: {
      testId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      assignedGroups: [ids.sampleGroupId],
    },
  });

  if (scheduleResponse.status !== 201 || !scheduleResponse.data?.schedule?._id) {
    throw new Error(`Failed to create fixture schedule: ${scheduleResponse.status} ${JSON.stringify(scheduleResponse.data)}`);
  }

  return {
    testId,
    scheduleId: scheduleResponse.data.schedule._id,
  };
};

const createFreshAttempt = async (teacherToken, studentToken, label) => {
  const fixture = await createIsolatedExamFixture(teacherToken, label);
  const startResponse = await startExam(studentToken, fixture.scheduleId);

  if ((startResponse.status !== 200 && startResponse.status !== 201) || !startResponse.data?.attempt?._id) {
    throw new Error(`Failed to start fixture attempt: ${startResponse.status} ${JSON.stringify(startResponse.data)}`);
  }

  return {
    ...fixture,
    attemptId: startResponse.data.attempt._id,
    questions: startResponse.data.questions || [],
    startResponse,
  };
};

const saveAnswer = async (studentToken, attemptId, questionId, answer) =>
  request('/exam/save-answer', {
    method: 'POST',
    headers: authHeaders(studentToken),
    body: {
      attemptId,
      questionId,
      answer,
    },
  });

const submitExam = async (studentToken, attemptId) =>
  request(`/exam/${attemptId}/submit`, {
    method: 'POST',
    headers: authHeaders(studentToken),
  });

const createSecuritySummary = async () => {
  const failed = results.filter((entry) => !entry.pass);
  const summary = {
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  );

  return summary;
};

const waitForServer = async (baseUrl, timeoutMs = 15000) => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
        },
      });

      if (response.ok || response.status === 204) {
        return;
      }
    } catch {
      // keep polling
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
};

const runProductionErrorCheck = async () => {
  const productionBase = 'http://localhost:5001/api';
  const child = spawn(
    'node',
    ['server/server.js'],
    {
      cwd: path.join(ROOT_DIR, 'server'),
      env: {
        ...process.env,
        PORT: '5001',
        NODE_ENV: 'production',
        CLIENT_URL: 'http://localhost:5173',
        JWT_SECRET: 'local-security-sweep-production-secret-1234567890',
      },
      windowsHide: true,
      stdio: 'ignore',
    },
  );

  try {
    await waitForServer(productionBase);
    const loginResponse = await fetch(`${productionBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials.admin),
    });
    const loginData = await loginResponse.json();
    const response = await fetch(`${productionBase}/tests/notanobjectid`, {
      headers: authHeaders(loginData.token),
    });
    const data = await response.json();

    return {
      status: response.status,
      data,
      pass: response.status === 400 && !Object.hasOwn(data, 'stack'),
    };
  } finally {
    child.kill();
  }
};

const main = async () => {
  await ensureOutputDir();

  const admin = await login('admin');
  const teacher = await login('teacher');
  const student = await login('student');

  const jwtSecret = process.env.JWT_SECRET || 'replace_with_a_long_random_secret';
  const expiredToken = createExpiredToken(student.token, jwtSecret);

  {
    const response = await request('/tests');
    record('1 unauthenticated protected route', response.status === 401, { status: response.status, data: response.data });
  }

  {
    const response = await request('/tests', {
      headers: authHeaders('invalidtoken123'),
    });
    record('2 invalid token', response.status === 401, { status: response.status, data: response.data });
  }

  {
    const response = await request('/tests', {
      headers: authHeaders(expiredToken),
    });
    record('3 expired token', response.status === 401, { status: response.status, data: response.data });
  }

  {
    const response = await request('/users', {
      headers: authHeaders(student.token),
    });
    record('5 student accessing admin route', response.status === 403, { status: response.status, data: response.data });
  }

  {
    const response = await request('/tests', {
      method: 'POST',
      headers: authHeaders(student.token),
      body: {
        title: 'Should Fail',
        timeLimitMinutes: 30,
        passingScore: 1,
        maxAttempts: 1,
      },
    });
    record('6 student accessing teacher route', response.status === 403, { status: response.status, data: response.data });
  }

  {
    const response = await request(`/users/${ids.studentUserId}`, {
      method: 'DELETE',
      headers: authHeaders(teacher.token),
    });
    record('7 teacher accessing admin delete', response.status === 403, { status: response.status, data: response.data });
  }

  {
    const response = await request(`/exam/${ids.otherStudentAttemptId}/questions`, {
      headers: authHeaders(student.token),
    });
    record('8 student accessing other attempt questions', response.status === 403, { status: response.status, data: response.data });
  }

  {
    const response = await saveAnswer(student.token, ids.otherStudentAttemptId, '69b44f32cc8c6533baa0415f', {
      selectedOptionId: '69b44f0bcc8c6533baa0412e',
    });
    record('9 student submitting to other attempt', response.status === 403, { status: response.status, data: response.data });
  }

  {
    const response = await request('/grading/essay', {
      method: 'POST',
      headers: authHeaders(teacher.token),
      body: {
        answerId: ids.otherTeacherEssayAnswerId,
        score: 5,
        feedback: 'Unauthorized grade',
      },
    });
    record('10 teacher grading other teacher essay', response.status === 403, { status: response.status, data: response.data });
  }

  {
    const response = await request(`/exam/${ids.otherStudentAttemptId}/status`, {
      headers: authHeaders(student.token),
    });
    record('11 student viewing other status', response.status === 403, { status: response.status, data: response.data });
  }

  {
    const response = await startExam(student.token, ids.pastScheduleId);
    record('12 start exam outside window', response.status === 403, { status: response.status, data: response.data });
  }

  {
    const response = await startExam(student.token, ids.otherGroupScheduleId);
    record('13 start exam not assigned', response.status === 403, { status: response.status, data: response.data });
  }

  let createdAttemptId = null;
  let firstQuestion = null;
  let firstOptionId = null;
  {
    const fixture = await createFreshAttempt(teacher.token, student.token, 'submit-twice');
    const startResponse = fixture.startResponse;
    if ((startResponse.status === 200 || startResponse.status === 201) && startResponse.data?.attempt?._id) {
      createdAttemptId = startResponse.data.attempt._id;
      firstQuestion = startResponse.data.questions?.find((question) => question.type === 'mcq') || null;
      firstOptionId = firstQuestion?.options?.[0]?._id || null;
    }

    record('setup active attempt', Boolean(createdAttemptId && firstQuestion && firstOptionId), { status: startResponse.status, data: startResponse.data });
  }

  {
    if (!createdAttemptId || !firstQuestion || !firstOptionId) {
      record('14 submit exam twice', false, { reason: 'setup failed' });
    } else {
      await saveAnswer(student.token, createdAttemptId, firstQuestion._id, { selectedOptionId: firstOptionId });
      const firstSubmit = await submitExam(student.token, createdAttemptId);
      const secondSubmit = await submitExam(student.token, createdAttemptId);
      record('14 submit exam twice', firstSubmit.status === 200 && secondSubmit.status === 400, {
        firstStatus: firstSubmit.status,
        secondStatus: secondSubmit.status,
        secondData: secondSubmit.data,
      });
    }
  }

  {
    if (!createdAttemptId || !firstQuestion || !firstOptionId) {
      record('15 save answer after submit', false, { reason: 'setup failed' });
    } else {
      const response = await saveAnswer(student.token, createdAttemptId, firstQuestion._id, { selectedOptionId: firstOptionId });
      record('15 save answer after submit', response.status === 400 || response.status === 403, { status: response.status, data: response.data });
    }
  }

  {
    const fixture = await createFreshAttempt(teacher.token, student.token, 'tampered-score');
    const attemptId = fixture.attemptId;
    const question = fixture.questions.find((entry) => entry.type === 'mcq');
    const optionId = question?.options?.[0]?._id;
    const response = await request('/exam/save-answer', {
      method: 'POST',
      headers: authHeaders(student.token),
      body: {
        attemptId,
        questionId: question?._id,
        answer: {
          selectedOptionId: optionId,
          score: 9999,
        },
      },
    });
    const statusResponse = await request(`/exam/${attemptId}/questions`, {
      headers: authHeaders(student.token),
    });
    const answer = statusResponse.data?.questions?.find((entry) => entry._id === question?._id)?.answer;
    record('16 tampered score field ignored', response.status === 200 && (answer?.score === null || answer?.score === 0), {
      status: response.status,
      data: response.data,
      persistedAnswer: answer,
    });
  }

  {
    const response = await request('/auth/login', {
      method: 'POST',
      body: {
        email: { $gt: '' },
        password: 'anything',
      },
    });
    record('17 login NoSQL injection', response.status === 400 || response.status === 401, { status: response.status, data: response.data });
  }

  {
    const response = await fetch(`${API_BASE}/users?role[$gt]=`, {
      headers: authHeaders(admin.token),
      redirect: 'manual',
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    const isSafe = response.status === 400 || (response.status === 200 && Array.isArray(data?.users) && data.users.every((user) => user.role !== undefined));
    record('18 query NoSQL injection', isSafe, { status: response.status, data });
  }

  {
    const fixture = await createFreshAttempt(teacher.token, student.token, 'oversized-payload');
    const attemptId = fixture.attemptId;
    const question = fixture.questions.find((entry) => entry.type === 'essay') || fixture.questions[0];
    const essayText = 'A'.repeat(1024 * 1024);
    const response = await request('/exam/save-answer', {
      method: 'POST',
      headers: authHeaders(student.token),
      body: {
        attemptId,
        questionId: question?._id,
        answer: {
          essayText,
        },
      },
    });
    record('19 oversized payload', response.status === 413 || response.status === 400, { status: response.status, data: response.data });
  }

  {
    const fixture = await createFreshAttempt(teacher.token, student.token, 'option-leak');
    const attemptId = fixture.attemptId;
    const questionsResponse = await request(`/exam/${attemptId}/questions`, {
      headers: authHeaders(student.token),
    });
    const leaksCorrect = questionsResponse.data?.questions?.some((question) =>
      Array.isArray(question.options) && question.options.some((option) => Object.hasOwn(option, 'isCorrect')));
    record('20 exam payload hides isCorrect', questionsResponse.status === 200 && !leaksCorrect, { status: questionsResponse.status, data: questionsResponse.data });
  }

  {
    const response = await request(`/users/${ids.studentUserId}`, {
      headers: authHeaders(admin.token),
    });
    const leaksPassword = Object.hasOwn(response.data?.user || response.data || {}, 'password')
      || Object.hasOwn(response.data?.user || response.data || {}, 'passwordHash');
    record('21 user payload hides password', response.status === 200 && !leaksPassword, { status: response.status, data: response.data });
  }

  {
    const productionCheck = await runProductionErrorCheck();
    record('22 production error format safe', productionCheck.pass, productionCheck);
  }

  {
    const response = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: admin.cookies,
      },
      body: JSON.stringify({
        currentPassword: credentials.admin.password,
        newPassword: 'Admin123!',
      }),
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    record('23 csrf cookie-only state change blocked', response.status === 401 || response.status === 403, { status: response.status, data });
  }

  {
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials.admin),
      redirect: 'manual',
    });
    const setCookie = loginResponse.headers.get('set-cookie') || '';
    const hasHttpOnly = /HttpOnly/i.test(setCookie);
    const hasSameSite = /SameSite=Lax/i.test(setCookie);
    record('24 auth cookie flags', hasHttpOnly && hasSameSite, { setCookie });
  }

  {
    const response = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Nope',
        email: 'nope@example.com',
        password: 'Password123!',
        role: 'admin',
      },
    });
    record('25 legacy public register disabled', response.status === 404, { status: response.status, data: response.data });
  }

  {
    const bruteForceResults = [];
    const bruteForceEmail = `qa.bruteforce.${Date.now()}@example.invalid`;
    for (let index = 0; index < 11; index += 1) {
      bruteForceResults.push(await request('/auth/login', {
        method: 'POST',
        body: {
          email: bruteForceEmail,
          password: 'DefinitelyWrong123!',
        },
      }));
    }
    const last = bruteForceResults.at(-1);
    record('4 brute force limit', last.status === 429, { status: last.status, data: last.data });
  }

  const summary = await createSecuritySummary();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0) {
    process.exitCode = 1;
  }
};

main().catch(async (error) => {
  await ensureOutputDir();
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'crash.json'),
    JSON.stringify({ message: error.message, stack: error.stack }, null, 2),
    'utf8',
  );
  console.error(error);
  process.exit(1);
});
