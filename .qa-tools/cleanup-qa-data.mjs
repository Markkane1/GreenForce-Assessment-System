import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from '../server/node_modules/dotenv/lib/main.js';
import mongoose from '../server/node_modules/mongoose/index.js';
import Answer from '../server/models/Answer.js';
import GroupMember from '../server/models/GroupMember.js';
import InviteCode from '../server/models/InviteCode.js';
import MCQOption from '../server/models/MCQOption.js';
import ProctorLog from '../server/models/ProctorLog.js';
import Question from '../server/models/Question.js';
import Section from '../server/models/Section.js';
import Test from '../server/models/Test.js';
import TestAttempt from '../server/models/TestAttempt.js';
import TestSchedule from '../server/models/TestSchedule.js';
import User from '../server/models/User.js';

dotenv.config({ path: path.resolve('server/.env') });
await mongoose.connect(process.env.MONGO_URI);

const summaryPaths = {
  publish: path.resolve('.qa-screens/publish-sweep/summary.json'),
  adminTeacher: path.resolve('.qa-screens/admin-teacher-pass/summary.json'),
};

const readJsonSafe = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const publishSummary = await readJsonSafe(summaryPaths.publish);
const adminTeacherSummary = await readJsonSafe(summaryPaths.adminTeacher);

const qaUsers = await User.find({ email: /^publish\.qa\./i }).select('_id email').lean();
const qaUserIds = qaUsers.map((user) => user._id);

const qaTests = await Test.find({ title: /^QA\s/i }).select('_id title').lean();
const qaTestIds = qaTests.map((test) => test._id);

const qaSections = qaTestIds.length > 0
  ? await Section.find({ testId: { $in: qaTestIds } }).select('_id').lean()
  : [];
const qaSectionIds = qaSections.map((section) => section._id);

const qaQuestions = qaSectionIds.length > 0
  ? await Question.find({ sectionId: { $in: qaSectionIds } }).select('_id').lean()
  : [];
const qaQuestionIds = qaQuestions.map((question) => question._id);

const monitorScheduleIds = [adminTeacherSummary?.monitorFixture?.scheduleId].filter(Boolean);
const monitorAttemptIds = [adminTeacherSummary?.monitorFixture?.attemptId].filter(Boolean);

const qaSchedules = await TestSchedule.find({
  $or: [
    ...(qaTestIds.length > 0 ? [{ testId: { $in: qaTestIds } }] : []),
    ...(monitorScheduleIds.length > 0 ? [{ _id: { $in: monitorScheduleIds } }] : []),
  ],
}).select('_id').lean();
const qaScheduleIds = qaSchedules.map((schedule) => schedule._id);

const qaAttempts = await TestAttempt.find({
  $or: [
    ...(qaUserIds.length > 0 ? [{ studentId: { $in: qaUserIds } }] : []),
    ...(qaTestIds.length > 0 ? [{ testId: { $in: qaTestIds } }] : []),
    ...(qaScheduleIds.length > 0 ? [{ scheduleId: { $in: qaScheduleIds } }] : []),
    ...(monitorAttemptIds.length > 0 ? [{ _id: { $in: monitorAttemptIds } }] : []),
  ],
}).select('_id').lean();
const qaAttemptIds = qaAttempts.map((attempt) => attempt._id);

const inviteQuery = {
  $or: [
    ...(publishSummary?.inviteCode ? [{ code: publishSummary.inviteCode }] : []),
    ...(qaUserIds.length > 0 ? [{ usedBy: { $in: qaUserIds } }] : []),
  ],
};
const inviteCodes = inviteQuery.$or.length > 0
  ? await InviteCode.find(inviteQuery).select('_id code').lean()
  : [];
const inviteCodeIds = inviteCodes.map((inviteCode) => inviteCode._id);

const summary = {
  qaUsers: qaUsers.map((user) => user.email),
  qaTests: qaTests.map((test) => test.title),
  deleted: {},
};

if (qaAttemptIds.length > 0) {
  summary.deleted.proctorLogs = (await ProctorLog.deleteMany({ attemptId: { $in: qaAttemptIds } })).deletedCount;
  summary.deleted.answers = (await Answer.deleteMany({ attemptId: { $in: qaAttemptIds } })).deletedCount;
  summary.deleted.attempts = (await TestAttempt.deleteMany({ _id: { $in: qaAttemptIds } })).deletedCount;
}

if (qaScheduleIds.length > 0) {
  summary.deleted.schedules = (await TestSchedule.deleteMany({ _id: { $in: qaScheduleIds } })).deletedCount;
}

if (qaQuestionIds.length > 0) {
  summary.deleted.options = (await MCQOption.deleteMany({ questionId: { $in: qaQuestionIds } })).deletedCount;
  summary.deleted.questions = (await Question.deleteMany({ _id: { $in: qaQuestionIds } })).deletedCount;
}

if (qaSectionIds.length > 0) {
  summary.deleted.sections = (await Section.deleteMany({ _id: { $in: qaSectionIds } })).deletedCount;
}

if (qaTestIds.length > 0) {
  summary.deleted.tests = (await Test.deleteMany({ _id: { $in: qaTestIds } })).deletedCount;
}

if (inviteCodeIds.length > 0) {
  summary.deleted.inviteCodes = (await InviteCode.deleteMany({ _id: { $in: inviteCodeIds } })).deletedCount;
}

if (qaUserIds.length > 0) {
  summary.deleted.groupMembers = (await GroupMember.deleteMany({ studentId: { $in: qaUserIds } })).deletedCount;
  summary.deleted.users = (await User.deleteMany({ _id: { $in: qaUserIds } })).deletedCount;
}

const fileCleanupTargets = [
  path.resolve('tmp-import.csv'),
  path.resolve('.qa-tools/tmp-login-check.mjs'),
  path.resolve('.qa-tools/tmp-teacher-builder-check.mjs'),
];
summary.deleted.files = [];
for (const filePath of fileCleanupTargets) {
  try {
    await fs.unlink(filePath);
    summary.deleted.files.push(path.basename(filePath));
  } catch {}
}

console.log(JSON.stringify(summary, null, 2));
await mongoose.disconnect();
