import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { deleteUser, listUsers, updateUserRole } from '../controllers/userController.js';

const router = Router();

router.get('/', protect, adminOnly, listUsers);
router.patch(
  '/:id/role',
  protect,
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user id'),
  body('role').isString().withMessage('role is required'),
  validate,
  updateUserRole
);
router.delete(
  '/:id',
  protect,
  adminOnly,
  param('id').isMongoId().withMessage('Invalid user id'),
  validate,
  deleteUser
);

export default router;
