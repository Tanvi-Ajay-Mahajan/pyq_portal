import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchPapers, fetchStats } from '@/services/paperService';
import { fetchDriveFolders, type DriveFolder } from '@/services/driveService';
import { useEffect, useMemo, useState } from 'react';
import type { PyqPaper } from '@/types';
import { buildDriveIndex, getBranchDriveLink, mergeWithDriveBranches, type DriveIndex } from '@/lib/branchDriveLinks';
import {
  GraduationCap, Search, FileText, Download, ShieldCheck, BookOpen,
  Layers, ArrowRight, Sparkles, Users, FolderTree, Star, Folder,
} from 'lucide-react';

export default function Home() {
  const { session, role } = useAuth();
  const [paperCount, setPaperCount] = useState<number | null>(null);
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const [topPapers, setTopPapers] = useState<{ paper: PyqPaper; avg: number; count: number }[]>([]);
  const [allPapers, setAllPapers] = useState<PyqPaper[]>([]);
  const [driveIndex, setDriveIndex] = useState<DriveIndex>({ byBranch: new Map() });
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchStats()
      .then((stats) => {
        if (cancelled) return;
        setPaperCount(stats.total_papers ?? 0);
        setSubjectCount(stats.total_subjects ?? 0);
      })
      .catch(() => {
        if (cancelled) return;
        setPaperCount(0);
        setSubjectCount(0);
      });

    fetchPapers()
      .then((rows) => {
        if (cancelled) return;
        const papers = rows as (PyqPaper & { rating_average?: number; rating_count?: number })[];
        setAllPapers(papers);
        const ranked = papers
          .map((paper) => ({
            paper,
            avg: paper.rating_average ?? 0,
            count: paper.rating_count ?? 0,
          }))
          .filter((entry) => entry.count > 0)
          .sort((a, b) => b.avg - a.avg || b.count - a.count)
          .slice(0, 4);
        setTopPapers(ranked);
      })
      .catch(() => {
        if (!cancelled) setAllPapers([]);
      });

    fetchDriveFolders()
      .then((folders) => {
        if (cancelled) return;
        setDriveFolders(Array.isArray(folders) ? folders : []);
        setDriveIndex(buildDriveIndex(folders));
      })
      .catch(() => {
        if (!cancelled) {
          setDriveFolders([]);
          setDriveIndex({ byBranch: new Map() });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Count distinct branches across all papers
  useEffect(() => {
    if (allPapers.length === 0) return;
    const branches = new Set(allPapers.filter((p) => p.branch).map((p) => p.branch as string));
    setBranchCount(branches.size);
  }, [allPapers]);

  // FE and FE 2024 links come from the API (MongoDB, or the server's built-in
  // list while no database is connected) — never hardcoded in the component.
  const feFolderLink = useMemo(() => {
    const folder = driveFolders.find(
      (item) => item.year_level === 'FE' && item.kind !== 'document'
    );
    return folder?.drive_link ?? null;
  }, [driveFolders]);

  const feDocumentLink = useMemo(() => {
    const document = driveFolders.find(
      (item) => item.year_level === 'FE' && item.kind === 'document'
    );
    return document?.drive_link ?? null;
  }, [driveFolders]);

  // Only show counters that have a real value, so the site never advertises "0 papers".
  const stats = [
    { label: 'Question Papers', value: paperCount ?? 0, icon: FileText },
    { label: 'Branches', value: branchCount ?? 0, icon: Layers },
    { label: 'FE Subjects', value: subjectCount ?? 0, icon: BookOpen },
    { label: 'Year Levels', value: 4, icon: FolderTree },
  ].filter((stat) => stat.value > 0);

  const features = [
    { icon: Search, title: 'Smart Search', desc: 'Find papers by subject name, code, branch, or semester in seconds.' },
    { icon: Download, title: 'Easy Downloads', desc: 'All papers are linked via Google Drive for quick, reliable access.' },
    { icon: Star, title: 'Rate & Review', desc: 'Share star ratings and reviews to help others find the best papers.' },
    { icon: FolderTree, title: 'Organized Catalog', desc: 'Papers are categorized by scheme, branch, semester, and academic year.' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-accent-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <span className="badge bg-white/10 text-primary-100 border border-white/15 backdrop-blur mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Engineering Question Paper Archive
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
              Every previous year paper,<br />one click away.
            </h1>
            <p className="text-lg sm:text-xl text-primary-100 leading-relaxed mb-9 max-w-2xl">
              Browse and download FE, SE, TE, and BE question papers with real Google Drive links. Rate papers, read reviews, and study smarter.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/browse" className="btn-primary bg-white text-primary-700 hover:bg-primary-50 py-3 px-6 text-base">
                <Search className="w-5 h-5" /> Browse Papers
              </Link>
              {!session && (
                <Link to="/register" className="btn-secondary bg-transparent border-white/30 text-white hover:bg-white/10 py-3 px-6 text-base">
                  <GraduationCap className="w-5 h-5" /> Create Account
                </Link>
              )}
              {session && role === 'ADMIN' && (
                <Link to="/admin" className="btn-secondary bg-transparent border-white/30 text-white hover:bg-white/10 py-3 px-6 text-base">
                  <ShieldCheck className="w-5 h-5" /> Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-5 flex items-center gap-4 animate-fade-in-up">
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                <s.icon className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Everything you need to prepare</h2>
          <p className="text-slate-500 text-lg">A modern, organized portal designed for engineering exam preparation.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-slate-900 mb-1.5">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top Rated Papers */}
      {topPapers.length > 0 && (
        <section className="bg-slate-100/70 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="font-display text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                  <Star className="w-7 h-7 fill-amber-400 text-amber-400" /> Top Rated Papers
                </h2>
                <p className="text-slate-500">See what other students found most useful.</p>
              </div>
              <Link to="/browse" className="hidden sm:inline-flex btn-ghost text-primary-600 hover:text-primary-700">
                Browse all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topPapers.map(({ paper, avg, count }) => (
                <Link
                  key={paper.id}
                  to="/browse"
                  className="card p-5 flex flex-col hover:shadow-md hover:border-primary-200 transition-all group"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`w-3.5 h-3.5 ${n <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                      />
                    ))}
                    <span className="text-xs text-slate-400 ml-1">({count})</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-1">
                    {paper.subject_name || `${paper.branch} — ${paper.pattern}`}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-1">{paper.pattern} Pattern</p>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <span className="badge bg-slate-100 text-slate-600">{paper.year_level}</span>
                    {paper.branch && <span className="badge bg-blue-50 text-blue-700">{paper.branch}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse by Year */}
      
{/* Browse by Year */}
<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">

  <div className="text-center max-w-2xl mx-auto mb-10">
    <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
      Browse by Year
    </h2>
    <p className="text-slate-500 text-lg">
      Pick your year, then choose your branch. FE opens the first-year Drive folder,
      FE 2024 opens the official SPPU circular.
    </p>
  </div>

  {/* FE and FE 2024 sit at the same level; each opens its document directly */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 place-items-center max-w-2xl mx-auto">

    {([
      {
        key: 'FE',
        box: 'FE',
        full: 'First Year',
        desc: 'Opens the FE Google Drive folder',
        link: feFolderLink,
        cta: 'Open Drive folder',
        note: 'Google Drive',
        color: 'from-sky-500 to-sky-700',
        bg: 'bg-sky-50',
        text: 'text-sky-700',
      },
      {
        key: 'FE 2024',
        box: '2024',
        full: 'FE 2024',
        desc: 'Opens the official SPPU exam circular',
        link: feDocumentLink,
        cta: 'Open PDF',
        note: 'Official SPPU PDF',
        color: 'from-rose-500 to-rose-700',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
      },
    ]).map((card) => {

      const count = allPapers.filter(
        (p) => p.year_level === 'FE'
      ).length;

      const inner = (
        <>
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center mb-3 font-display font-bold text-lg shadow-sm`}
          >
            {card.box}
          </div>

          <p className="font-semibold text-slate-900 text-sm">
            {card.full}
          </p>

          <p className="text-xs text-slate-400 mt-0.5">
            {card.desc}
          </p>

          <p className="text-xs text-slate-500 font-medium mt-2">
            {card.key === 'FE' ? `${count} papers` : card.note}
          </p>

          <span className={`mt-3 badge ${card.bg} ${card.text}`}>
            {card.cta}
            <ArrowRight className="w-3 h-3" />
          </span>
        </>
      );

      // Both cards open their document directly in a new tab: no branch,
      // semester, subject or pattern step in between.
      if (card.link) {
        return (
          <a
            key={card.key}
            href={card.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${card.full} — ${card.cta}`}
            className="card p-6 w-full max-w-xs flex flex-col items-center text-center hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            {inner}
          </a>
        );
      }

      // No link stored yet: keep the previous behaviour.
      return (
        <Link
          key={card.key}
          to="/browse?year=FE"
          className="card p-6 w-full max-w-xs flex flex-col items-center text-center hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          {inner}
        </Link>
      );

    })}

  </div>
</section>

      {/* Branches showcase */}
      <section className="bg-slate-100/70 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-slate-900 mb-2">Browse by Branch</h2>
              <p className="text-slate-500">After selecting your year, pick your branch to find papers.</p>
            </div>
            <Link to="/browse" className="hidden sm:inline-flex btn-ghost text-primary-600 hover:text-primary-700">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(() => {
              const branches = mergeWithDriveBranches(
                allPapers.filter((p) => p.branch).map((p) => p.branch as string),
                driveIndex,
              );
              return branches.map((branch) => {
                const count = allPapers.filter((p) => p.branch === branch).length;
                const driveLink = getBranchDriveLink(driveIndex, branch);
                const cardInner = (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <Folder className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{branch}</p>
                      <p className="text-xs text-slate-400">
                        {count} papers{driveLink ? ' · Google Drive' : ''}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
                  </>
                );

                // Branches with a Drive folder open it directly in a new tab.
                if (driveLink) {
                  return (
                    <a
                      key={branch}
                      href={driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open ${branch} papers in Google Drive`}
                      className="card p-5 flex items-center gap-4 hover:shadow-md hover:border-primary-200 transition-all group"
                    >
                      {cardInner}
                    </a>
                  );
                }

                return (
                  <Link
                    key={branch}
                    to="/browse"
                    className="card p-5 flex items-center gap-4 hover:shadow-md hover:border-primary-200 transition-all group"
                  >
                    {cardInner}
                  </Link>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!session && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 text-white p-10 lg:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-80 h-80 bg-accent-400 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <Users className="w-10 h-10 mx-auto mb-4 text-primary-200" />
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">Ready to start studying?</h2>
              <p className="text-primary-100 text-lg mb-7 max-w-xl mx-auto">
                Create a free student account and get instant access to the full question paper archive.
              </p>
              <Link to="/register" className="btn-primary bg-white text-primary-700 hover:bg-primary-50 py-3 px-7 text-base">
                Get started for free <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
