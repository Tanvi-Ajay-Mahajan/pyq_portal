import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  FolderOpen,
  HardHat,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { fetchDriveFolders, type DriveFolder } from '@/services/driveService';
import { buildDriveIndex, getBranchDriveLink } from '@/lib/branchDriveLinks';

/**
 * Branch file browser.
 *
 * Every branch is a plain <a href> pointing at the Google Drive folder returned
 * by the API, so a single click opens Drive in a new tab with no popup blocking
 * and no JavaScript round-trip in the way. The URL is never hardcoded here: it
 * comes from MongoDB (`/api/drive-folders`) or, while no database is connected,
 * from the server's built-in branch list.
 */

const YEAR_TABS = [
  { value: 'ALL', label: 'All years', hint: 'Whole branch folder' },
  { value: 'FE', label: 'FE', hint: 'First Year' },
  { value: 'SE', label: 'SE', hint: 'Second Year' },
  { value: 'TE', label: 'TE', hint: 'Third Year' },
  { value: 'BE', label: 'BE', hint: 'Final Year' },
] as const;

type YearTab = (typeof YEAR_TABS)[number]['value'];

const BRANCH_META: Record<string, { description: string; icon: typeof FolderOpen; accent: string }> = {
  aiml: {
    description: 'Artificial Intelligence & Machine Learning',
    icon: Zap,
    accent: 'from-violet-500 to-purple-600',
  },
  civil: {
    description: 'Civil Engineering',
    icon: HardHat,
    accent: 'from-amber-500 to-orange-600',
  },
  computer: {
    description: 'Computer Engineering',
    icon: BookOpen,
    accent: 'from-sky-500 to-blue-600',
  },
  electrical: {
    description: 'Electrical Engineering',
    icon: Zap,
    accent: 'from-emerald-500 to-teal-600',
  },
};

const normalizeKey = (value?: string | null) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Splits 'FE 2024 — Exam circular' into a card title and a note. */
const splitLabel = (label: string | null | undefined, title: string, note: string) => {
  const parts = String(label ?? '').split('\u2014');
  return {
    title: parts[0]?.trim() || title,
    note: parts.slice(1).join('\u2014').trim() || note,
  };
};

interface BranchEntry {
  key: string;
  name: string;
  description: string;
  driveLink: string | null;
  years: string[];
  builtin: boolean;
}

