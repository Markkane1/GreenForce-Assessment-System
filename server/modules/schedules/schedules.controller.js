import mongoose from 'mongoose';
import asyncHandler from '../../utils/asyncHandler.js';
import {
  createSchedule as createScheduleService,
  deleteSchedule as deleteScheduleService,
  getActiveAttempts as getActiveAttemptsService,
  getScheduleById as getScheduleByIdService,
  getSchedulesForStudent as getSchedulesForStudentService,
  getSchedulesForTeacher as getSchedulesForTeacherService,
  updateSchedule as updateScheduleService,
} from './schedules.service.js';

export const createSchedule = asyncHandler(async (req, res) => {
  const { testId, startTime, endTime, assignedGroups } = req.body;
  const schedule = await createScheduleService(testId, startTime, endTime, assignedGroups, req.user.id);

  res.status(201).json({
    success: true,
    schedule,
  });
});

export const getSchedules = asyncHandler(async (req, res) => {
  let schedules;

  if (req.user.role === 'teacher') {
    schedules = await getSchedulesForTeacherService(req.user.id);
  } else if (req.user.role === 'student') {
    schedules = await getSchedulesForStudentService(req.user.id);
  } else {
    const error = new Error('Schedule listing is only available to teachers and students.');
    error.statusCode = 403;
    throw error;
  }

  res.status(200).json({
    success: true,
    schedules,
  });
});

export const getScheduleById = asyncHandler(async (req, res) => {
  const schedule = await getScheduleByIdService(req.params.id, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    schedule,
  });
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const schedule = await updateScheduleService(req.params.id, req.body, req.user.id);

  res.status(200).json({
    success: true,
    schedule,
  });
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const result = await deleteScheduleService(req.params.id, req.user.id);

  res.status(200).json(result);
});

export const getActiveAttempts = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error('A valid scheduleId is required.');
    error.statusCode = 400;
    throw error;
  }

  const result = await getActiveAttemptsService(req.params.id, req.user.id, req.user.role);

  res.status(200).json({
    success: true,
    ...result,
  });
});
