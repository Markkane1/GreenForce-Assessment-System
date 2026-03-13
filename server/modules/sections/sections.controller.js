import asyncHandler from '../../utils/asyncHandler.js';
import {
  createSection as createSectionService,
  deleteSection as deleteSectionService,
  getSectionsByTest as getSectionsByTestService,
  updateSection as updateSectionService,
} from './sections.service.js';

export const createSection = asyncHandler(async (req, res) => {
  const section = await createSectionService(req.params.testId, req.body, req.user.id, req.user.role);

  res.status(201).json({
    success: true,
    section,
  });
});

export const getSectionsByTest = asyncHandler(async (req, res) => {
  const sections = await getSectionsByTestService(req.params.testId, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    sections,
  });
});

export const updateSection = asyncHandler(async (req, res) => {
  const section = await updateSectionService(req.params.id, req.body, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    section,
  });
});

export const deleteSection = asyncHandler(async (req, res) => {
  const result = await deleteSectionService(req.params.id, req.user.id, req.user.role);

  res.status(200).json(result);
});
