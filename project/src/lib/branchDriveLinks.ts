/**
 * Google Drive folder links per branch.
 *
 * Clicking a branch anywhere in the app opens the matching Drive folder
 * directly, so students land in the shared archive instead of an empty
 * in-app paper list.
 *
 * To point a branch at a different folder (or add a new one), edit the
 * BRANCH_DRIVE_LINKS map and, if the branch has a different name in the
 * database, add the name to BRANCH_ALIASES.
 */
export const BRANCH_DRIVE_LINKS = {
  AIML: 'https://drive.google.com/drive/folders/1eIQPlauDt4SvjS7c1c3F24SuPUXLdMPB',
  CIVIL: 'https://drive.google.com/drive/folders/1U8N82pIk_Aihd9zO0ibplfKknZisTOeA',
  COMPUTER: 'https://drive.google.com/drive/folders/1wEtVRbe72SfOr479dSFlhkjMOR1h2FfH',
  ELECTRICAL: 'https://drive.google.com/drive/folders/1SIgkt4Dhovn0cakRY6vCFYHVkGGqsbjn',
} as const;

export type BranchDriveKey = keyof typeof BRANCH_DRIVE_LINKS;

/** Normalize a branch label: uppercase, letters and digits only. */
function normalize(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Every spelling/abbreviation of a branch that should open a Drive folder.
 * Keys are normalized branch labels, values are the Drive link keys.
 */
const BRANCH_ALIASES: Record<string, BranchDriveKey> = {
  // AI & Machine Learning / AI & Data Science
  AIML: 'AIML',
  AI: 'AIML',
  AIDS: 'AIML',
  AIDSAIML: 'AIML',
  AIMLDS: 'AIML',
  ARTIFICIALINTELLIGENCE: 'AIML',
  ARTIFICIALINTELLIGENCEANDMACHINELEARNING: 'AIML',
  ARTIFICIALINTELLIGENCEANDDATASCIENCE: 'AIML',

  // Civil
  CIVIL: 'CIVIL',
  CIVILENGINEERING: 'CIVIL',
  CL: 'CIVIL',

  // Computer
  CE: 'COMPUTER',
  CO: 'COMPUTER',
  COMP: 'COMPUTER',
  COMPUTER: 'COMPUTER',
  COMPUTERENGINEERING: 'COMPUTER',
  COMPUTERSCIENCE: 'COMPUTER',
  CSE: 'COMPUTER',

  // Electrical
  EE: 'ELECTRICAL',
  EEE: 'ELECTRICAL',
  ELEC: 'ELECTRICAL',
  ELECT: 'ELECTRICAL',
  ELECTRICAL: 'ELECTRICAL',
  ELECTRICALENGINEERING: 'ELECTRICAL',
};

/** Returns the Drive link key for a branch label, or null when unmapped. */
export function getBranchDriveKey(branch: string | null | undefined): BranchDriveKey | null {
  if (!branch) return null;
  return BRANCH_ALIASES[normalize(branch)] ?? null;
}

/**
 * Returns the Google Drive folder URL for a branch label, or null when the
 * branch has no Drive folder configured (the app then falls back to the
 * in-app paper list).
 */
export function getBranchDriveLink(branch: string | null | undefined): string | null {
  const key = getBranchDriveKey(branch);
  return key ? BRANCH_DRIVE_LINKS[key] : null;
}

/** True when the branch opens a Drive folder on click. */
export function hasBranchDriveLink(branch: string | null | undefined): boolean {
  return getBranchDriveLink(branch) !== null;
}

/** Opens the branch Drive folder in a new tab. Returns false when unmapped. */
export function openBranchDriveLink(branch: string | null | undefined): boolean {
  const link = getBranchDriveLink(branch);
  if (!link) return false;
  window.open(link, '_blank', 'noopener,noreferrer');
  return true;
}
