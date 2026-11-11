import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { isDbConnected } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createDriveFolder,
  deleteDriveFolder,
  listDriveFolders,
  resolveDriveFolder,
  updateDriveFolder,
} from '../controllers/driveController.js';

const router = Router();
const idRule = param('id').isMongoId().withMessage('Invalid drive folder id');

/**
 * Reading folders works without a database (built-in branch links), but every
 * write needs one. Answer 503 immediately instead of letting Mongoose buffer.
 */
const requireDb = (_req, _res, next) => {
  if (!isDbConnected()) {
    return next(
      ApiError.serviceUnavailable(
        'Database not configured. Set MONGODB_URI to a MongoDB connection string and restart the server.'
      )
    );
  }
  return next();
};

router.get('/resolve', resolveDriveFolder);
router.get('/', listDriveFolders);

router.post(
  '/',
  requireDb,
  protect,
  adminOnly,
  body('branch').trim().isLength({ min: 1, max: 80 }).withMessage('branch is required'),
  body('pattern').trim().isLength({ min: 1, max: 40 }).withMessage('pattern is required'),
  body('drive_link').isURL().withMessage('drive_link must be a valid URL'),
  validate,
  createDriveFolder
);

router.put('/:id', requireDb, protect, adminOnly, idRule, validate, updateDriveFolder);
router.delete('/:id', requireDb, protect, adminOnly, idRule, validate, deleteDriveFolder);

export default router;
