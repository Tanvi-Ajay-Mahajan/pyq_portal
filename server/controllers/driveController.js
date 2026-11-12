import DriveFolder from '../models/DriveFolder.js';
import Paper from '../models/Paper.js';
import { isDbConnected } from '../config/db.js';
import {
  DEFAULT_BRANCH_FOLDERS,
  DEFAULT_YEAR_FOLDERS,
  DEFAULT_YEAR_DOCUMENTS,
} from '../config/defaultDriveFolders.js';
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
 * The built-in branch folders shaped like DriveFolder documents.
 *
 * Used only while no database is connected: the four branch links stay on the
 * server (never in the client bundle) and are served read-only so the branch
 * file browser works before MONGODB_URI is configured. `_id` is present so the
 * shared serializer produces a stable `id` for the client.
 */
const builtinFolders = () => [
  ...DEFAULT_BRANCH_FOLDERS.map(({ slug, ...folder }) => ({
    _id: `builtin-${slug}`,
    year_level: DRIVE_FOLDER_ALL_YEARS,
    pattern: '2024',
    kind: 'folder',
    is_default: true,
    ...folder,
  })),
  ...DEFAULT_YEAR_FOLDERS.map(({ slug, ...folder }) => ({
    _id: `builtin-${slug}`,
    is_default: true,
    kind: 'folder',
    ...folder,
  })),
  ...DEFAULT_YEAR_DOCUMENTS.map(({ slug, ...folder }) => ({
    _id: `builtin-${slug}`,
    is_default: true,
    kind: 'document',
    ...folder,
  })),
];

/**
 * Applies a Mongo-style filter to the built-in folders so the read-only
 * defaults behave like a small in-memory collection.
 */
const filterBuiltin = (filter = {}) =>
  builtinFolders().filter((folder) => {
    if (filter.year_level && folder.year_level !== filter.year_level) return false;
    if (filter.branch && folder.branch !== filter.branch) return false;
    return true;
  });

/**
 * Picks the best Drive folder for a year + branch + optional pattern:
 *  1. exact year + branch + pattern
 *  2. exact year + branch, newest pattern
 *  3. branch-wide folder (year_level: 'ALL'), newest pattern
 */
function pickFolder(candidates, { yearLevel, branchKey, branchName, pattern }) {
  const aliasMatches = candidates.filter((doc) => normalizeBranchKey(doc.branch) === branchKey);
  if (aliasMatches.length === 0) return null;

  const wanted = String(branchName || '').trim().toLowerCase();
  const wantsPattern = (doc) =>
    String(doc.pattern).toLowerCase() === String(pattern).toLowerCase();

  /** Newest pattern wins; the requested branch spelling breaks ties. */
  const best = (docs) => {
    if (!docs.length) return null;
    const exact = wanted
      ? docs.filter((doc) => String(doc.branch).trim().toLowerCase() === wanted)
      : [];
    const [newest] = [...(exact.length > 0 ? exact : docs)].sort(byNewestPattern);
    return newest;
  };

  const yearDocs = aliasMatches.filter((doc) => doc.year_level === yearLevel);
  const wideDocs = aliasMatches.filter((doc) => doc.year_level === DRIVE_FOLDER_ALL_YEARS);

  // A year-specific row always beats the branch-wide fallback, even when the
  // branch is stored under an alias spelling (the Computer branch is seeded as
  // 'CE'), because it is the more precise match for the click.
  if (pattern) {
    const exactYear = best(yearDocs.filter(wantsPattern));
    if (exactYear) return { doc: exactYear, match: 'exact' };
    const exactWide = best(wideDocs.filter(wantsPattern));
    if (exactWide) return { doc: exactWide, match: 'exact-branch-wide' };
  }

  const forYear = best(yearDocs);
  if (forYear) return { doc: forYear, match: pattern ? 'latest-pattern' : 'year' };

  const branchWide = best(wideDocs);
  if (branchWide) return { doc: branchWide, match: 'branch-wide' };

  const fallback = best(aliasMatches);
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

  if (!isDbConnected()) {
    const picked = pickFolder(builtinFolders(), { yearLevel, branchKey, branchName, pattern });
    if (!picked) {
      throw ApiError.notFound(
        `No Google Drive folder is configured for the ${branchName} branch yet`
      );
    }
    return res.json({
      ...toDriveFolder(picked.doc),
      branch: picked.doc.branch,
      match: picked.match,
      requested_branch: branchName,
      source: 'builtin',
    });
  }

  const candidates = await DriveFolder.find(
    yearLevel
      ? { $or: [{ year_level: yearLevel }, { year_level: DRIVE_FOLDER_ALL_YEARS }] }
      : {}
  );

  const picked = pickFolder(candidates, { yearLevel, branchKey, branchName, pattern });

  if (!picked) {
    // A freshly connected database has no Drive folders yet. Serve the built-in
    // defaults so branch clicks keep working until the seed script has run.
    const builtin = pickFolder(filterBuiltin(), { yearLevel, branchKey, branchName, pattern });
    if (builtin) {
      return res.json({
        ...toDriveFolder(builtin.doc),
        branch: builtin.doc.branch,
        match: builtin.match,
        requested_branch: branchName,
        source: 'builtin',
      });
    }

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

  if (!isDbConnected()) {
    return res.json(
      filterBuiltin(filter).map((folder) => ({ ...toDriveFolder(folder), source: 'builtin' }))
    );
  }

  const folders = await DriveFolder.find(filter).sort({ branch: 1, pattern: -1 });
  if (folders.length > 0) return res.json(folders.map(toDriveFolder));

  // Freshly connected database with no Drive folders stored yet — keep the
  // built-in defaults visible instead of returning an empty list.
  return res.json(
    filterBuiltin(filter).map((folder) => ({ ...toDriveFolder(folder), source: 'builtin' }))
  );
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
