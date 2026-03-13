import ProctorLog from '../../models/ProctorLog.js';
import TestAttempt from '../../models/TestAttempt.js';
import { autoGradeMCQ } from '../examEngine/examEngine.service.js';

const ALLOWED_EVENT_TYPES = ['fullscreen_exit', 'tab_switch', 'copy_attempt', 'window_blur'];

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

export const logViolation = async (attemptId, studentId, eventType, metadata = {}) => {
  if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
    const error = new Error('Invalid violation event type.');
    error.statusCode = 400;
    throw error;
  }

  const attempt = await getAttemptWithTest(attemptId);

  if (attempt.studentId.toString() !== studentId.toString()) {
    const error = new Error('You are not authorized to log violations for this attempt.');
    error.statusCode = 403;
    throw error;
  }

  if (attempt.status !== 'in_progress') {
    const error = new Error('Exam attempt is not active.');
    error.statusCode = 400;
    throw error;
  }

  const incrementedAttempt = await TestAttempt.findOneAndUpdate(
    {
      _id: attemptId,
      studentId,
      status: 'in_progress',
    },
    {
      $inc: { violationsCount: 1 },
    },
    {
      new: true,
    },
  ).populate({
    path: 'testId',
    select: 'createdBy',
  });

  if (!incrementedAttempt) {
    const latestAttempt = await getAttemptWithTest(attemptId);

    if (latestAttempt.studentId.toString() !== studentId.toString()) {
      const error = new Error('You are not authorized to log violations for this attempt.');
      error.statusCode = 403;
      throw error;
    }

    const error = new Error('Exam attempt is not active.');
    error.statusCode = 400;
    throw error;
  }

  await ProctorLog.create({
    attemptId,
    eventType,
    metadata,
    timestamp: new Date(),
  });

  const threshold = getViolationThreshold();

  if (incrementedAttempt.violationsCount >= threshold) {
    const score = await autoGradeMCQ(attempt._id);
    const forceSubmittedAttempt = await TestAttempt.findOneAndUpdate(
      {
        _id: attemptId,
        status: 'in_progress',
      },
      {
        status: 'force_submitted',
        submittedAt: new Date(),
        score,
      },
      {
        new: true,
      },
    ).select('violationsCount status');

    if (!forceSubmittedAttempt) {
      const latestAttempt = await TestAttempt.findById(attemptId).select('violationsCount status');

      return {
        forceSubmitted: latestAttempt?.status === 'force_submitted',
        violationsCount: latestAttempt?.violationsCount ?? incrementedAttempt.violationsCount,
      };
    }

    return {
      forceSubmitted: true,
      violationsCount: forceSubmittedAttempt.violationsCount,
    };
  }

  return {
    forceSubmitted: false,
    violationsCount: incrementedAttempt.violationsCount,
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