export default function Branches() {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<YearTab>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDriveFolders();
      setFolders(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Could not load the branch folders.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const index = useMemo(() => buildDriveIndex(folders), [folders]);

  const branches = useMemo<BranchEntry[]>(() => {
    const entries = new Map<string, BranchEntry>();

    for (const list of index.byBranch.values()) {
      for (const folder of list) {
        const key = normalizeKey(folder.branch);
        // Year-level links (branch 'ALL') and standalone documents belong to the
        // first-year section, never to a branch card.
        if (!key || key === 'all' || folder.kind === 'document' || entries.has(key)) continue;

        const meta = BRANCH_META[key];
        const years = list
          .filter((item) => normalizeKey(item.branch) === key)
          .map((item) => String(item.year_level ?? '').toUpperCase())
          .filter((level) => ['FE', 'SE', 'TE', 'BE'].includes(level));

        entries.set(key, {
          key,
          name: folder.branch,
          description: meta?.description ?? 'Engineering branch',
          driveLink: getBranchDriveLink(index, folder.branch, year === 'ALL' ? undefined : year),
          years: Array.from(new Set(years)),
          builtin: folder.source === 'builtin',
        });
      }
    }

    return Array.from(entries.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [index, year]);

  const yearResources = useMemo(() => {
    const yearFolders = folders.filter(
      (folder) => folder.kind !== 'document' && normalizeKey(folder.branch) === 'all'
    );
    const documents = folders.filter((folder) => folder.kind === 'document');
    return { yearFolders, documents };
  }, [folders]);

  const usesBuiltinLinks = folders.some((folder) => folder.source === 'builtin');
  const activeYear = YEAR_TABS.find((tab) => tab.value === year);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white mb-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to papers
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
            File browser by branch
          </h1>
          <p className="text-slate-300 max-w-2xl">
            Pick your branch and the Google Drive folder opens in a new tab with every paper,
            note, practical and syllabus file for that branch.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Year selector */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Year level">
            {YEAR_TABS.map((tab) => {
              const selected = tab.value === year;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setYear(tab.value)}
                  title={tab.hint}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    selected
                      ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Showing the{' '}
            <span className="font-medium text-slate-700">
              {year === 'ALL' ? 'whole branch folder' : `${activeYear?.hint} folder`}
            </span>{' '}
            for each branch. Each folder opens directly in Google Drive.
          </p>
        </div>

        {/* First year is shared by every branch, so it gets year-level links. */}
        {!loading &&
          !error &&
          (yearResources.yearFolders.length > 0 || yearResources.documents.length > 0) && (
            <div className="mb-10">
              <h2 className="font-display text-xl font-bold text-slate-900">First year (FE)</h2>
              <p className="mt-1 mb-4 text-sm text-slate-500">
                First-year material is the same for every branch, so it has its own links instead
                of a branch card.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {yearResources.yearFolders.map((folder) => {
                  const card = splitLabel(folder.label, 'FE', 'First year \u2014 all branches');
                  return (
                    <a
                      key={folder.id}
                      href={folder.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card p-5 group hover:shadow-lg hover:-translate-y-0.5 transition-all border border-slate-200 hover:border-primary-300"
                      aria-label={`Open the ${card.title} Google Drive folder in a new tab`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
                          <FolderOpen className="h-5 w-5" />
                        </span>
                        <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-primary-600 transition-colors" />
                      </div>
                      <p className="font-semibold text-slate-900 text-lg leading-tight">
                        {card.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 min-h-[2rem]">{card.note}</p>
                      <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary-700 group-hover:text-primary-800">
                        <FolderOpen className="h-4 w-4" />
                        Open Drive folder
                      </span>
                    </a>
                  );
                })}

                {yearResources.documents.map((doc) => {
                  const card = splitLabel(doc.label, 'FE 2024', 'Exam circular (PDF)');
                  return (
                    <a
                      key={doc.id}
                      href={doc.drive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card p-5 group hover:shadow-lg hover:-translate-y-0.5 transition-all border border-slate-200 hover:border-primary-300"
                      aria-label={`Open ${card.title} in a new tab`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-sm">
                          <FileText className="h-5 w-5" />
                        </span>
                        <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-primary-600 transition-colors" />
                      </div>
                      <p className="font-semibold text-slate-900 text-lg leading-tight">
                        {card.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 min-h-[2rem]">{card.note}</p>
                      <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary-700 group-hover:text-primary-800">
                        <FileText className="h-4 w-4" />
                        Open PDF
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading branch folders…
          </div>
        )}

        {!loading && error && (
          <div className="card p-6 border-red-200 bg-red-50 max-w-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Branch folders could not be loaded</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button type="button" onClick={() => void load()} className="btn-secondary mt-4">
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && branches.length === 0 && (
          <div className="card p-10 text-center max-w-2xl mx-auto">
            <FolderOpen className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <p className="font-medium text-slate-800">No branch folders are configured yet</p>
            <p className="text-sm text-slate-500 mt-1">
              An admin can add a Drive link per branch from the admin dashboard.
            </p>
          </div>
        )}

        {!loading && !error && branches.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {branches.map((branch) => {
              const meta = BRANCH_META[branch.key];
              const Icon = meta?.icon ?? FolderOpen;
              const accent = meta?.accent ?? 'from-slate-500 to-slate-700';

              if (!branch.driveLink) {
                return (
                  <div
                    key={branch.key}
                    className="card p-5 opacity-70 cursor-not-allowed"
                    aria-disabled="true"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="grid place-items-center h-11 w-11 rounded-xl bg-slate-100 text-slate-500">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-800">{branch.name}</p>
                        <p className="text-xs text-slate-500">{branch.description}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">
                      No Drive link for this branch and year yet.
                    </p>
                  </div>
                );
              }

              return (
                <a
                  key={branch.key}
                  href={branch.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card p-5 group hover:shadow-lg hover:-translate-y-0.5 transition-all border border-slate-200 hover:border-primary-300"
                  aria-label={`Open the ${branch.name} Google Drive folder in a new tab`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span
                      className={`grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-primary-600 transition-colors" />
                  </div>

                  <p className="font-semibold text-slate-900 text-lg leading-tight">
                    {branch.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 min-h-[2rem]">{branch.description}</p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(branch.years.length > 0 ? branch.years : ['ALL']).map((level) => (
                      <span
                        key={level}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-600"
                      >
                        {level === 'ALL' ? 'All years' : level}
                      </span>
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary-700 group-hover:text-primary-800">
                    <FolderOpen className="h-4 w-4" />
                    Open Drive folder
                  </span>
                </a>
              );
            })}
          </div>
        )}

        {usesBuiltinLinks && !loading && !error && (
          <p className="mt-8 text-xs text-slate-500">
            These links come from the portal&apos;s built-in branch and first-year list. Connect a
            MongoDB database and they are served from the database instead, where an admin can edit
            them.
          </p>
        )}
      </section>
    </div>
  );
}
