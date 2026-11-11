import { Router } from 'express';
import { isDbConnected } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import authRoutes from './authRoutes.js';
import paperRoutes from './paperRoutes.js';
import referenceRoutes from './referenceRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';
import driveRoutes from './driveRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

/** Health check — always available so hosting can probe the app. */
router.get('/health', (_req, res) => {
  const dbConnected = isDbConnected();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
  });
});

/**
 * Everything below needs the database. Returning a clear 503 (instead of
 * crashing) keeps the UI reachable and tells you exactly what to configure.
 */
router.use((_req, _res, next) => {
  if (!isDbConnected()) {
    return next(
      ApiError.serviceUnavailable(
        'Database not configured. Set MONGODB_URI to a MongoDB connection string and restart the server.'
      )
    );
  }
  return next();
});

router.use('/auth', authRoutes);
router.use('/papers', paperRoutes);
router.use('/reference', referenceRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/drive-folders', driveRoutes);
router.use('/users', userRoutes);

export default router;
