import fs from 'node:fs/promises';
import path from 'node:path';
import playwright from './node_modules/playwright/index.js';

const { chromium } = playwright;

const ROOT = 'D:/web temps/EPA Testing Suite';
const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(ROOT, '.qa-screens', 'publish-sweep');
const TARGET_GROUP = 'Other Student Group';
const TARGET_TEST = 'Sample JavaScript Basics Test';

const creds = {
  admin: { email: 'admin@exam-pop.local', password: 'Admin123!' },
  teacher: { email: 'teacher@exam-pop.local', password: 'Teacher123!' },
};

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const createImportCsvFixture = async () => {
  const csvPath = path.join(ROOT, 'tmp-import.csv');
  const csv = [
    'question,option1,option2,option3,option4,correctOption,points',
    '"What does QA stand for?","Quality Assurance","Quick Access","Query Analysis","Quiet Archive","1","1"',
  ].join('\n');
  await fs.writeFile(csvPath, csv, 'utf8');
  return csvPath;
};

const nowStamp = () => Date.now();

const apiRequest = async (pathname, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`http://localhost:5000/api${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || `Request failed for ${pathname}`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const apiLogin = async ({ email, password }) => {
  const payload = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  if (!payload?.token) {
    throw new Error(`API login for ${email} did not return a token.`);
  }

  return payload.token;
};

const ensureTeacherSchedule = async (token) => {
  const testsPayload = await apiRequest('/tests', { token });
  const groupsPayload = await apiRequest('/groups', { token });

  const test = (testsPayload.tests || []).find((entry) => entry.title === TARGET_TEST);
  const group = (groupsPayload.groups || []).find((entry) => entry.name === TARGET_GROUP);

  if (!test) {
    throw new Error(`Published test "${TARGET_TEST}" was not available to the teacher QA flow.`);
  }

  if (!group) {
    throw new Error(`Target group "${TARGET_GROUP}" was not available to the teacher QA flow.`);
  }

  try {
    await apiRequest('/schedules', {
      method: 'POST',
      token,
      body: {
        testId: test._id,
        startTime: new Date(Date.now() - 5 * 60_000).toISOString(),
        endTime: new Date(Date.now() + 55 * 60_000).toISOString(),
        assignedGroups: [group._id],
      },
    });
  } catch (error) {
    if (error.statusCode !== 400 || !/already overlaps/i.test(error.message)) {
      throw error;
    }
  }
};

const attachLogging = (page, bucket, role) => {
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      bucket.push(`[${role}][console:${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    bucket.push(`[${role}][pageerror] ${error.message}`);
  });

  page.on('response', async (response) => {
    const url = response.url();

    if (url.startsWith('http://localhost:5000/api/') && response.status() >= 400) {
      let body = '';

      try {
        body = await response.text();
      } catch {
        body = '';
      }

      bucket.push(`[${role}][response:${response.status()}] ${url}${body ? ` :: ${body}` : ''}`);
    }
  });
};

const login = async (page, email, password, expectedPath) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(`**${expectedPath}`, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
};

const getQuestionCount = async (page) => {
  const text = await page.locator('text=/Question\\s+\\d+\\s+of\\s+\\d+/').first().textContent();
  const match = text?.match(/Question\s+\d+\s+of\s+(\d+)/i);
  return match ? Number(match[1]) : 1;
};

const answerActiveExam = async (page) => {
  const total = await getQuestionCount(page);

  for (let index = 0; index < total; index += 1) {
    const continueSectionButton = page.locator('button').filter({ hasText: 'Continue to Next Section' });

    if (await continueSectionButton.isVisible().catch(() => false)) {
      await continueSectionButton.click();
      await page.waitForTimeout(400);
    }

    await page.waitForFunction(
      () =>
        Boolean(document.querySelector('textarea'))
        || Array.from(document.querySelectorAll('button')).some((button) => /Option/i.test(button.innerText))
        || Array.from(document.querySelectorAll('button')).some((button) => /Review & Submit/i.test(button.innerText)),
      null,
      { timeout: 15000 },
    );

    const textarea = page.locator('textarea').first();
    const reviewButton = page.getByRole('button', { name: 'Review & Submit' });

    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill(`Automated publish QA answer ${index + 1}`);
    } else {
      const clicked = await page.evaluate(() => {
        const optionButton = [...document.querySelectorAll('button')].find((button) => /Option/i.test(button.innerText));

        if (!optionButton) {
          return false;
        }

        optionButton.click();
        return true;
      });

      if (!clicked) {
        if (await reviewButton.isVisible().catch(() => false)) {
          await reviewButton.click();
          break;
        }

        throw new Error('No visible MCQ option button was available for automated exam answering.');
      }
    }

    const nextButton = page.getByRole('button', { name: 'Next' });

    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click();
      break;
    }

    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }
  }
};

