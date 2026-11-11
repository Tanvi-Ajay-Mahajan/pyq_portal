import { resolveDriveFolder, type DriveFolder } from '@/services/driveService';

/**
 * Google Drive links now come from MongoDB through the REST API — nothing is
 * hardcoded in the frontend. These helpers index the folders once, pick the
 * newest pattern by default, and open the tab immediately on user interaction
 * so the browser never blocks the popup while the API call is in flight.
 */

export interface DriveIndex {
  byBranch: Map<string, DriveFolder[]>;
}

const normalize = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Pattern labels are compared as numbers when possible so 2024 > 2019 > 2015. */
const patternWeight = (pattern?: string | null) => {
  const digits = String(pattern ?? '').replace(/\D/g, '');
  const parsed = Number(digits.slice(0, 4));
  return Number.isFinite(parsed) && parsed > 1900 ? parsed : 0;
};

export function buildDriveIndex(folders: DriveFolder[]): DriveIndex {
  const byBranch = new Map<string, DriveFolder[]>();
  for (const folder of folders) {
    const key = normalize(folder.branch);
    if (!key) continue;
    const list = byBranch.get(key) ?? [];
    list.push(folder);
    byBranch.set(key, list);
  }
  return { byBranch };
}

/**
 * Resolves a branch link locally (no request) for rendering, preferring an
 * exact year match, then a branch-wide entry, then the newest pattern.
 */
export function getBranchDriveLink(
  index: DriveIndex,
  branch?: string | null,
  yearLevel?: string | null,
): string | null {
  const key = normalize(branch);
  // A year-level ('ALL') entry is not a branch link.
  if (!key || key === 'all') return null;
  const folders = index.byBranch.get(key);
  if (!folders || folders.length === 0) return null;

  const yearKey = normalize(yearLevel);
  const matchesYear = (folder: DriveFolder) =>
    normalize(folder.year_level) === yearKey && yearKey !== '';

  const ordered = [...folders].sort((a, b) => patternWeight(b.pattern) - patternWeight(a.pattern));
  const exact = ordered.find(matchesYear);
  return (exact ?? ordered[0]).drive_link;
}

/** Every branch that has a Drive folder, merged with branch names from papers. */
export function mergeWithDriveBranches(branches: string[], index: DriveIndex): string[] {
  const merged = new Set<string>();
  for (const branch of branches) {
    if (branch && normalize(branch) !== 'all') merged.add(branch);
  }
  for (const list of index.byBranch.values()) {
    for (const folder of list) {
      // 'ALL' marks a year-level link (the FE folder) and documents are single
      // files — neither is a branch, so they stay out of the branch list.
      if (!folder.branch || normalize(folder.branch) === 'all') continue;
      if (folder.kind === 'document') continue;
      merged.add(folder.branch);
    }
  }
  return Array.from(merged).sort((a, b) => a.localeCompare(b));
}

/**
 * Opens the Drive folder for a year + branch in a new tab.
 *
 * The tab is opened synchronously (inside the click handler) so popup blockers
 * allow it; it is then pointed at the URL the API returns. If the API reports
 * that no folder is configured, the tab is closed and the error is surfaced.
 */
export async function openBranchDriveLink(params: {
  branch: string;
  yearLevel?: string | null;
  pattern?: string | null;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const pendingTab = window.open('', '_blank');

  if (pendingTab) {
    pendingTab.document.write(
      '<title>Opening Google Drive…</title><body style="font-family:system-ui;padding:2rem;color:#334155">Opening Google Drive…</body>',
    );
  }

  try {
    const resolved = await resolveDriveFolder({
      branch: params.branch,
      year_level: params.yearLevel ?? undefined,
      pattern: params.pattern ?? undefined,
    });

    if (!resolved?.drive_link) {
      throw new Error('No Google Drive folder is configured for this branch yet.');
    }

    if (pendingTab) {
      pendingTab.location.replace(resolved.drive_link);
    } else {
      window.open(resolved.drive_link, '_blank', 'noopener,noreferrer');
    }
    return { ok: true, url: resolved.drive_link };
  } catch (error) {
    pendingTab?.close();
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (error as Error)?.message ||
      'Could not open the Google Drive folder.';
    return { ok: false, error: message };
  }
}
