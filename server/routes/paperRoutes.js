import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { adminOnly, protect } from '../middleware/auth.js';
import {
  createPaper,
  deletePaper,
  getPaper,
  getPaperFeedback,
  getStats,
  listPapers,
  updatePaper,
} from '../controllers/papersController.js';

const router = Router();

const paperRules = (optional = false) => {
  const rule = (field) => (optional ? body(field).optional() : body(field));
  return [
    rule('year_level').isString().withMessage('year_level is required'),
    rule('pattern').isString().withMessage('pattern is required'),
    rule('drive_link').isString().isLength({ max: 1000 }).withMessage('drive_link is required'),
    body('semester').optional({ values: 'null' }).isInt({ min: 1, max: 8 }).withMessage('semester must be 1-8'),
    body('exam_year').optional({ values: 'null' }).isInt({ min: 2000, max: 2100 }).withMessage('exam_year must be 2000-2100'),
  ];
};

router.get('/', listPapers);
router.get('/stats', getStats);
router.get('/:id', param('id').isMongoId().withMessage('Invalid paper id'), validate, getPaper);
router.get(
  '/:id/feedback',
  param('id').isMongoId().withMessage('Invalid paper id'),
  validate,
  getPaperFeedback
);

router.post('/', protect, adminOnly, paperRules(), validate, createPaper);
router.put(
  '/:id',
  protect,
  adminOnly,
  param('id').isMongoId().withMessage('Invalid paper id'),
  paperRules(true),
  validate,
  updatePaper
);
router.delete(
  '/:id',
  protect,
  adminOnly,
  param('id').isMongoId().withMessage('Invalid paper id'),
  validate,
  deletePaper
);

export default router;
