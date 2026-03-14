import asyncHandler from '../../utils/asyncHandler.js';
import mongoose from 'mongoose';
import { getViolationThreshold } from '../antiCheat/antiCheat.service.js';
import {
  getMyAttempts as getMyAttemptsService,
  getAttemptResults as getAttemptResultsService,
  getAttemptQuestions as getAttemptQuestionsService,
  getAttemptStatus as getAttemptStatusService,
  saveAnswer as saveAnswerService,
  startExam as startExamService,
  submitExam as submitExamService,
} from './examEngine.service.js';

export const startExam = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.body.scheduleId)) {
    const error = new Error('A valid scheduleId is required.');
    error.statusCode = 400;
    throw error;
  }

  const result = await startExamService(req.user.id, req.body.scheduleId);

  res.status(201).json({
    success: true,
    attempt: result.attempt,
    questions: result.questions,
    alreadySubmitted: Boolean(result.alreadySubmitted),
    resumed: result.resumed,
    remainingSeconds: result.remainingSeconds,
    violationThreshold: getViolationThreshold(),
  });
});

export const saveAnswer = asyncHandler(async (req, res) => {
  const { attemptId, questionId, answer } = req.body;

  if (!mongoose.isValidObjectId(attemptId)) {
    const error = new Error('A valid attemptId is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.isValidObjectId(questionId)) {
    const error = new Error('A valid questionId is required.');
    error.statusCode = 400;
    throw error;
  }

  const savedAnswer = await saveAnswerService(attemptId, req.user.id, questionId, answer);

  res.status(200).json({
    success: true,
    answer: savedAnswer,
  });
});

export const getAttemptQuestions = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.attemptId)) {
    const error = new Error('A valid attemptId is required.');
    error.statusCode = 400;
    throw error;
  }

  const result = await getAttemptQuestionsService(req.params.attemptId, req.user.id);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const submitExam = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.attemptId)) {
    const error = new Error('A valid attemptId is required.');
    error.statusCode = 400;
    throw error;
  }

  const attempt = await submitExamService(req.params.attemptId, req.user.id);

  res.status(200).json({
    success: true,
    attempt,
  });
});

export const getAttemptStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.attemptId)) {
    const error = new Error('A valid attemptId is required.');
    error.statusCode = 400;
    throw error;
  }

  const attempt = await getAttemptStatusService(req.params.attemptId, req.user.id);

  res.status(200).json({
    success: true,
    attempt,
  });
});

export const getAttemptResults = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.attemptId)) {
    const error = new Error('A valid attemptId is required.');
    error.statusCode = 400;
    throw error;
  }

  const results = await getAttemptResultsService(req.params.attemptId, req.user.id);

  res.status(200).json({
    success: true,
    ...results,
  });
});

export const getMyAttempts = asyncHandler(async (req, res) => {
  const attempts = await getMyAttemptsService(req.user.id);

  res.status(200).json({
    success: true,
    attempts,
  });
});
