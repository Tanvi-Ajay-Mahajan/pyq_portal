import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return null;
};

/** Requires a valid JWT and attaches the current user to req.user. */
export const protect = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid authentication token';
    throw ApiError.unauthorized(message);
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('The account for this session no longer exists');

  req.user = user;
  return next();
});

/** Restricts a route to administrators. Use after `protect`. */
export const adminOnly = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Authentication required'));
  if (req.user.role !== 'ADMIN') {
    return next(ApiError.forbidden('Administrator access is required'));
  }
  return next();
};

/** Attaches req.user when a valid token is present, but never fails. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
  } catch {
    // Ignore invalid tokens for public endpoints.
  }
  return next();
});
