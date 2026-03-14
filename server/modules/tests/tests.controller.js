import mongoose from 'mongoose';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  createTest as createTestService,
  deleteTest as deleteTestService,
  getAllTests as getAllTestsService,
  getTestById as getTestByIdService,
  getTestWorkspace as getTestWorkspaceService,
  publishTest as publishTestService,
  updateTest as updateTestService,
} from './tests.service.js';

export const createTest = asyncHandler(async (req, res) => {
  const test = await createTestService(req.body, req.user.id);

  res.status(201).json({
    success: true,
    test,
  });
});

export const getAllTests = asyncHandler(async (req, res) => {
  const tests = await getAllTestsService(req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    tests,
  });
});

export const getTestById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error('A valid testId is required.');
    error.statusCode = 400;
    throw error;
  }

  const test = await getTestByIdService(req.params.id);

  res.status(200).json({
    success: true,
    test,
  });
});

export const getTestWorkspace = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error('A valid testId is required.');
    error.statusCode = 400;
    throw error;
  }

  const test = await getTestWorkspaceService(req.params.id);

  res.status(200).json({
    success: true,
    test,
  });
});

export const updateTest = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error('A valid testId is required.');
    error.statusCode = 400;
    throw error;
  }

  const test = await updateTestService(req.params.id, req.body, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    test,
  });
});

export const deleteTest = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error('A valid testId is required.');
    error.statusCode = 400;
    throw error;
  }

  const result = await deleteTestService(req.params.id, req.user.id, req.user.role);

  res.status(200).json(result);
});

export const publishTest = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error('A valid testId is required.');
    error.statusCode = 400;
    throw error;
  }

  const test = await publishTestService(req.params.id, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    test,
  });
});
