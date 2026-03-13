import asyncHandler from '../../utils/asyncHandler.js';
import {
  createQuestion as createQuestionService,
  deleteQuestion as deleteQuestionService,
  getQuestionsBySection as getQuestionsBySectionService,
  updateQuestion as updateQuestionService,
} from './questions.service.js';

export const createQuestion = asyncHandler(async (req, res) => {
  const question = await createQuestionService(req.params.sectionId, req.body, req.user.id, req.user.role);

  res.status(201).json({
    success: true,
    question,
  });
});

export const getQuestionsBySection = asyncHandler(async (req, res) => {
  const questions = await getQuestionsBySectionService(req.params.sectionId, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    questions,
  });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const question = await updateQuestionService(req.params.id, req.body, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    question,
  });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const result = await deleteQuestionService(req.params.id, req.user.id, req.user.role);

  res.status(200).json(result);
});
