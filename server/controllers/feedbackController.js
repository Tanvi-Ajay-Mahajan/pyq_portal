import Feedback from '../models/Feedback.js';
import Paper from '../models/Paper.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toFeedback } from '../utils/serialize.js';
import { MAX_COMMENT_LENGTH, MAX_RATING } from '../utils/constants.js';

async function summaryForPaper(paperId) {
  const [result] = await Feedback.aggregate([
    { $match: { paper: paperId } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return {
    average: Number((result?.average || 0).toFixed(2)),
    count: result?.count || 0,
  };
}

/** GET /api/feedback/recent?limit=6 — public "recent feedback" list. */
export const listRecentFeedback = asyncHandler(async (req, res) => {
  const requested = Number(req.query.limit);
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 50) : 6;

  const feedback = await Feedback.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('paper', 'subject_name branch year_level pattern');

  res.json(
    feedback.map((entry) => ({
      ...toFeedback(entry),
      paper: entry.paper
        ? {
            id: entry.paper._id.toString(),
            subject_name: entry.paper.subject_name,
            branch: entry.paper.branch,
            year_level: entry.paper.year_level,
            pattern: entry.paper.pattern,
          }
        : null,
    }))
  );
});

/** GET /api/feedback/mine */
export const listMyFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(feedback.map(toFeedback));
});

/** POST /api/feedback — authenticated users only. */
export const createFeedback = asyncHandler(async (req, res) => {
  const { paper_id: paperId, rating, comment } = req.body;

  const paper = await Paper.findById(paperId).select('_id');
  if (!paper) throw ApiError.notFound('Paper not found');

  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > MAX_RATING) {
    throw ApiError.badRequest(`Rating must be a whole number between 1 and ${MAX_RATING}`);
  }
  const trimmedComment = comment ? String(comment).trim().slice(0, MAX_COMMENT_LENGTH) : null;

  const feedback = await Feedback.findOneAndUpdate(
    { paper: paper._id, user: req.user._id },
    {
      $set: {
        rating: numericRating,
        comment: trimmedComment,
        user_name: req.user.name,
      },
      $setOnInsert: { paper: paper._id, user: req.user._id },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const summary = await summaryForPaper(paper._id);
  res.status(201).json({ feedback: toFeedback(feedback), ...summary });
});

/** PUT /api/feedback/:id — owner only. */
export const updateFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) throw ApiError.notFound('Feedback not found');
  if (feedback.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only edit your own feedback');
  }

  if (req.body.rating !== undefined) {
    const numericRating = Number(req.body.rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > MAX_RATING) {
      throw ApiError.badRequest(`Rating must be a whole number between 1 and ${MAX_RATING}`);
    }
    feedback.rating = numericRating;
  }
  if (req.body.comment !== undefined) {
    feedback.comment = req.body.comment
      ? String(req.body.comment).trim().slice(0, MAX_COMMENT_LENGTH)
      : null;
  }

  await feedback.save();
  const summary = await summaryForPaper(feedback.paper);
  res.json({ feedback: toFeedback(feedback), ...summary });
});

/** DELETE /api/feedback/:id — owner or admin. */
export const deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);
  if (!feedback) throw ApiError.notFound('Feedback not found');

  const isOwner = feedback.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('You can only delete your own feedback');
  }

  const paperId = feedback.paper;
  await feedback.deleteOne();
  const summary = await summaryForPaper(paperId);
  res.json({ message: 'Feedback deleted', id: req.params.id, ...summary });
});
