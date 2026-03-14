import mongoose from 'mongoose';
import Answer from '../../models/Answer.js';
import GroupMember from '../../models/GroupMember.js';
import Section from '../../models/Section.js';
import StudentGroup from '../../models/StudentGroup.js';
import Test from '../../models/Test.js';
import TestAttempt from '../../models/TestAttempt.js';
import TestSchedule from '../../models/TestSchedule.js';

const buildPopulatedScheduleQuery = (query) =>
  query
    .populate({
      path: 'testId',
      populate: {
        path: 'createdBy',
        select: '-password',
      },
    })
    .populate({
      path: 'assignedGroups',
    });

export const getAllSchedules = async () =>
  buildPopulatedScheduleQuery(TestSchedule.find({}).sort({ startTime: 1 }));

const ensureValidDateRange = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error('Valid startTime and endTime are required.');
    error.statusCode = 400;
    throw error;
  }

  if (end <= start) {
    const error = new Error('endTime must be later than startTime.');
    error.statusCode = 400;
    throw error;
  }

  return { start, end };
};

const validateAssignedGroups = async (assignedGroups) => {
  if (!Array.isArray(assignedGroups) || assignedGroups.length === 0) {
    const error = new Error('At least one assigned group is required.');
    error.statusCode = 400;
    throw error;
  }

  const uniqueGroupIds = [...new Set(assignedGroups.map((groupId) => groupId.toString()))];
  const groups = await StudentGroup.find({ _id: { $in: uniqueGroupIds } }).select('_id');

  if (groups.length !== uniqueGroupIds.length) {
    const error = new Error('One or more assigned groups are invalid.');
    error.statusCode = 400;
    throw error;
  }

  return uniqueGroupIds;
};

const haveSameGroups = (firstGroups = [], secondGroups = []) => {
  if (firstGroups.length !== secondGroups.length) {
    return false;
  }

  const normalizeGroupId = (group) => (group?._id || group).toString();
  const firstSorted = [...firstGroups].map(normalizeGroupId).sort();
  const secondSorted = [...secondGroups].map(normalizeGroupId).sort();

  return firstSorted.every((groupId, index) => groupId === secondSorted[index]);
};

const ensureNoDuplicateSchedule = async ({
  scheduleId = null,
  testId,
  start,
  end,
  assignedGroups,
}) => {
  const overlappingSchedules = await TestSchedule.find({
    ...(scheduleId ? { _id: { $ne: scheduleId } } : {}),
    testId,
    startTime: { $lt: end },
    endTime: { $gt: start },
  }).select('_id assignedGroups startTime endTime');

  const duplicate = overlappingSchedules.find((schedule) =>
    haveSameGroups(schedule.assignedGroups || [], assignedGroups),
  );

  if (duplicate) {
    const error = new Error('A schedule for this test and student-group selection already overlaps the chosen time window.');
    error.statusCode = 400;
    throw error;
  }
};

const ensureScheduleExists = async (id) => {
  const schedule = await buildPopulatedScheduleQuery(TestSchedule.findById(id));

  if (!schedule) {
    const error = new Error('Schedule not found.');
    error.statusCode = 404;
    throw error;
  }

  return schedule;
};

const ensureTeacherOwnsTest = (test, teacherId, role = 'teacher') => {
  if (role === 'admin') {
    return;
  }

  if (test.createdBy._id.toString() !== teacherId.toString()) {
    const error = new Error('You are not authorized to manage this schedule.');
    error.statusCode = 403;
    throw error;
  }
};

const ensureUserCanAccessSchedule = async (schedule, userId, role) => {
  if (role === 'admin') {
    return;
  }

  if (role === 'teacher') {
    ensureTeacherOwnsTest(schedule.testId, userId);
    return;
  }

  if (role === 'student') {
    const membership = await GroupMember.findOne({
      studentId: userId,
      groupId: { $in: schedule.assignedGroups.map((group) => group._id || group) },
    }).select('_id');

    if (membership) {
      return;
    }
  }

  const error = new Error('You are not authorized to access this schedule.');
  error.statusCode = 403;
  throw error;
};

export const createSchedule = async (testId, startTime, endTime, assignedGroups, teacherId, role = 'teacher') => {
  const test = await Test.findById(testId).populate({
    path: 'createdBy',
    select: '-password',
  });

  if (!test) {
    const error = new Error('Test not found.');
    error.statusCode = 404;
    throw error;
  }

  ensureTeacherOwnsTest(test, teacherId, role);

  if (!test.isPublished) {
    const error = new Error('Only published tests can be scheduled.');
    error.statusCode = 400;
    throw error;
  }

  const { start, end } = ensureValidDateRange(startTime, endTime);
  const validGroupIds = await validateAssignedGroups(assignedGroups);
  await ensureNoDuplicateSchedule({
    testId,
    start,
    end,
    assignedGroups: validGroupIds,
  });

  const schedule = await TestSchedule.create({
    testId,
    startTime: start,
    endTime: end,
    assignedGroups: validGroupIds,
  });

  return buildPopulatedScheduleQuery(TestSchedule.findById(schedule._id));
};

export const getSchedulesForTeacher = async (teacherId) => {
  const tests = await Test.find({ createdBy: teacherId }).select('_id');
  const testIds = tests.map((test) => test._id);

  return buildPopulatedScheduleQuery(TestSchedule.find({ testId: { $in: testIds } }).sort({ startTime: 1 }));
};

