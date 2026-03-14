import { logger } from '../utils/logger.js';

const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal server error.';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier: ${err.path}.`;
  }

  if (err.code === 11000) {
    statusCode = 400;
    message = `Duplicate field value entered for: ${Object.keys(err.keyValue || {}).join(', ')}.`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((validationError) => validationError.message)
      .join(', ');
  }

  const isOperationalError = statusCode < 500 || Boolean(err.statusCode);
  const safeMessage = process.env.NODE_ENV === 'production' && !isOperationalError
    ? 'Something went wrong'
    : message;

  const isClientError = statusCode >= 400 && statusCode < 500;

  const logPayload = {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message,
    ...(isClientError ? {} : { stack: err.stack }),
  };

  if (isClientError) {
    logger.info('Client request rejected', logPayload);
  } else {
    logger.error('Request failed', logPayload);
  }

  const response = {
    success: false,
    message: safeMessage,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorMiddleware;
