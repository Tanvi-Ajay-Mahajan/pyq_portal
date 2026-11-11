import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** 404 for unknown API routes. */
export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/**
 * Centralized error handler: translates Mongoose/JWT/validation failures into
 * consistent JSON responses with the right HTTP status code.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let details = error.details;

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    details = Object.values(error.errors).map((issue) => ({
      field: issue.path,
      message: issue.message,
    }));
    message = details[0]?.message || 'Validation failed';
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for ${error.path}`;
  } else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue || error.keyPattern || {})[0] || 'record';
    message = `A record with that ${field} already exists`;
    details = error.keyValue;
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body must be valid JSON';
  }

  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  res.status(statusCode).json({
    error: message,
    ...(details ? { details } : {}),
    ...(env.isProduction ? {} : { stack: error.stack }),
  });
}

export default errorHandler;
