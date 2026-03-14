const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_COOKIE_NAME = 'auth_token';
const CSRF_COOKIE_NAME = 'csrf_token';
const EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register-student',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/invite-codes/validate',
]);

const buildAllowedOrigins = () => {
  const configuredOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  const origins = new Set([configuredOrigin]);

  if (configuredOrigin.includes('localhost')) {
    origins.add(configuredOrigin.replace('localhost', '127.0.0.1'));
  }

  if (configuredOrigin.includes('127.0.0.1')) {
    origins.add(configuredOrigin.replace('127.0.0.1', 'localhost'));
  }

  return origins;
};

const extractOrigin = (req) => {
  const origin = req.get('origin');

  if (origin) {
    return origin;
  }

  const referer = req.get('referer');

  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const shouldEnforceCsrf = (req) => {
  if (SAFE_METHODS.has(req.method)) {
    return false;
  }

  if (EXEMPT_PATHS.has(req.originalUrl)) {
    return false;
  }

  return Boolean(req.cookies?.[AUTH_COOKIE_NAME]);
};

export const csrfProtection = (req, res, next) => {
  if (!shouldEnforceCsrf(req)) {
    return next();
  }

  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = req.get('X-CSRF-Token');
  const requestOrigin = extractOrigin(req);
  const allowedOrigins = buildAllowedOrigins();

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    const error = new Error('CSRF validation failed.');
    error.statusCode = 403;
    return next(error);
  }

  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    const error = new Error('Invalid request origin.');
    error.statusCode = 403;
    return next(error);
  }

  return next();
};

export const createCsrfToken = () => {
  return crypto.randomBytes(24).toString('hex');
};
import crypto from 'crypto';
