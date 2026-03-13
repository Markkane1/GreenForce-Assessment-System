import asyncHandler from '../../utils/asyncHandler.js';
import { changePassword, forgotPassword, loginUser, registerUser, resetPassword } from './auth.service.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PUBLIC_ROLES = ['student', 'teacher'];

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name?.trim()) {
    const error = new Error('Name is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!EMAIL_REGEX.test(email || '')) {
    const error = new Error('A valid email address is required.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof password !== 'string' || password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  if (role !== undefined && !PUBLIC_ROLES.includes(role)) {
    const error = new Error('Role must be either student or teacher.');
    error.statusCode = 400;
    throw error;
  }

  const result = await registerUser(name, email, password, role);

  res.status(201).json({
    success: true,
    ...result,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!EMAIL_REGEX.test(email || '')) {
    const error = new Error('A valid email address is required.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof password !== 'string' || password.length === 0) {
    const error = new Error('Password is required.');
    error.statusCode = 400;
    throw error;
  }

  const result = await loginUser(email, password);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const forgotPasswordHandler = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!EMAIL_REGEX.test(email || '')) {
    const error = new Error('A valid email address is required.');
    error.statusCode = 400;
    throw error;
  }

  const result = await forgotPassword(email);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (typeof token !== 'string' || token.trim().length === 0) {
    const error = new Error('Reset token is required.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  const result = await resetPassword(token.trim(), newPassword);

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const changePasswordHandler = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    const error = new Error('Current password is required.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  const result = await changePassword(req.user.id, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    ...result,
  });
});
