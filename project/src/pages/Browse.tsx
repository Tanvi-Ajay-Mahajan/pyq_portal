import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import type { PyqPaper, YearLevel } from '@/types';
import PaperFeedback from '@/components/PaperFeedback';
import {
  ExternalLink, Loader2, FileText, X, ChevronRight, Home as HomeIcon,
  Star, MessageSquare, Folder, BookOpen, GraduationCap,
} from 'lucide-react';

const YEAR_LEVELS: { key: YearLevel; label: string; full: string; color: string; bg: string; text: string }[] = [
  { key: 'FE', label: 'FE', full: 'First Year Engineering', color: 'from-sky-500 to-sky-700', bg: 'bg-sky-50', text: 'text-sky-700' },
  { key: 'SE', label: 'SE', full: 'Second Year Engineering', color: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { key: 'TE', label: 'TE', full: 'Third Year Engineering', color: 'from-amber-500 to-amber-700', bg: 'bg-amber-50', text: 'text-amber-700' },
  { key: 'BE', label: 'BE', full: 'Final Year Engineering', color: 'from-rose-500 to-rose-700', bg: 'bg-rose-50', text: 'text-rose-700' },
];

type Step = 'year' | 'branch' | 'papers';

export default function Browse() {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allPapers, setAllPapers] = useState<PyqPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<YearLevel | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<PyqPaper | null>(null);
  const [ratingCounts, setRatingCounts] = useState<Record<string, { avg: number; count: number }>>({});

  // Initialize from URL params
  useEffect(() => {
    const year = searchParams.get('year') as YearLevel | null;
    const branch = searchParams.get('branch');
    if (year && ['FE', 'SE', 'TE', 'BE'].includes(year)) {
      setSelectedYear(year);
      if (branch) setSelectedBranch(branch);
    }
  }, [searchParams]);

  const loadPapers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('pyq_papers').select('*').order('created_at', { ascending: true });
    if (error) {
      setAllPapers([]);
    } else {
      setAllPapers((data ?? []) as PyqPaper[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  // Load rating summaries
  useEffect(() => {
    if (allPapers.length === 0) return;
    supabase
      .from('pyq_feedback')
      .select('paper_id, rating')
      .in('paper_id', allPapers.map((p) => p.id))
      .then(({ data: rows }) => {
        if (!rows) return;
        const map: Record<string, { avg: number; count: number }> = {};
        for (const r of rows as { paper_id: string; rating: number }[]) {
          if (!map[r.paper_id]) map[r.paper_id] = { avg: 0, count: 0 };
          map[r.paper_id].avg += r.rating;
          map[r.paper_id].count += 1;
        }
        for (const k of Object.keys(map)) map[k].avg = map[k].avg / map[k].count;
        setRatingCounts(map);
      });
  }, [allPapers]);

  const updateUrl = (year: YearLevel | null, branch: string | null) => {
    const params: Record<string, string> = {};
    if (year) params.year = year;
    if (branch) params.branch = branch;
    setSearchParams(params, { replace: true });
  };

  const selectYear = (year: YearLevel) => {
    setSelectedYear(year);
    setSelectedBranch(null);
    updateUrl(year, null);
  };

  const selectBranch = (branch: string) => {
    setSelectedBranch(branch);
    updateUrl(selectedYear, branch);
  };

  const goBackToYear = () => {
    setSelectedYear(null);
    setSelectedBranch(null);
    updateUrl(null, null);
  };

  const goBackToBranch = () => {
    setSelectedBranch(null);
    updateUrl(selectedYear, null);
  };

  // Derive available patterns and branches for the selected year
  const patternsForYear = useMemo(() => {
    if (!selectedYear) return [];
    return [...new Set(allPapers.filter((p) => p.year_level === selectedYear).map((p) => p.pattern))].sort();
  }, [allPapers, selectedYear]);

  const branchesForYear = useMemo(() => {
    if (!selectedYear) return [];
    const branches = allPapers
      .filter((p) => p.year_level === selectedYear && p.branch)
      .map((p) => p.branch as string);
    return [...new Set(branches)].sort();
  }, [allPapers, selectedYear]);

  const currentStep: Step = !selectedYear ? 'year' : selectedYear === 'FE' || (!selectedBranch && branchesForYear.length > 0) ? 'branch' : 'papers';

  // For FE: show papers directly (no branch). For SE/TE/BE: filter by branch.
  const visiblePapers = useMemo(() => {
    if (!selectedYear) return [];
    let papers = allPapers.filter((p) => p.year_level === selectedYear);
    if (selectedBranch) papers = papers.filter((p) => p.branch === selectedBranch);
    return papers;
  }, [allPapers, selectedYear, selectedBranch]);

  const yearMeta = YEAR_LEVELS.find((y) => y.key === selectedYear);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Loading papers...</p>
      </div>
    );
  }

  // ---------- STEP 1: Year selection ----------
  if (currentStep === 'year') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 animate-fade-in">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-1.5">Browse Question Papers</h1>
          <p className="text-slate-500">Select your year to get started.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {YEAR_LEVELS.map((y) => {
            const count = allPapers.filter((p) => p.year_level === y.key).length;
            return (
              <button
                key={y.key}
                onClick={() => selectYear(y.key)}
                className="card p-8 flex flex-col items-center text-center hover:shadow-lg hover:-translate-y-1 transition-all group"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${y.color} text-white flex items-center justify-center mb-4 font-display font-bold text-xl shadow-md`}>
                  {y.label}
                </div>
                <p className="font-semibold text-slate-900">{y.full}</p>
                <p className="text-xs text-slate-400 mt-1">{count} papers available</p>
                <span className={`mt-4 badge ${y.bg} ${y.text} group-hover:gap-2 transition-all`}>
                  Browse <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- STEP 2: Branch selection (SE/TE/BE) ----------
  if (currentStep === 'branch') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 animate-fade-in">
        <Breadcrumb year={selectedYear} yearMeta={yearMeta} onBackYear={goBackToYear} />

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-1.5">
            {yearMeta?.full} — Select Branch
          </h1>
          <p className="text-slate-500">Choose your branch to see available papers.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {branchesForYear.map((branch) => {
            const count = allPapers.filter((p) => p.year_level === selectedYear && p.branch === branch).length;
            return (
              <button
                key={branch}
                onClick={() => selectBranch(branch)}
                className="card p-5 flex items-center gap-4 hover:shadow-md hover:border-primary-200 transition-all group text-left"
              >
                <div className={`w-12 h-12 rounded-xl ${yearMeta?.bg ?? 'bg-primary-50'} ${yearMeta?.text ?? 'text-primary-600'} flex items-center justify-center flex-shrink-0`}>
                  <Folder className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{branch}</p>
                  <p className="text-xs text-slate-400">{count} paper{count !== 1 ? 's' : ''}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- STEP 3: Papers list ----------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 animate-fade-in">
      <Breadcrumb
        year={selectedYear}
        yearMeta={yearMeta}
        onBackYear={goBackToYear}
        branch={selectedBranch}
        onBackBranch={goBackToBranch}
      />

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-1.5">
          {selectedYear === 'FE' ? 'FE Papers' : `${selectedYear} — ${selectedBranch}`}
        </h1>
        <p className="text-slate-500">
          {selectedYear === 'FE'
            ? 'First year papers organized by subject. Click any paper to view details and leave a review.'
            : `${selectedBranch} branch papers. Click any paper to view details and leave a review.`}
        </p>
      </div>

      {visiblePapers.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-display font-bold text-slate-800 mb-1">No papers found</h3>
          <p className="text-sm text-slate-500">There are no papers for this selection yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visiblePapers.map((p) => {
            const title = p.subject_name || `${p.branch} — ${p.pattern} Pattern`;
            const rating = ratingCounts[p.id];
            return (
              <div key={p.id} className="card p-5 hover:shadow-md hover:border-primary-200 transition-all group flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                    {p.subject_name ? <BookOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{p.pattern} Pattern</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`badge ${yearMeta?.bg} ${yearMeta?.text}`}>{p.year_level}</span>
                  {p.branch && <span className="badge bg-slate-100 text-slate-600">{p.branch}</span>}
                  <span className="badge bg-accent-50 text-accent-700">{p.pattern} Pattern</span>
                </div>

                <div className="flex items-center gap-3 mb-4 text-xs">
                  {rating && rating.count > 0 ? (
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {rating.avg.toFixed(1)}
                      <span className="text-slate-400 font-normal">({rating.count})</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Star className="w-3.5 h-3.5" /> No ratings yet
                    </span>
                  )}
                  <button onClick={() => setSelectedPaper(p)} className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium">
                    <MessageSquare className="w-3.5 h-3.5" /> Details
                  </button>
                </div>

                <div className="mt-auto flex gap-2">
                  <a href={p.drive_link} target="" rel="noopener noreferrer" className="btn-primary flex-1 py-2 text-xs">
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                  <button onClick={() => setSelectedPaper(p)} className="btn-secondary py-2 text-xs">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!session && visiblePapers.length > 0 && (
        <div className="mt-8 card p-5 bg-primary-50/50 border-primary-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Want to leave reviews?</p>
            <p className="text-xs text-slate-500">Create an account to rate papers and help other students.</p>
          </div>
          <a href="/register" className="btn-primary py-2 text-xs">Register free</a>
        </div>
      )}

      {/* Paper detail + feedback modal */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedPaper(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-slate-900 truncate">
                  {selectedPaper.subject_name || `${selectedPaper.branch} — ${selectedPaper.pattern}`}
                </h3>
              </div>
              <button onClick={() => setSelectedPaper(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0 ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Year</p>
                  <p className="text-sm font-medium text-slate-800">{selectedPaper.year_level}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-0.5">Pattern</p>
                  <p className="text-sm font-medium text-slate-800">{selectedPaper.pattern}</p>
                </div>
                {selectedPaper.subject_name && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Subject</p>
                    <p className="text-sm font-medium text-slate-800">{selectedPaper.subject_name}</p>
                  </div>
                )}
                {selectedPaper.branch && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Branch</p>
                    <p className="text-sm font-medium text-slate-800">{selectedPaper.branch}</p>
                  </div>
                )}
              </div>

              <a href={selectedPaper.drive_link} target="_blank" rel="noopener noreferrer" className="btn-primary w-full py-3">
                <ExternalLink className="w-5 h-5" /> Open in Google Drive
              </a>

              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-600" /> Ratings & Reviews
                </h4>
                <PaperFeedback paperId={selectedPaper.id} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Breadcrumb component ----------
function Breadcrumb({
  year,
  yearMeta,
  onBackYear,
  branch,
  onBackBranch,
}: {
  year: YearLevel | null;
  yearMeta?: { key: string; label: string; full: string; bg: string; text: string };
  onBackYear: () => void;
  branch?: string | null;
  onBackBranch?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm mb-6">
      <button onClick={onBackYear} className="text-slate-400 hover:text-primary-600 flex items-center gap-1 transition">
        <HomeIcon className="w-3.5 h-3.5" /> Years
      </button>
      {year && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          {branch ? (
            <button onClick={onBackYear} className={`${yearMeta?.text ?? 'text-primary-600'} font-medium hover:underline`}>
              {year}
            </button>
          ) : (
            <span className={`${yearMeta?.text ?? 'text-primary-600'} font-medium`}>{year}</span>
          )}
        </>
      )}
      {branch && onBackBranch && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-primary-600 font-medium">{branch}</span>
        </>
      )}
    </div>
  );
}