export const getSchedulesForStudent = async (studentId) => {
  const memberships = await GroupMember.find({ studentId }).select('groupId');
  const groupIds = memberships.map((membership) => membership.groupId);

  const schedules = await buildPopulatedScheduleQuery(
    TestSchedule.find({
      assignedGroups: { $in: groupIds },
      endTime: { $gte: new Date() },
    }).sort({ startTime: 1 }),
  );

  if (schedules.length === 0) {
    return [];
  }

  const scheduleIds = schedules.map((schedule) => schedule._id);
  const studentObjectId = new mongoose.Types.ObjectId(studentId);
  const attemptsBySchedule = await TestAttempt.aggregate([
    {
      $match: {
        studentId: studentObjectId,
        scheduleId: { $in: scheduleIds },
        status: { $ne: 'in_progress' },
      },
    },
    {
      $group: {
        _id: '$scheduleId',
        attemptsTaken: { $sum: 1 },
      },
    },
  ]);
  const attemptsMap = new Map(
    attemptsBySchedule.map((entry) => [entry._id.toString(), entry.attemptsTaken]),
  );

  return schedules.map((schedule) => {
    const attemptsTaken = attemptsMap.get(schedule._id.toString()) || 0;
    const maxAttempts = schedule.testId?.maxAttempts || 0;

    return {
      ...schedule.toObject(),
      attemptsTaken,
      hasAttemptsLeft: attemptsTaken < maxAttempts,
    };
  });
};

export const getScheduleById = async (id, userId, role) => {
  const schedule = await ensureScheduleExists(id);
  await ensureUserCanAccessSchedule(schedule, userId, role);

  const sections = await Section.find({ testId: schedule.testId._id }).select('questionsToServe').lean();
  const totalQuestions = sections.reduce((sum, section) => sum + (section.questionsToServe || 0), 0);

  let attemptsTaken = 0;

  if (role === 'student') {
    attemptsTaken = await TestAttempt.countDocuments({
      studentId: userId,
      scheduleId: schedule._id,
      status: { $ne: 'in_progress' },
    });
  }

  return {
    ...schedule.toObject(),
    totalQuestions,
    attemptsTaken,
  };
};

export const updateSchedule = async (id, data, teacherId, role = 'teacher') => {
  const schedule = await ensureScheduleExists(id);
  ensureTeacherOwnsTest(schedule.testId, teacherId, role);

  const nextStartTime = data.startTime !== undefined ? data.startTime : schedule.startTime;
  const nextEndTime = data.endTime !== undefined ? data.endTime : schedule.endTime;
  const { start, end } = ensureValidDateRange(nextStartTime, nextEndTime);
  const nextAssignedGroups =
    data.assignedGroups !== undefined ? await validateAssignedGroups(data.assignedGroups) : schedule.assignedGroups;

  await ensureNoDuplicateSchedule({
    scheduleId: schedule._id,
    testId: schedule.testId._id,
    start,
    end,
    assignedGroups: nextAssignedGroups,
  });

  schedule.startTime = start;
  schedule.endTime = end;

  if (data.assignedGroups !== undefined) {
    schedule.assignedGroups = nextAssignedGroups;
  }

  await schedule.save();

  return buildPopulatedScheduleQuery(TestSchedule.findById(schedule._id));
};

export const deleteSchedule = async (id, teacherId, role = 'teacher') => {
  const schedule = await ensureScheduleExists(id);
  ensureTeacherOwnsTest(schedule.testId, teacherId, role);

  await TestSchedule.findByIdAndDelete(id);

  return {
    success: true,
    message: 'Schedule deleted successfully.',
  };
};

export const getActiveAttempts = async (scheduleId, teacherId, role = 'teacher') => {
  const schedule = await ensureScheduleExists(scheduleId);
  const violationThreshold = Number.parseInt(process.env.VIOLATION_THRESHOLD || '3', 10);

  if (role !== 'admin') {
    ensureTeacherOwnsTest(schedule.testId, teacherId);
  }

  const attempts = await TestAttempt.find({
    scheduleId,
    status: 'in_progress',
  })
    .populate('studentId', 'name email')
    .sort({ startedAt: 1 });
  const scheduleEndTime = new Date(schedule.endTime).getTime();
  const examDurationSeconds = schedule.testId.timeLimitMinutes * 60;

  const attemptsWithMetrics = await Promise.all(
    attempts.map(async (attempt) => {
      const answeredCount = await Answer.countDocuments({ attemptId: attempt._id });
      const elapsedSeconds = Math.max(
        Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000),
        0,
      );
      const timeRemainingByLimit = Math.max(examDurationSeconds - elapsedSeconds, 0);
      const timeRemainingBySchedule = Math.max(
        Math.floor((scheduleEndTime - Date.now()) / 1000),
        0,
      );

      return {
        attemptId: attempt._id,
        studentName: attempt.studentId?.name || 'Unknown Student',
        studentEmail: attempt.studentId?.email || '',
        startedAt: attempt.startedAt,
        elapsedSeconds,
        remainingSeconds: Math.min(timeRemainingByLimit, timeRemainingBySchedule),
        answeredCount,
        totalQuestions: Array.isArray(attempt.questionOrder) ? attempt.questionOrder.length : 0,
        violationsCount: attempt.violationsCount || 0,
        status: attempt.status,
      };
    }),
  );

  return {
    schedule: {
      _id: schedule._id,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      testId: schedule.testId,
    },
    violationThreshold,
    attempts: attemptsWithMetrics,
  };
};
