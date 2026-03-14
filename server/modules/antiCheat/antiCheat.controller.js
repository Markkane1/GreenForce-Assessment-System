import asyncHandler from '../../utils/asyncHandler.js';
import { getLogs as getLogsService, logViolation as logViolationService } from './antiCheat.service.js';

export const logViolation = asyncHandler(async (req, res) => {
  const { attemptId, eventType, metadata } = req.body;
  const result = await logViolationService(attemptId, req.user.id, eventType, metadata, req.ip);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const getLogs = asyncHandler(async (req, res) => {
  const logs = await getLogsService(req.params.attemptId, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    logs,
  });
});
