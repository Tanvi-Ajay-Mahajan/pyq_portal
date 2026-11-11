/**
 * Built-in Google Drive folders for the four branches.
 *
 * These are the links supplied for the portal. They live on the server only
 * (never in the client bundle) and are used in two places:
 *
 *  1. `scripts/seed.js` writes them into MongoDB as branch-wide ('ALL') rows.
 *  2. `controllers/driveController.js` serves them read-only while no database
 *     is connected, so branch browsing works before MONGODB_URI is configured.
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

export default DEFAULT_BRANCH_FOLDERS;
