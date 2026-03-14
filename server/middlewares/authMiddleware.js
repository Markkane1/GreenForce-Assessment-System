import asyncHandler from '../utils/asyncHandler.js';
import { resolveAuthenticatedUser } from '../modules/auth/auth.service.js';

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.auth_token;

  if (!cookieToken && (!authHeader || !authHeader.startsWith('Bearer '))) {
    const error = new Error('No token provided');
    error.statusCode = 401;
    throw error;
  }

  const token = cookieToken || authHeader.split(' ')[1];
  req.user = await resolveAuthenticatedUser(token);
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  const normalizedRoles = roles.map((role) => String(role).trim().toLowerCase());
  const requestRole = req.user?.role ? String(req.user.role).trim().toLowerCase() : '';

  if (!req.user || !normalizedRoles.includes(requestRole)) {
    const error = new Error('Forbidden: insufficient permissions.');
    error.statusCode = 403;
    return next(error);
  }

  return next();
};
