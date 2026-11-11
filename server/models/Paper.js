import mongoose from 'mongoose';
import { CATEGORIES, YEAR_LEVELS, normalizeCategory, normalizeYearLevel } from '../utils/constants.js';

/**
 * A PYQ record. Keeps both the flat fields the portal UI already renders
 * (year_level, pattern, branch, subject_name, drive_link) and optional
 * relational references so subject-wise and reference-data navigation keeps
 * working exactly as before.
 */
const paperSchema = new mongoose.Schema(
  {
    year_level: {
      type: String,
      enum: YEAR_LEVELS,
      required: [true, 'Year level (FE/SE/TE/BE) is required'],
      index: true,
      set: (value) => normalizeYearLevel(value) || value,
    },
    pattern: { type: String, required: [true, 'Pattern is required'], trim: true, maxlength: 40, index: true },
    branch: { type: String, trim: true, maxlength: 80, default: null, index: true },
    subject_name: { type: String, trim: true, maxlength: 160, default: null },
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'PYQ',
      index: true,
      set: (value) => normalizeCategory(value) || value,
    },
    semester: { type: Number, min: 1, max: 8, default: null },
    exam_year: { type: Number, min: 2000, max: 2100, default: null },
    drive_link: {
      type: String,
      required: [true, 'Google Drive link is required'],
      trim: true,
      maxlength: 1000,
      match: [/^https?:\/\/\S+$/i, 'Drive link must be a valid http(s) URL'],
    },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    branch_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    semester_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', default: null },
    scheme_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', default: null },
    academic_year_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

paperSchema.index({ year_level: 1, pattern: 1, branch: 1 });
paperSchema.index({ subject_name: 'text', branch: 'text', pattern: 'text' });

export const Paper = mongoose.model('Paper', paperSchema);
export default Paper;
