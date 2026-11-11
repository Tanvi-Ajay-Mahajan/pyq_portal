/**
 * Built-in Drive links for the portal.
 *
 * Two kinds of entry live here:
 *
 *  1. DEFAULT_BRANCH_FOLDERS — one Drive folder per branch (year_level 'ALL').
 *  2. DEFAULT_YEAR_FOLDERS / DEFAULT_YEAR_DOCUMENTS — year-level links that are
 *     the same for every branch. First year (FE) has its own Drive folder plus
 *     the FE 2024 exam circular PDF, so it is NOT a branch and never renders as
 *     a branch card.
 *
 * These live on the server only (never in the client bundle) and are used in two
 * places:
 *
 *  1. `scripts/seed.js` writes them into MongoDB.
 *  2. `controllers/driveController.js` serves them read-only while no database
 *     is connected, so browsing works before MONGODB_URI is configured.
 *
 * As soon as the database holds its own drive-folders records, those records
 * win — this list is only the starting point / offline fallback.
 */
const DRIVE_FOLDER_BASE = 'https://drive.google.com/drive/folders';

export const DEFAULT_BRANCH_FOLDERS = [
  {
    branch: 'AIML',
    slug: 'aiml',
    label: 'AIML — All years',
    drive_link: `${DRIVE_FOLDER_BASE}/1eIQPlauDt4SvjS7c1c3F24SuPUXLdMPB`,
  },
  {
    branch: 'Civil',
    slug: 'civil',
    label: 'Civil — All years',
    drive_link: `${DRIVE_FOLDER_BASE}/1U8N82pIk_Aihd9zO0ibplfKknZisTOeA`,
  },
  {
    branch: 'Computer',
    slug: 'computer',
    label: 'Computer — All years',
    drive_link: `${DRIVE_FOLDER_BASE}/1wEtVRbe72SfOr479dSFlhkjMOR1h2FfH`,
  },
  {
    branch: 'Electrical',
    slug: 'electrical',
    label: 'Electrical — All years',
    drive_link: `${DRIVE_FOLDER_BASE}/1SIgkt4Dhovn0cakRY6vCFYHVkGGqsbjn`,
  },
];

/**
 * Year-level Drive folders. Stored with branch 'ALL' so a click opens the
 * first-year folder directly instead of a branch folder.
 */
export const DEFAULT_YEAR_FOLDERS = [
  {
    year_level: 'FE',
    branch: 'ALL',
    pattern: '2024',
    slug: 'fe-all-branches',
    label: 'FE — First Year (all branches)',
    drive_link: `${DRIVE_FOLDER_BASE}/1Zt53Ou_TGcnPp-hkKpn6QwUpshogj0Bo`,
    kind: 'folder',
  },
];

/**
 * Standalone year documents (exam circulars and similar PDFs). Same year/branch
 * as the folder above, distinguished by `kind: 'document'`.
 */
export const DEFAULT_YEAR_DOCUMENTS = [
  {
    year_level: 'FE',
    branch: 'ALL',
    pattern: '2024',
    slug: 'fe-2024-pattern',
    label: 'FE 2024 — SPPU exam circular (PDF)',
    drive_link:
      'http://collegecirculars.unipune.ac.in/sites/examdocs/November%20%202024/F.E%20(%202024%20PATTERN%20).pdf',
    kind: 'document',
  },
];

export default DEFAULT_BRANCH_FOLDERS;
