import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { adminOnly, protect } from '../middleware/auth.js';
import {
  createDriveFolder,
  deleteDriveFolder,
  listDriveFolders,
  resolveDriveFolder,
  updateDriveFolder,
} from '../controllers/driveController.js';

const router = Router();
const idRule = param('id').isMongoId().withMessage('Invalid drive folder id');

router.get('/resolve', resolveDriveFolder);
router.get('/', listDriveFolders);

router.post(
  '/',
  protect,
  adminOnly,
  body('branch').trim().isLength({ min: 1, max: 80 }).withMessage('branch is required'),
  body('pattern').trim().isLength({ min: 1, max: 40 }).withMessage('pattern is required'),
  body('drive_link').isURL().withMessage('drive_link must be a valid URL'),
  validate,
  createDriveFolder
);

router.put('/:id', protect, adminOnly, idRule, validate, updateDriveFolder);
router.delete('/:id', protect, adminOnly, idRule, validate, deleteDriveFolder);

export default router;
