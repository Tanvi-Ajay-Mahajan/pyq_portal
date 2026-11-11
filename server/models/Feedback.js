import mongoose from 'mongoose';
import { MAX_COMMENT_LENGTH, MAX_RATING } from '../utils/constants.js';

const feedbackSchema = new mongoose.Schema(
  {
    paper: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user_name: { type: String, required: true, trim: true, maxlength: 80 },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [MAX_RATING, 'Rating must be between 1 and 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number between 1 and 5',
      },
    },
    comment: { type: String, trim: true, maxlength: MAX_COMMENT_LENGTH, default: null },
  },
  { timestamps: true, versionKey: false }
);

// One review per user per paper; submitting again updates the existing review.
feedbackSchema.index({ paper: 1, user: 1 }, { unique: true });

export const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
