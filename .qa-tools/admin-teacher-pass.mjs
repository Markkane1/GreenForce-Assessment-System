import fs from 'node:fs/promises';
import path from 'node:path';
import playwright from './node_modules/playwright/index.js';

const { chromium } = playwright;
const ROOT = 'D:/web temps/EPA Testing Suite';
const OUT_DIR = path.join(ROOT, '.qa-screens', 'admin-teacher-pass');
const BASE_URL = 'http://localhost:5173';
const API_BASE = 'http://localhost:5000/api';

const creds = {
  admin: { email: 'admin@exam-pop.local', password: 'Admin123!' },
  student: { email: 'student@exam-pop.local', password: 'Student123!' },
};

const apiRequest = async (pathname, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  return payload.token;
};

const ensureDir = async () => {
  await fs.mkdir(OUT_DIR, { recursive: true });
};

const ensureMonitorFixture = async (adminToken, studentToken) => {
  const testsPayload = await apiRequest('/tests', { token: adminToken });
  const groupsPayload = await apiRequest('/groups', { token: adminToken });
  const targetTest = (testsPayload.tests || []).find((entry) => entry.title === 'Sample JavaScript Basics Test');
  const targetGroup = (groupsPayload.groups || []).find((entry) => entry.name === 'Sample Student Group');

  if (!targetTest?._id || !targetGroup?._id) {
    throw new Error('Unable to find sample test/group for monitor fixture.');
  }

  let scheduleId;
  try {
    const schedulePayload = await apiRequest('/schedules', {
      method: 'POST',
      token: adminToken,
      body: {
        testId: targetTest._id,
        startTime: new Date(Date.now() - 5 * 60_000).toISOString(),
        endTime: new Date(Date.now() + 55 * 60_000).toISOString(),
        assignedGroups: [targetGroup._id],
      },
    });
    scheduleId = schedulePayload.schedule?._id;
  } catch (error) {
    if (error.statusCode !== 400 || !/already overlaps/i.test(error.message)) {
      throw error;
    }

    const schedulesPayload = await apiRequest('/schedules', { token: adminToken });
    const active = (schedulesPayload.schedules || []).find((schedule) => {
      const assignedGroups = schedule.assignedGroups || [];
      const hasGroup = assignedGroups.some((group) => (group._id || group).toString() === targetGroup._id.toString());
      const isSameTest = (schedule.testId?._id || schedule.testId)?.toString() === targetTest._id.toString();
      const startsAt = new Date(schedule.startTime).getTime();
      const endsAt = new Date(schedule.endTime).getTime();
      return hasGroup && isSameTest && startsAt <= Date.now() && endsAt >= Date.now();
    });
    scheduleId = active?._id;
  }

  if (!scheduleId) {
    throw new Error('Unable to resolve monitor schedule fixture.');
  }

  const startPayload = await apiRequest('/exam/start', {
    method: 'POST',
    token: studentToken,
    body: { scheduleId },
  });

  return {
    scheduleId,
    attemptId: startPayload.attempt?._id,
  };
};

const login = async (page, email, password, expectedPath) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(`**${expectedPath}`, { timeout: 20000 });
  await page.waitForLoadState('networkidle');
};

const issues = [];
const attachLogging = (page, routeKey) => {
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      issues.push(`[${routeKey}][console:${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    issues.push(`[${routeKey}][pageerror] ${error.message}`);
  });
  page.on('response', async (response) => {
    const url = response.url();
    if (url.startsWith('http://localhost:5000/api/') && response.status() >= 400) {
      const body = await response.text().catch(() => '');
      issues.push(`[${routeKey}][response:${response.status()}] ${url}${body ? ` :: ${body}` : ''}`);
    }
  });
};

await ensureDir();
const adminToken = await apiLogin(creds.admin);
const studentToken = await apiLogin(creds.student);
const monitorFixture = await ensureMonitorFixture(adminToken, studentToken);

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  attachLogging(page, 'admin-teacher-pass');

  await login(page, creds.admin.email, creds.admin.password, '/admin/dashboard');

  const routes = [
    { url: `${BASE_URL}/teacher/dashboard`, name: 'teacher-dashboard' },
    { url: `${BASE_URL}/teacher/tests/new`, name: 'teacher-tests-new' },
    { url: `${BASE_URL}/teacher/schedule`, name: 'teacher-schedule' },
    { url: `${BASE_URL}/teacher/grade`, name: 'teacher-grade' },
    { url: `${BASE_URL}/teacher/monitor/${monitorFixture.scheduleId}`, name: 'teacher-monitor' },
  ];

  for (const route of routes) {
    await page.goto(route.url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUT_DIR, `${route.name}.png`), fullPage: true });
    const body = await page.locator('body').innerText();
    await fs.writeFile(path.join(OUT_DIR, `${route.name}.txt`), body, 'utf8');
  }

  await fs.writeFile(
    path.join(OUT_DIR, 'summary.json'),
    JSON.stringify({ monitorFixture, issues }, null, 2),
    'utf8',
  );

  if (issues.length) {
    console.log(JSON.stringify({ issues }, null, 2));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
