import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

/** Runs after express-validator chains and returns 400 with field details. */
export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((issue) => ({
    field: issue.path || issue.param,
    message: issue.msg,
  }));

  return next(ApiError.badRequest(details[0]?.message || 'Invalid request data', details));
}

export default validate;
