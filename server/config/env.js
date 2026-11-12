import 'dotenv/config';
import crypto from 'node:crypto';

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * JWT secret handling:
 * - Use JWT_SECRET from the environment whenever it is provided.
 * - In production a missing secret is a real configuration error, so we log it
 *   loudly and fall back to a random per-process secret (the app keeps running,
 *   existing tokens are simply invalidated on restart) instead of crash-looping.
 */
const configuredSecret = (process.env.JWT_SECRET || '').trim();
if (!configuredSecret) {
  console.warn(
    '[config] JWT_SECRET is not set. Using a temporary random secret — set JWT_SECRET to keep sessions valid across restarts.'
  );
}

const splitList = (value) =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const env = {
  NODE_ENV,
  isProduction: NODE_ENV === 'production',
  PORT: Number(process.env.PORT || 3000),
  MONGODB_URI: (process.env.MONGODB_URI || '').trim(),
  MONGODB_DB_NAME: (process.env.MONGODB_DB_NAME || '').trim() || undefined,
  JWT_SECRET: configuredSecret || crypto.randomBytes(48).toString('hex'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: Number(process.env.BCRYPT_ROUNDS || 10),
  CLIENT_ORIGINS: splitList(process.env.CLIENT_ORIGIN),
  // Used by `npm run seed` to create the first administrator account.
  ADMIN_NAME: process.env.ADMIN_NAME || 'Portal Admin',
  ADMIN_EMAIL: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  // Optional: only used by scripts/export-supabase.js for the one-time data export.
  SUPABASE_URL: (process.env.SUPABASE_URL || '').trim().replace(/\/$/, ''),
  SUPABASE_SERVICE_ROLE_KEY: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),

  // --- AI (Google Gemini) -------------------------------------------------
  // The key stays on the server: it is never sent to the browser.
  GEMINI_API_KEY: (process.env.GEMINI_API_KEY || '').trim(),
  GEMINI_MODEL: (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
  GEMINI_EMBED_MODEL: (process.env.GEMINI_EMBED_MODEL || 'text-embedding-004').trim(),
  AI_TIMEOUT_MS: Number(process.env.AI_TIMEOUT_MS || 60000),
  AI_MAX_PDF_MB: Number(process.env.AI_MAX_PDF_MB || 15),
  AI_MAX_PAGES: Number(process.env.AI_MAX_PAGES || 200),
  AI_MAX_CHUNKS: Number(process.env.AI_MAX_CHUNKS || 400),
  // OCR is opt-in: it is memory heavy and off by default on small instances.
  AI_OCR_ENABLED: process.env.AI_OCR_ENABLED === 'true',
};

export const isDbConfigured = () => Boolean(env.MONGODB_URI);

/** True when an AI provider key is present, so AI routes can answer for real. */
export const isAiConfigured = () => Boolean(env.GEMINI_API_KEY);
