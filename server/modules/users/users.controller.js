import asyncHandler from '../../utils/asyncHandler.js';
import {
  createUser as createUserService,
  deleteUser as deleteUserService,
  getAllUsers as getAllUsersService,
  getUserById as getUserByIdService,
  updateUser as updateUserService,
} from './users.service.js';

export const createUser = asyncHandler(async (req, res) => {
  const user = await createUserService(req.body);

  res.status(201).json({
    success: true,
    user,
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await getAllUsersService(req.query);

  res.status(200).json({
    success: true,
    users,
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await getUserByIdService(req.params.id);

  res.status(200).json({
    success: true,
    user,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await updateUserService(req.params.id, req.body);

  res.status(200).json({
    success: true,
    user,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const result = await deleteUserService(req.params.id);

  res.status(200).json(result);
});
