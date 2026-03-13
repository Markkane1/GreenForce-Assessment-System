import asyncHandler from '../../utils/asyncHandler.js';
import {
  deleteCode,
  generateBulkCodes,
  generateSingleCode,
  getCodesByGroup,
  validateCode,
} from './inviteCodes.service.js';

export const generateSingleCodeHandler = asyncHandler(async (req, res) => {
  const { groupId } = req.body;
  const inviteCode = await generateSingleCode(groupId, req.user.id);

  res.status(201).json({
    success: true,
    inviteCode,
  });
});

export const generateBulkCodesHandler = asyncHandler(async (req, res) => {
  const { groupId, count } = req.body;
  const inviteCodes = await generateBulkCodes(groupId, req.user.id, Number(count));

  res.status(201).json({
    success: true,
    inviteCodes,
  });
});

export const getCodesByGroupHandler = asyncHandler(async (req, res) => {
  const inviteCodes = await getCodesByGroup(req.params.groupId, req.user.id);

  res.status(200).json({
    success: true,
    inviteCodes,
  });
});

export const deleteCodeHandler = asyncHandler(async (req, res) => {
  const result = await deleteCode(req.params.id, req.user.id);
  res.status(200).json(result);
});

export const validateCodeHandler = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const result = await validateCode(code);

  res.status(200).json(result);
});