const issues = [];

await ensureDir(OUT_DIR);

const browser = await chromium.launch({ headless: true });

try {
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  attachLogging(adminPage, issues, 'admin');

  await login(adminPage, creds.admin.email, creds.admin.password, '/admin/dashboard');
  await adminPage.goto(`${BASE_URL}/admin/groups`, { waitUntil: 'networkidle' });
  await adminPage.screenshot({ path: path.join(OUT_DIR, 'admin-groups.png'), fullPage: true });

  await adminPage
    .locator('[role="button"]')
    .filter({ hasText: TARGET_GROUP })
    .first()
    .locator('button')
    .filter({ hasText: 'Manage Invite Codes' })
    .click();
  const [inviteResponse] = await Promise.all([
    adminPage.waitForResponse((response) => response.url().includes('/api/invite-codes/single') && response.status() === 201),
    adminPage.locator('button').filter({ hasText: 'Generate Code' }).click(),
  ]);
  const invitePayload = await inviteResponse.json();
  const inviteCode = invitePayload?.inviteCode?.code;

  if (!inviteCode) {
    throw new Error('Invite code generation succeeded without returning a code.');
  }
  await adminPage.screenshot({ path: path.join(OUT_DIR, 'admin-invite-panel.png'), fullPage: true });

  const [download] = await Promise.all([
    adminPage.waitForEvent('download'),
    adminPage.locator('button').filter({ hasText: 'Export as CSV' }).click(),
  ]);
  await download.saveAs(path.join(OUT_DIR, `invite-codes-${nowStamp()}.csv`));
  await adminPage.keyboard.press('Escape');
  await adminContext.close();

  const teacherContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const teacherPage = await teacherContext.newPage();
  attachLogging(teacherPage, issues, 'teacher');

  await login(teacherPage, creds.teacher.email, creds.teacher.password, '/teacher/dashboard');
  await teacherPage.goto(`${BASE_URL}/teacher/tests/new`, { waitUntil: 'networkidle' });
  await teacherPage.screenshot({ path: path.join(OUT_DIR, 'teacher-test-builder.png'), fullPage: true });
  await Promise.all([
    teacherPage.waitForResponse((response) =>
      response.url().includes('/api/tests/')
      && response.url().includes('/sections')
      && response.request().method() === 'POST'
      && response.status() === 201),
    teacherPage.locator('button').filter({ hasText: 'Add Section' }).click(),
  ]);
  const addMcqButton = teacherPage.locator('button').filter({ hasText: 'Add MCQ' }).first();
  await addMcqButton.waitFor({ state: 'visible', timeout: 15000 });
  await addMcqButton.click();
  await teacherPage.waitForTimeout(1200);
  const importCsvPath = await createImportCsvFixture();
  const fileInput = teacherPage.locator('input[type="file"]').first();
  await Promise.all([
    teacherPage.waitForResponse((response) =>
      response.url().includes('/questions/import')
      && response.request().method() === 'POST'
      && response.status() === 201),
    fileInput.setInputFiles(importCsvPath),
  ]);
  await teacherPage.waitForTimeout(1200);
  const teacherToken = await apiLogin(creds.teacher);
  await ensureTeacherSchedule(teacherToken);
  await teacherPage.goto(`${BASE_URL}/teacher/schedule`, { waitUntil: 'networkidle' });
  await teacherPage.screenshot({ path: path.join(OUT_DIR, 'teacher-schedule.png'), fullPage: true });
  await teacherPage.goto(`${BASE_URL}/teacher/grade`, { waitUntil: 'networkidle' });
  await teacherPage.screenshot({ path: path.join(OUT_DIR, 'teacher-grading.png'), fullPage: true });
  await teacherContext.close();

  const signupContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const signupPage = await signupContext.newPage();
  attachLogging(signupPage, issues, 'signup');

  const stamp = nowStamp();
  const studentIdentity = {
    name: `Publish QA Student ${stamp}`,
    email: `publish.qa.${stamp}@exam-pop.local`,
    phone: '+92 300 1234567',
    password: 'Student123!',
  };

  await signupPage.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle' });
  await signupPage.getByPlaceholder('TIGER-CLOUD-47').fill(inviteCode);
  await signupPage.locator('button').filter({ hasText: 'Continue' }).click();
  await signupPage.waitForFunction(
    () => document.body.innerText.includes('JOINING:') && /Create your account/i.test(document.body.innerText),
    null,
    { timeout: 15000 },
  );
  await signupPage.getByPlaceholder('Your full name').fill(studentIdentity.name);
  await signupPage.getByPlaceholder('you@example.com').fill(studentIdentity.email);
  await signupPage.getByPlaceholder('+92 300 1234567').fill(studentIdentity.phone);
  await signupPage.getByPlaceholder('Minimum 8 characters').fill(studentIdentity.password);
  await signupPage.locator('button').filter({ hasText: 'Create Account' }).click();
  await signupPage.waitForFunction(
    () => /Welcome aboard/i.test(document.body.innerText),
    null,
    { timeout: 20000 },
  );
  await signupPage.screenshot({ path: path.join(OUT_DIR, 'signup-success.png'), fullPage: true });
  await signupPage.locator('button').filter({ hasText: 'Go to Login' }).click();
  await signupPage.waitForURL('**/login', { timeout: 10000 });
  await signupContext.close();

  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const studentPage = await studentContext.newPage();
  attachLogging(studentPage, issues, 'student');

  await login(studentPage, studentIdentity.email, studentIdentity.password, '/student/dashboard');
  const startButtons = studentPage.locator('button').filter({ hasText: 'Start Exam' });
  await startButtons.first().waitFor({ timeout: 15000 });
  await studentPage.screenshot({ path: path.join(OUT_DIR, 'student-dashboard.png'), fullPage: true });
  const startCount = await startButtons.count();

  if (startCount === 0) {
    throw new Error('No available Start Exam actions were visible for the newly registered student.');
  }

  await startButtons.first().click();
  await studentPage.waitForURL('**/student/exam/**', { timeout: 15000 });
  await studentPage.waitForSelector('text=Exam Preview', { timeout: 15000 });
  await studentPage.screenshot({ path: path.join(OUT_DIR, 'student-exam-preview.png'), fullPage: true });

  await studentPage.locator('button').filter({ hasText: 'Begin Exam' }).click();
  await studentPage.waitForTimeout(1200);

  const fullscreenButton = studentPage.locator('button').filter({ hasText: 'Enter Fullscreen' });
  if (await fullscreenButton.isVisible().catch(() => false)) {
    await fullscreenButton.click();
    await studentPage.waitForTimeout(1200);
  }

  await studentPage.screenshot({ path: path.join(OUT_DIR, 'student-exam-active.png'), fullPage: true });
  await answerActiveExam(studentPage);
  await studentPage.locator('button').filter({ hasText: 'Submit Exam' }).click();
  await studentPage.waitForLoadState('networkidle');
  await studentPage.screenshot({ path: path.join(OUT_DIR, 'student-exam-submitted.png'), fullPage: true });

  const viewResults = studentPage.locator('button').filter({ hasText: 'View Results Now' });
  if (await viewResults.isVisible().catch(() => false)) {
    await viewResults.click();
  }

  await studentPage.waitForURL('**/student/results/**', { timeout: 15000 });
  await studentPage.waitForLoadState('networkidle');
  await studentPage.screenshot({ path: path.join(OUT_DIR, 'student-results.png'), fullPage: true });
  await studentContext.close();

  await fs.writeFile(
    path.join(OUT_DIR, 'summary.json'),
    JSON.stringify(
      {
        inviteCode,
        studentEmail: studentIdentity.email,
        issues,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
