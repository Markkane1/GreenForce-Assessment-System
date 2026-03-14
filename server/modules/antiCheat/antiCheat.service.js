import ProctorLog from '../../models/ProctorLog.js';
import TestAttempt from '../../models/TestAttempt.js';
import { autoGradeMCQ } from '../examEngine/examEngine.service.js';

const ALLOWED_EVENT_TYPES = ['fullscreen_exit', 'tab_switch', 'copy_attempt', 'window_blur'];
const SERVER_COOLDOWN_MS = 1500;

const getViolationThreshold = () => {
  const threshold = Number(process.env.VIOLATION_THRESHOLD ?? 3);
  return Number.isInteger(threshold) && threshold > 0 ? threshold : 3;
};

const getAttemptWithTest = async (attemptId) => {
  const attempt = await TestAttempt.findById(attemptId).populate({
    path: 'testId',
    select: 'createdBy',
  });

  if (!attempt) {
    const error = new Error('Exam attempt not found.');
    error.statusCode = 404;
    throw error;
  }

  return attempt;
};

const ensureAttemptOwnership = (attempt, studentId) => {
  if (attempt.studentId.toString() !== studentId.toString()) {
    const error = new Error('You are not authorized to log violations for this attempt.');
    error.statusCode = 403;
    throw error;
  }
};

export const logViolation = async (attemptId, studentId, eventType, metadata = {}, ip = '') => {
  if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
    const error = new Error('Invalid violation event type.');
    error.statusCode = 400;
    throw error;
  }

  const attempt = await getAttemptWithTest(attemptId);
  ensureAttemptOwnership(attempt, studentId);

  if (attempt.status !== 'in_progress') {
    return {
      forceSubmitted: true,
      violationsCount: attempt.violationsCount,
    };
  }

  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - SERVER_COOLDOWN_MS);
  const updatedAttempt = await TestAttempt.findOneAndUpdate(
    {
      _id: attemptId,
      studentId,
      status: 'in_progress',
      $or: [{ lastViolationAt: null }, { lastViolationAt: { $lt: cooldownCutoff } }],
    },
    {
      $inc: { violationsCount: 1 },
      $set: { lastViolationAt: now },
    },
    {
      new: true,
    },
  ).populate({
    path: 'testId',
    select: 'createdBy',
  });

  if (!updatedAttempt) {
    const latestAttempt = await getAttemptWithTest(attemptId);
    ensureAttemptOwnership(latestAttempt, studentId);

    if (latestAttempt.status !== 'in_progress') {
      return {
        forceSubmitted: true,
        violationsCount: latestAttempt.violationsCount,
      };
    }

    if (latestAttempt.lastViolationAt && latestAttempt.lastViolationAt.getTime() >= cooldownCutoff.getTime()) {
      return {
        forceSubmitted: false,
        violationsCount: latestAttempt.violationsCount,
      };
    }

    const error = new Error('Exam attempt is not active.');
    error.statusCode = 400;
    throw error;
  }

  await ProctorLog.create({
    attemptId,
    eventType,
    metadata: {
      ...metadata,
      serverTimestamp: now,
      ip,
    },
    timestamp: now,
  });

  const threshold = getViolationThreshold();

  if (updatedAttempt.violationsCount >= threshold) {
    const score = await autoGradeMCQ(updatedAttempt._id);
    const forceSubmittedAttempt = await TestAttempt.findOneAndUpdate(
      {
        _id: attemptId,
        studentId,
        status: 'in_progress',
      },
      {
        $set: {
          status: 'force_submitted',
          submittedAt: now,
          score,
        },
      },
      {
        new: true,
      },
    ).select('violationsCount status');

    if (!forceSubmittedAttempt) {
      const latestAttempt = await TestAttempt.findById(attemptId).select('violationsCount status');
      return {
        forceSubmitted: latestAttempt?.status === 'force_submitted',
        violationsCount: latestAttempt?.violationsCount ?? updatedAttempt.violationsCount,
      };
    }

    return {
      forceSubmitted: true,
      violationsCount: forceSubmittedAttempt.violationsCount,
    };
  }

  return {
    forceSubmitted: false,
    violationsCount: updatedAttempt.violationsCount,
  };
};

export const getLogs = async (attemptId, requestingUserId, requestingRole) => {
  if (!['teacher', 'admin'].includes(requestingRole)) {
    const error = new Error('You are not authorized to view proctor logs.');
    error.statusCode = 403;
    throw error;
  }

  const attempt = await getAttemptWithTest(attemptId);

  if (
    requestingRole === 'teacher'
    && attempt.testId?.createdBy?.toString() !== requestingUserId.toString()
  ) {
    const error = new Error('You are not authorized to view logs for this attempt.');
    error.statusCode = 403;
    throw error;
  }

  return ProctorLog.find({ attemptId }).sort({ timestamp: 1 });
};
