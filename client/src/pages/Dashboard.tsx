import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchPapers, fetchStats } from '@/services/paperService';
import { fetchMyFeedback } from '@/services/feedbackService';
import type { PyqPaper } from '@/types';
import {
  FileText, Search, Download, BookOpen, Layers,
  ArrowRight, TrendingUp, Clock, ShieldCheck, Sparkles, Star,
} from 'lucide-react';

const YEAR_LABELS: Record<string, { full: string; color: string }> = {
  FE: { full: 'First Year', color: 'bg-sky-50 text-sky-600' }
};

export default function Dashboard() {
  const { profile, role } = useAuth();
  const [paperCount, setPaperCount] = useState<number | null>(null);
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [recentPapers, setRecentPapers] = useState<PyqPaper[]>([]);
  const [myReviews, setMyReviews] = useState<{ id: string; rating: number; comment: string | null; paper: { subject_name: string | null; branch: string | null; year_level: string } | null }[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchStats()
      .then((stats) => {
        if (!cancelled) setPaperCount(stats.total_papers ?? 0);
      })
      .catch(() => {
        if (!cancelled) setPaperCount(0);
      });

    fetchPapers()
      .then((papers) => {
        if (cancelled) return;
        setRecentPapers([...papers].reverse().slice(0, 5));
        const branches = new Set(
          papers.filter((p) => p.branch).map((p) => p.branch as string),
        );
        setBranchCount(branches.size);
      })
      .catch(() => {
        if (!cancelled) setRecentPapers([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load my reviews if logged in
  useEffect(() => {
    if (!profile) {
      setMyReviews([]);
      return;
    }
    let cancelled = false;
    fetchMyFeedback()
      .then((rows) => {
        if (!cancelled) setMyReviews((rows as never[]).slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setMyReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const stats = [
    { label: 'Total Papers', value: paperCount ?? '—', icon: FileText, color: 'bg-primary-50 text-primary-600' },
    { label: 'Branches', value: branchCount ?? '—', icon: Layers, color: 'bg-blue-50 text-blue-600' },
    { label: 'Year Levels', value: 4, icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Patterns', value: 3, icon: TrendingUp, color: 'bg-accent-50 text-accent-600' },
  ];

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 animate-fade-in">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white p-6 lg:p-8 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-10 w-64 h-64 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className="badge bg-white/15 text-primary-100 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> {role === 'ADMIN' ? 'Admin Account' : 'Student Account'}
            </span>
            <h1 className="font-display text-2xl lg:text-3xl font-bold mb-1">Welcome back, {firstName}!</h1>
            <p className="text-primary-100 text-sm lg:text-base">Browse the archive, search for papers, and download what you need.</p>
          </div>
          <Link to="/browse" className="btn-primary bg-white text-primary-700 hover:bg-primary-50 py-2.5">
            <Search className="w-4 h-4" /> Browse Papers
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="font-display text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent papers */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" /> Recently Added
            </h2>
            <Link to="/browse" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentPapers.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No papers available yet.</p>
          ) : (
            <div className="space-y-2">
              {recentPapers.map((p) => (
                <Link key={p.id} to="/browse" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {p.subject_name || `${p.branch} — ${p.pattern} Pattern`}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {p.year_level} · {p.pattern} Pattern{p.branch ? ` · ${p.branch}` : ''}
                    </p>
                  </div>
                  <span className={`badge flex-shrink-0 ${YEAR_LABELS[p.year_level]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                    {p.year_level}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick links + my reviews */}
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" /> Quick Actions
            </h2>
            <div className="space-y-2">
              <Link to="/browse" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition group">
                <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                  <Search className="w-4 h-4 text-slate-400" /> Browse papers
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link to="/browse?year=FE" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition group">
                <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                  <Download className="w-4 h-4 text-slate-400" /> FE papers
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
              {role === 'ADMIN' && (
                <Link to="/admin" className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition group">
                  <span className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-slate-400" /> Manage papers
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
                </Link>
              )}
            </div>
          </div>

          {/* My reviews */}
          {myReviews.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" /> My Recent Reviews
              </h2>
              <div className="space-y-3">
                {myReviews.map((r) => (
                  <div key={r.id} className="border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {r.paper?.subject_name || `${r.paper?.branch} — ${r.paper?.year_level}`}
                      </span>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-slate-500 line-clamp-2">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6 bg-gradient-to-br from-accent-50 to-white border-accent-100">
            <h3 className="font-display font-bold text-slate-900 mb-1">Can't find a paper?</h3>
            <p className="text-xs text-slate-500 mb-3">If a question paper is missing, reach out to your admin to get it added.</p>
            <div className="flex items-center gap-2 text-xs text-accent-700 font-medium">
              <BookOpen className="w-4 h-4" /> Check back regularly for updates
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
