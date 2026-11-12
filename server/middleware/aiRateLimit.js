import { rateLimit } from 'express-rate-limit';
import { isAiConfigured, AI_NOT_CONFIGURED_MESSAGE } from '../services/ai/geminiClient.js';
import { ApiError } from '../utils/ApiError.js';

const handler = (_req, _res, next) => {
  next(
    new ApiError(429, 'You have reached the AI request limit. Please wait a while before trying again.'),
  );
};

/** Per-user limit for AI generations (chat, solve, quiz, summary, flashcards). */
export const aiGenerationLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 80,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || 'anonymous',
  handler,
});

/** Stricter per-user limit for PDF processing, which is the most expensive call. */
export const aiUploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || 'anonymous',
  handler,
});

/** Blocks AI routes with a clear message while no provider key is configured. */
export const requireAiConfigured = (_req, _res, next) => {
  if (!isAiConfigured()) {
    return next(ApiError.serviceUnavailable(AI_NOT_CONFIGURED_MESSAGE));
  }
  return next();
};
