import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
  createFeedback,
  deleteFeedback,
  listMyFeedback,
  listRecentFeedback,
  updateFeedback,
} from '../controllers/feedbackController.js';

const router = Router();

router.get('/recent', listRecentFeedback);
router.get('/mine', protect, listMyFeedback);

router.post(
  '/',
  protect,
  body('paper_id').isMongoId().withMessage('paper_id is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional({ values: 'null' }).isLength({ max: 500 }).withMessage('Comment must be 500 characters or fewer'),
  validate,
  createFeedback
);

router.put(
  '/:id',
  protect,
  param('id').isMongoId().withMessage('Invalid feedback id'),
  validate,
  updateFeedback
);

router.delete(
  '/:id',
  protect,
  param('id').isMongoId().withMessage('Invalid feedback id'),
  validate,
  deleteFeedback
);

export default router;
