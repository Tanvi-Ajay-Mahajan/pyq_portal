import DriveFolder from '../models/DriveFolder.js';
import Paper from '../models/Paper.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toDriveFolder } from '../utils/serialize.js';
import {
  DRIVE_FOLDER_ALL_YEARS,
  normalizeBranchKey,
  normalizeYearLevel,
} from '../utils/constants.js';

/** Orders pattern labels ('2019', '2024 Pattern', 'A-2019') newest first. */
const patternRank = (pattern) => {
  const digits = String(pattern || '').match(/\d{4}/);
  if (digits) return Number(digits[0]);
  const year = String(pattern || '').match(/\d+/);
  return year ? Number(year[0]) : 0;
};

const byNewestPattern = (a, b) => patternRank(b.pattern) - patternRank(a.pattern);

/**
 * Picks the best Drive folder for a year + branch + optional pattern:
 *  1. exact year + branch + pattern
 *  2. exact year + branch, newest pattern
 *  3. branch-wide folder (year_level: 'ALL'), newest pattern
 */
function pickFolder(candidates, { yearLevel, branchKey, branchName, pattern }) {
  const aliasMatches = candidates.filter((doc) => normalizeBranchKey(doc.branch) === branchKey);
  if (aliasMatches.length === 0) return null;

  // Prefer the exact branch spelling that was requested so a near-duplicate
  // alias entry ('Computer' vs 'COMPUTER') cannot shadow the correct link.
  const wanted = String(branchName || '').trim().toLowerCase();
  const exactBranch = wanted
    ? aliasMatches.filter((doc) => String(doc.branch).trim().toLowerCase() === wanted)
    : [];
  const forBranch = exactBranch.length > 0 ? exactBranch : aliasMatches;

  if (pattern) {
    const exactPattern = forBranch.find(
      (doc) => String(doc.pattern).toLowerCase() === String(pattern).toLowerCase()
    );
    if (exactPattern) return { doc: exactPattern, match: 'exact' };
  }

  const forYear = forBranch.filter((doc) => doc.year_level === yearLevel);
  if (forYear.length > 0) {
    const [newest] = [...forYear].sort(byNewestPattern);
    return { doc: newest, match: pattern ? 'latest-pattern' : 'year' };
  }

  const branchWide = forBranch.filter((doc) => doc.year_level === DRIVE_FOLDER_ALL_YEARS);
  if (branchWide.length > 0) {
    const [newest] = [...branchWide].sort(byNewestPattern);
    return { doc: newest, match: 'branch-wide' };
  }

  const [fallback] = [...forBranch].sort(byNewestPattern);
  return fallback ? { doc: fallback, match: 'fallback' } : null;
}

/** GET /api/drive-folders/resolve?year_level=SE&branch=Computer&pattern=2019 */
export const resolveDriveFolder = asyncHandler(async (req, res) => {
  const { year_level: yearLevelInput, branch, pattern } = req.query;

  const branchName = String(branch || '').trim();
  if (!branchName) throw ApiError.badRequest('branch query parameter is required');

  const branchKey = normalizeBranchKey(branchName);
  const yearLevel = yearLevelInput ? normalizeYearLevel(yearLevelInput) : null;
  if (yearLevelInput && !yearLevel) {
    throw ApiError.badRequest('year_level must be one of FE, SE, TE or BE');
  }

  const candidates = await DriveFolder.find(
    yearLevel
      ? { $or: [{ year_level: yearLevel }, { year_level: DRIVE_FOLDER_ALL_YEARS }] }
      : {}
  );

  const picked = pickFolder(candidates, { yearLevel, branchKey, branchName, pattern });

  if (!picked) {
    // Nothing stored yet — fall back to the newest paper link for this branch.
    const paperFilter = { branch: new RegExp(`^${branchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    if (yearLevel) paperFilter.year_level = yearLevel;
    const paper = await Paper.findOne(paperFilter).sort({ createdAt: -1 }).select('drive_link subject_name');

    if (!paper) {
      throw ApiError.notFound(`No Google Drive folder is configured for the ${branchName} branch yet`);
    }

    return res.json({
      drive_link: paper.drive_link,
      branch: branchName,
      year_level: yearLevel || DRIVE_FOLDER_ALL_YEARS,
      pattern: null,
      label: paper.subject_name,
      match: 'paper-link',
    });
  }

  return res.json({
    ...toDriveFolder(picked.doc),
    branch: picked.doc.branch,
    match: picked.match,
    requested_branch: branchName,
  });
});

/** GET /api/drive-folders */
export const listDriveFolders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.year_level) {
    const normalized = normalizeYearLevel(req.query.year_level);
    filter.year_level = normalized || req.query.year_level;
  }
  if (req.query.branch) filter.branch = req.query.branch;

  const folders = await DriveFolder.find(filter).sort({ branch: 1, pattern: -1 });
  res.json(folders.map(toDriveFolder));
});

/** POST /api/drive-folders (admin) */
export const createDriveFolder = asyncHandler(async (req, res) => {
  const { branch, pattern, drive_link, label, is_default } = req.body;
  const yearLevel = req.body.year_level
    ? normalizeYearLevel(req.body.year_level) || DRIVE_FOLDER_ALL_YEARS
    : DRIVE_FOLDER_ALL_YEARS;

  const branchRaw = String(branch).trim();
  const patternRaw = String(pattern).trim();
  const branchKey = normalizeBranchKey(branchRaw);

  // Match on the branch alias key so 'Computer' and 'COMPUTER' update a single
  // row instead of creating two competing Drive folders for the same branch.
  const siblings = await DriveFolder.find({ year_level: yearLevel, pattern: patternRaw });
  const existing = siblings.find((doc) => normalizeBranchKey(doc.branch) === branchKey);
  if (existing) {
    existing.drive_link = String(drive_link).trim();
    existing.label = label ? String(label).trim() : existing.label;
    existing.is_default = Boolean(is_default);
    await existing.save();
    return res.json(toDriveFolder(existing));
  }

  const folder = await DriveFolder.create({
    year_level: yearLevel,
    branch: branchRaw,
    pattern: patternRaw,
    drive_link: String(drive_link).trim(),
    label: label ? String(label).trim() : null,
    is_default: Boolean(is_default),
  });

  return res.status(201).json(toDriveFolder(folder));
});

/** PUT /api/drive-folders/:id (admin) */
export const updateDriveFolder = asyncHandler(async (req, res) => {
  const folder = await DriveFolder.findById(req.params.id);
  if (!folder) throw ApiError.notFound('Drive folder not found');

  if (req.body.year_level !== undefined) {
    folder.year_level = normalizeYearLevel(req.body.year_level) || DRIVE_FOLDER_ALL_YEARS;
  }
  if (req.body.branch !== undefined) folder.branch = String(req.body.branch).trim();
  if (req.body.pattern !== undefined) folder.pattern = String(req.body.pattern).trim();
  if (req.body.drive_link !== undefined) folder.drive_link = String(req.body.drive_link).trim();
  if (req.body.label !== undefined) folder.label = req.body.label ? String(req.body.label).trim() : null;
  if (req.body.is_default !== undefined) folder.is_default = Boolean(req.body.is_default);

  await folder.save();
  res.json(toDriveFolder(folder));
});

/** DELETE /api/drive-folders/:id (admin) */
export const deleteDriveFolder = asyncHandler(async (req, res) => {
  const folder = await DriveFolder.findByIdAndDelete(req.params.id);
  if (!folder) throw ApiError.notFound('Drive folder not found');
  res.json({ message: 'Drive folder deleted', id: req.params.id });
});
