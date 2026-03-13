import asyncHandler from '../../utils/asyncHandler.js';
import mongoose from 'mongoose';
import {
  finalizeAttempt as finalizeAttemptService,
  getAttemptDetail as getAttemptDetailService,
  getAttemptsForGrading as getAttemptsForGradingService,
  gradeEssay as gradeEssayService,
} from './grading.service.js';

export const getAttemptsForGrading = asyncHandler(async (req, res) => {
  const attempts = await getAttemptsForGradingService(req.user.id, req.query);

  res.status(200).json({
    success: true,
    attempts,
  });
});

export const getAttemptDetail = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error('A valid attempt id is required.');
    error.statusCode = 400;
    throw error;
  }

  const attempt = await getAttemptDetailService(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    attempt,
  });
});

export const gradeEssay = asyncHandler(async (req, res) => {
  const { answerId, score, feedback } = req.body;

  if (!mongoose.isValidObjectId(answerId)) {
    const error = new Error('A valid answerId is required.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof score !== 'number' || Number.isNaN(score) || score < 0) {
    const error = new Error('Score must be a non-negative number.');
    error.statusCode = 400;
    throw error;
  }

  if (feedback !== undefined && typeof feedback !== 'string') {
    const error = new Error('Feedback must be a string.');
    error.statusCode = 400;
    throw error;
  }

  const result = await gradeEssayService(answerId, score, feedback, req.user.id);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const finalizeAttempt = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.attemptId)) {
    const error = new Error('A valid attempt id is required.');
    error.statusCode = 400;
    throw error;
  }

  const attempt = await finalizeAttemptService(req.params.attemptId, req.user.id);

  res.status(200).json({
    success: true,
    attempt,
  });
});
