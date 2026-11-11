import mongoose from 'mongoose';
import Paper from '../models/Paper.js';
import Feedback from '../models/Feedback.js';
import Subject from '../models/Subject.js';
import Branch from '../models/Branch.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toFeedback, toPaper } from '../utils/serialize.js';
import { normalizeCategory, normalizeYearLevel } from '../utils/constants.js';

const toNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableId = (value) => {
  if (!value) return null;
  return mongoose.isValidObjectId(value) ? value : null;
};

/**
 * Builds a Paper document payload from request data. `partial` keeps PUT
 * semantics for fields that were not supplied.
 */
async function buildPaperPayload(body, { partial = false } = {}) {
  const payload = {};
  const has = (key) => body[key] !== undefined && body[key] !== null && body[key] !== '';

  if (!partial || has('year_level')) {
    const yearLevel = normalizeYearLevel(body.year_level);
    if (!yearLevel) throw ApiError.badRequest('year_level must be one of FE, SE, TE or BE');
    payload.year_level = yearLevel;
  }

  if (!partial || has('pattern')) {
    const pattern = String(body.pattern ?? '').trim();
    if (!pattern) throw ApiError.badRequest('pattern is required');
    payload.pattern = pattern;
  }

  if (!partial || has('drive_link')) {
    const driveLink = String(body.drive_link ?? '').trim();
    if (!driveLink) throw ApiError.badRequest('drive_link is required');
    payload.drive_link = driveLink;
  }

  if (!partial || body.branch !== undefined) {
    payload.branch = has('branch') ? String(body.branch).trim() : null;
  }

  if (!partial || body.subject_name !== undefined) {
    payload.subject_name = has('subject_name') ? String(body.subject_name).trim() : null;
  }

  if (!partial || body.category !== undefined) {
    const category = normalizeCategory(body.category);
    if (!category) throw ApiError.badRequest('category must be PYQ, Notes, Practical or Syllabus');
    payload.category = category;
  }

  if (!partial || body.semester !== undefined) {
    const semester = toNullableNumber(body.semester);
    if (semester !== null && (semester < 1 || semester > 8)) {
      throw ApiError.badRequest('semester must be between 1 and 8');
    }
    payload.semester = semester;
  }

  if (!partial || body.exam_year !== undefined) {
    const examYear = toNullableNumber(body.exam_year);
    if (examYear !== null && (examYear < 2000 || examYear > 2100)) {
      throw ApiError.badRequest('exam_year must be between 2000 and 2100');
    }
    payload.exam_year = examYear;
  }

  for (const key of [
    'subject',
    'branch_ref',
    'semester_ref',
    'scheme_ref',
    'academic_year_ref',
  ]) {
    if (!partial || body[key] !== undefined) {
      payload[key] = toNullableId(body[key]);
    }
  }

  // Derive readable labels from the linked reference documents when omitted.
  if (payload.subject) {
    const subject = await Subject.findById(payload.subject);
    if (!subject) throw ApiError.badRequest('The selected subject does not exist');
    if (!payload.subject_name) payload.subject_name = subject.name;
  }
  if (payload.branch_ref) {
    const branch = await Branch.findById(payload.branch_ref);
    if (!branch) throw ApiError.badRequest('The selected branch does not exist');
    if (!payload.branch) payload.branch = branch.name;
  }

  return payload;
}

/**
 * Aggregates average rating + review count for a set of papers in one query,
 * so list views can show ratings without an N+1 fan-out.
 */
