import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('No token provided');
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is not configured.');
    error.statusCode = 500;
    throw error;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id ? String(decoded.id).trim() : '',
      role: decoded.role ? String(decoded.role).trim().toLowerCase() : '',
    };

    next();
  } catch (verifyError) {
    const error = new Error(
      verifyError.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token',
    );
    error.statusCode = 401;
    throw error;
  }
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
