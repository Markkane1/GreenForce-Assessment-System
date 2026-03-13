import asyncHandler from '../../utils/asyncHandler.js';
import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  loginUser,
  registerStudent,
  resetPassword,
} from './auth.service.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_COOKIE_NAME = 'auth_token';
const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: AUTH_COOKIE_MAX_AGE_MS,
  path: '/',
});

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

export const registerStudentHandler = asyncHandler(async (req, res) => {
  const {
    name, email, phone, password, inviteCode,
  } = req.body;

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

  if (phone !== undefined && phone !== null && typeof phone !== 'string') {
    const error = new Error('Phone must be a string.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof password !== 'string' || password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof inviteCode !== 'string' || inviteCode.trim().length === 0) {
    const error = new Error('Invite code is required.');
    error.statusCode = 400;
    throw error;
  }

  const result = await registerStudent(name, email, phone, password, inviteCode);

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
  setAuthCookie(res, result.token);

  res.status(200).json({
    success: true,
    user: result.user,
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

export const meHandler = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

export const logoutHandler = asyncHandler(async (req, res) => {
  clearAuthCookie(res);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});
