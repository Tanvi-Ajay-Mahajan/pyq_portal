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
};

export const isDbConfigured = () => Boolean(env.MONGODB_URI);
