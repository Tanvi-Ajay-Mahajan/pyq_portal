import { Router } from 'express';
import { body, param } from 'express-validator';
import validate from '../middleware/validate.js';
import { adminOnly, protect } from '../middleware/auth.js';
import {
  createAcademicYear,
  createBranch,
  createScheme,
  createSubject,
  deleteAcademicYear,
  deleteBranch,
  deleteScheme,
  deleteSubject,
  getReferenceData,
  listAcademicYears,
  listBranches,
  listSchemes,
  listSemesters,
  listSubjects,
  updateBranch,
  updateScheme,
  updateSubject,
} from '../controllers/referenceController.js';

const router = Router();
const idRule = param('id').isMongoId().withMessage('Invalid id');

router.get('/', getReferenceData);

router.get('/branches', listBranches);
router.post(
  '/branches',
  protect,
  adminOnly,
  body('code').trim().isLength({ min: 1, max: 20 }).withMessage('code is required'),
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('name is required'),
  validate,
  createBranch
);
router.put('/branches/:id', protect, adminOnly, idRule, validate, updateBranch);
router.delete('/branches/:id', protect, adminOnly, idRule, validate, deleteBranch);

router.get('/schemes', listSchemes);
router.post(
  '/schemes',
  protect,
  adminOnly,
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('name is required'),
  validate,
  createScheme
);
router.put('/schemes/:id', protect, adminOnly, idRule, validate, updateScheme);
router.delete('/schemes/:id', protect, adminOnly, idRule, validate, deleteScheme);

router.get('/academic-years', listAcademicYears);
router.post(
  '/academic-years',
  protect,
  adminOnly,
  body('year').trim().isLength({ min: 4, max: 20 }).withMessage('year is required'),
  validate,
  createAcademicYear
);
router.delete('/academic-years/:id', protect, adminOnly, idRule, validate, deleteAcademicYear);

router.get('/semesters', listSemesters);

router.get('/subjects', listSubjects);
router.post(
  '/subjects',
  protect,
  adminOnly,
  body('name').trim().isLength({ min: 2, max: 160 }).withMessage('name is required'),
  body('code').trim().isLength({ min: 1, max: 30 }).withMessage('code is required'),
  body('branch_id').isMongoId().withMessage('branch_id is required'),
  body('semester_id').isMongoId().withMessage('semester_id is required'),
  body('scheme_id').isMongoId().withMessage('scheme_id is required'),
  validate,
  createSubject
);
router.put('/subjects/:id', protect, adminOnly, idRule, validate, updateSubject);
router.delete('/subjects/:id', protect, adminOnly, idRule, validate, deleteSubject);

export default router;
