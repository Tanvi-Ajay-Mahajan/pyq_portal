export const YEAR_LEVELS = ['FE', 'SE', 'TE', 'BE'];
export const CATEGORIES = ['PYQ', 'Notes', 'Practical', 'Syllabus'];
export const ROLES = ['STUDENT', 'ADMIN'];
export const MAX_RATING = 5;
export const MAX_COMMENT_LENGTH = 500;

/** Accepts 'user'/'student'/'ADMIN' and returns the stored enum value. */
export function normalizeRole(role) {
  const value = String(role || '').trim().toUpperCase();
  if (value === 'ADMIN') return 'ADMIN';
  if (value === 'STUDENT' || value === 'USER') return 'STUDENT';
  return null;
}

/** Accepts 'Practicals'/'practicals'/'Practical' and returns the stored enum value. */
export function normalizeCategory(category) {
  const value = String(category || '').trim().toLowerCase();
  if (!value) return 'PYQ';
  if (value === 'pyq' || value === 'pyqs' || value === 'question paper') return 'PYQ';
  if (value === 'note' || value === 'notes') return 'Notes';
  if (value === 'practical' || value === 'practicals' || value === 'lab') return 'Practical';
  if (value === 'syllabus' || value === 'syllabi') return 'Syllabus';
  return null;
}

/** Accepts 'fe'/'S.E.' and returns 'FE' | 'SE' | 'TE' | 'BE' (or null). */
export function normalizeYearLevel(yearLevel) {
  const value = String(yearLevel || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (YEAR_LEVELS.includes(value)) return value;
  if (value === 'FY' || value === 'FIRSTYEAR') return 'FE';
  if (value === 'SY' || value === 'SECONDYEAR') return 'SE';
  if (value === 'TY' || value === 'THIRDYEAR') return 'TE';
  if (value === 'BY' || value === 'FOURTHYEAR' || value === 'FINALYEAR') return 'BE';
  return null;
}

/**
 * Branch labels are spelled differently across the seed data ('CE', 'Computer',
 * 'Computer Engineering', 'E & TC', ...). Reduce them to one comparison key so
 * Drive folder lookups stay reliable.
 */
const BRANCH_ALIASES = [
  [/electronics\s*(?:&|and)\s*computer|e\s*&\s*ce|^ece$|ecse/i, 'ece'],
  [/computer|cmpn|cmpe|^ce$|cse/i, 'computer'],
  [/information technology|^it$|inft/i, 'it'],
  [/artificial intelligence.*data science|aids|aiml|ai\s*&\s*ml|machine learning/i, 'aiml'],
  [/civil|civl/i, 'civil'],
  [/electrical(?!\s*&?\s*tele)|^elec$|^ee$/i, 'electrical'],
  [/electronics.*tele|e\s*&\s*tc|entc|etc|electronics/i, 'etc'],
  [/mechanical|mech/i, 'mechanical'],
  [/robotics|automation/i, 'robotics'],
  [/instrumentation|instru/i, 'instrumentation'],
  [/automobile|auto/i, 'automobile'],
];

export function normalizeBranchKey(branch) {
  const raw = String(branch || '').trim();
  if (!raw) return '';
  for (const [pattern, key] of BRANCH_ALIASES) {
    if (pattern.test(raw)) return key;
  }
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export const DRIVE_FOLDER_ALL_YEARS = 'ALL';
