import asyncHandler from '../../utils/asyncHandler.js';
import { loginUser, registerUser } from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const result = await registerUser(name, email, password, role);

  res.status(201).json({
    success: true,
    ...result,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);

  res.status(200).json({
    success: true,
    ...result,
  });
});
