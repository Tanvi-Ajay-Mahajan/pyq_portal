import mongoose from 'mongoose';
import { YEAR_LEVELS, DRIVE_FOLDER_ALL_YEARS } from '../utils/constants.js';

/**
 * Google Drive folder links, stored in MongoDB and resolved at click time by
 * year + branch (+ pattern). `year_level: 'ALL'` entries apply to every year,
 * which is how the four branch-wide folders (AIML, Civil, Computer, Electrical)
 * are stored.
 *
 * `branch: 'ALL'` marks a year-level entry that belongs to no single branch —
 * the FE Drive folder, for example. `kind` separates Drive folders from
 * standalone documents such as the FE 2024 exam circular PDF, so both can share
 * the same year/branch/pattern without colliding.
 */
const driveFolderSchema = new mongoose.Schema(
  {
    year_level: {
      type: String,
      enum: [...YEAR_LEVELS, DRIVE_FOLDER_ALL_YEARS],
      default: DRIVE_FOLDER_ALL_YEARS,
      index: true,
    },
    branch: { type: String, required: true, trim: true, maxlength: 80, index: true },
    pattern: { type: String, required: true, trim: true, maxlength: 40, index: true },
    drive_link: {
      type: String,
      required: [true, 'Drive link is required'],
      trim: true,
      maxlength: 1000,
      match: [/^https?:\/\/\S+$/i, 'Drive link must be a valid http(s) URL'],
    },
    label: { type: String, trim: true, maxlength: 160, default: null },
    /** 'folder' opens a Drive folder; 'document' opens a single file (PDF). */
    kind: {
      type: String,
      enum: ['folder', 'document'],
      default: 'folder',
      index: true,
    },
    is_default: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

driveFolderSchema.index(
  { year_level: 1, branch: 1, pattern: 1, kind: 1 },
  { unique: true }
);

export const DriveFolder = mongoose.model('DriveFolder', driveFolderSchema);
export default DriveFolder;