async function ratingsForPapers(ids) {
  if (!ids || ids.length === 0) return {};
  const rows = await Feedback.aggregate([
    { $match: { paper: { $in: ids } } },
    {
      $group: {
        _id: '$paper',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);
  const map = {};
  for (const row of rows) {
    map[row._id.toString()] = {
      rating_average: Number(row.average.toFixed(2)),
      rating_count: row.count,
    };
  }
  return map;
}

/** GET /api/papers */
export const listPapers = asyncHandler(async (req, res) => {
  const { year_level, pattern, branch, category, semester, subject_id, q, limit } = req.query;
  const filter = {};

  if (year_level) {
    const normalized = normalizeYearLevel(year_level);
    if (!normalized) throw ApiError.badRequest('Invalid year_level filter');
    filter.year_level = normalized;
  }
  if (pattern) filter.pattern = String(pattern).trim();
  if (branch) filter.branch = new RegExp(`^${String(branch).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (category) {
    const normalized = normalizeCategory(category);
    if (!normalized) throw ApiError.badRequest('Invalid category filter');
    filter.category = normalized;
  }
  if (semester) filter.semester = toNullableNumber(semester);
  if (subject_id) {
    const subjectId = toNullableId(subject_id);
    if (!subjectId) throw ApiError.badRequest('Invalid subject_id filter');
    filter.subject = subjectId;
  }
  if (q) {
    const term = String(q).trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (term) {
      const regex = new RegExp(term, 'i');
      filter.$or = [{ subject_name: regex }, { branch: regex }, { pattern: regex }];
    }
  }

  const query = Paper.find(filter).sort({ created_at: 1, createdAt: 1 }).collation({ locale: 'en' });
  const parsedLimit = Number(limit);
  if (Number.isFinite(parsedLimit) && parsedLimit > 0) query.limit(Math.min(parsedLimit, 500));

  const papers = await query.exec();
  const ratings = await ratingsForPapers(papers.map((paper) => paper._id));
  res.json(
    papers.map((paper) => ({
      ...toPaper(paper),
      ...(ratings[paper._id.toString()] || { rating_average: 0, rating_count: 0 }),
    }))
  );
});

/** GET /api/papers/stats */
export const getStats = asyncHandler(async (_req, res) => {
  const [papers, subjects, branches, feedbackCount, ratingAgg, latest] = await Promise.all([
    Paper.countDocuments(),
    Subject.countDocuments(),
    Branch.countDocuments(),
    Feedback.countDocuments(),
    Feedback.aggregate([{ $group: { _id: null, average: { $avg: '$rating' } } }]),
    Paper.find().sort({ createdAt: -1 }).limit(5),
  ]);

  res.json({
    total_papers: papers,
    total_subjects: subjects,
    total_branches: branches,
    total_feedback: feedbackCount,
    average_rating: Number((ratingAgg[0]?.average || 0).toFixed(2)),
    recent_papers: latest.map(toPaper),
  });
});

/** GET /api/papers/:id */
export const getPaper = asyncHandler(async (req, res) => {
  const paper = await Paper.findById(req.params.id);
  if (!paper) throw ApiError.notFound('Paper not found');
  const ratings = await ratingsForPapers([paper._id]);
  res.json({
    ...toPaper(paper),
    ...(ratings[paper._id.toString()] || { rating_average: 0, rating_count: 0 }),
  });
});

/** POST /api/papers (admin) */
export const createPaper = asyncHandler(async (req, res) => {
  const payload = await buildPaperPayload(req.body);
  payload.created_by = req.user?._id || null;
  const paper = await Paper.create(payload);
  res.status(201).json(toPaper(paper));
});

/** PUT /api/papers/:id (admin) */
export const updatePaper = asyncHandler(async (req, res) => {
  const paper = await Paper.findById(req.params.id);
  if (!paper) throw ApiError.notFound('Paper not found');

  const payload = await buildPaperPayload(req.body, { partial: true });
  Object.assign(paper, payload);
  await paper.save();

  res.json(toPaper(paper));
});

/** DELETE /api/papers/:id (admin) */
export const deletePaper = asyncHandler(async (req, res) => {
  const paper = await Paper.findByIdAndDelete(req.params.id);
  if (!paper) throw ApiError.notFound('Paper not found');
  await Feedback.deleteMany({ paper: paper._id });
  res.json({ message: 'Paper deleted', id: paper._id.toString() });
});

/** GET /api/papers/:id/feedback */
export const getPaperFeedback = asyncHandler(async (req, res) => {
  const paper = await Paper.findById(req.params.id).select('_id');
  if (!paper) throw ApiError.notFound('Paper not found');

  const feedback = await Feedback.find({ paper: paper._id }).sort({ createdAt: -1 }).limit(50);
  const average =
    feedback.length > 0
      ? feedback.reduce((sum, entry) => sum + entry.rating, 0) / feedback.length
      : 0;

  res.json({
    average: Number(average.toFixed(2)),
    count: feedback.length,
    feedback: feedback.map(toFeedback),
  });
});
