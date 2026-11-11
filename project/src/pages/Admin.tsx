import { useEffect, useState, useCallback, type FormEvent, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/context/ToastContext';
import type { PyqPaper, YearLevel } from '@/types';
import {
  FileText, Plus, Pencil, Trash2, X, Loader2, Search,
  ExternalLink, ShieldCheck, Star,
} from 'lucide-react';

type Tab = 'papers' | 'feedback';

const YEAR_OPTIONS: YearLevel[] = ['FE', 'SE', 'TE', 'BE'];
const PATTERN_OPTIONS = ['2015', '2019', '2024'];

interface PaperFormState {
  id?: string;
  year_level: YearLevel;
  pattern: string;
  branch: string;
  subject_name: string;
  drive_link: string;
}

const emptyForm: PaperFormState = {
  year_level: 'FE', pattern: '2019', branch: '', subject_name: '', drive_link: '',
};

export default function Admin() {
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>('papers');
  const [papers, setPapers] = useState<PyqPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PaperFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadPapers = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('pyq_papers')
      .select('*')
      .order('year_level', { ascending: true })
      .order('pattern', { ascending: false });
    if (error) {
      notify('error', 'Failed to load papers: ' + error.message);
      setPapers([]);
    } else {
      setPapers((rows ?? []) as PyqPaper[]);
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => { loadPapers(); }, [loadPapers]);

  const filteredPapers = papers.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.subject_name?.toLowerCase().includes(q) ?? false) ||
      (p.branch?.toLowerCase().includes(q) ?? false) ||
      p.year_level.toLowerCase().includes(q) ||
      p.pattern.toLowerCase().includes(q)
    );
  });

  const openAdd = () => { setEditing({ ...emptyForm }); setShowModal(true); };
  const openEdit = (p: PyqPaper) => {
    setEditing({
      id: p.id,
      year_level: p.year_level,
      pattern: p.pattern,
      branch: p.branch ?? '',
      subject_name: p.subject_name ?? '',
      drive_link: p.drive_link,
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSavePaper = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.drive_link) { notify('error', 'Please enter a Google Drive link.'); return; }
    if (editing.year_level !== 'FE' && !editing.branch) { notify('error', 'Branch is required for SE/TE/BE papers.'); return; }
    if (editing.year_level === 'FE' && !editing.subject_name) { notify('error', 'Subject name is required for FE papers.'); return; }

    setSaving(true);
    const payload = {
      year_level: editing.year_level,
      pattern: editing.pattern,
      branch: editing.branch.trim() || null,
      subject_name: editing.subject_name.trim() || null,
      drive_link: editing.drive_link.trim(),
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from('pyq_papers').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('pyq_papers').insert(payload));
    }
    setSaving(false);
    if (error) {
      notify('error', error.message.includes('row-level security') ? 'Permission denied. Admin access required.' : error.message);
      return;
    }
    notify('success', editing.id ? 'Paper updated successfully.' : 'Paper added successfully.');
    closeModal();
    loadPapers();
  };

  const handleDeletePaper = async (id: string) => {
    const { error } = await supabase.from('pyq_papers').delete().eq('id', id);
    if (error) {
      notify('error', error.message.includes('row-level security') ? 'Permission denied.' : error.message);
      return;
    }
    notify('success', 'Paper deleted.');
    setConfirmDelete(null);
    loadPapers();
  };

  // --- Feedback tab ---
  const [feedback, setFeedback] = useState<{ id: string; rating: number; comment: string | null; created_at: string; paper: { subject_name: string | null; branch: string | null; year_level: string } | null; user: { full_name: string } | null }[]>([]);

  useEffect(() => {
    if (tab !== 'feedback') return;
    supabase
      .from('pyq_feedback')
      .select('id, rating, comment, created_at, paper:pyq_papers(subject_name, branch, year_level), user:profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setFeedback(data as never);
      });
  }, [tab]);

  const deleteFeedback = async (id: string) => {
    const { error } = await supabase.from('pyq_feedback').delete().eq('id', id);
    if (error) { notify('error', 'Could not delete feedback.'); return; }
    notify('success', 'Feedback deleted.');
    setFeedback((prev) => prev.filter((f) => f.id !== id));
  };

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: 'papers', label: 'Question Papers', icon: FileText },
    { key: 'feedback', label: 'Feedback', icon: Star },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 animate-fade-in">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center">
          <ShieldCheck className="w-5.5 h-5.5" />
        </div>
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Manage question papers and view student feedback.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-6 mb-6 border-b border-slate-200 overflow-x-auto scrollbar-thin">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Papers tab */}
      {tab === 'papers' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by subject, branch, year..." className="input-field pl-10" />
            </div>
            <button onClick={openAdd} className="btn-primary"><Plus className="w-4.5 h-4.5" /> Add Paper</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-primary-500 animate-spin" /></div>
          ) : filteredPapers.length === 0 ? (
            <div className="card p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-4">No papers yet. Add your first question paper.</p>
              <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Paper</button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Title / Subject</th>
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3">Pattern</th>
                      <th className="px-4 py-3">Branch</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPapers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-medium text-slate-800 truncate">
                            {p.subject_name || `${p.branch} — ${p.pattern} Pattern`}
                          </p>
                          <a href={p.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-0.5">
                            <ExternalLink className="w-3 h-3" /> Drive link
                          </a>
                        </td>
                        <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-600">{p.year_level}</span></td>
                        <td className="px-4 py-3 text-slate-600">{p.pattern}</td>
                        <td className="px-4 py-3 text-slate-600">{p.branch || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 rounded-md text-slate-400 hover:text-error-600 hover:bg-error-50 transition" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback tab */}
      {tab === 'feedback' && (
        <div className="card overflow-hidden">
          {feedback.length === 0 ? (
            <div className="p-12 text-center">
              <Star className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No feedback yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Paper</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Comment</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feedback.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 text-xs">
                        {f.paper?.subject_name || f.paper?.branch || f.paper?.year_level}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{f.user?.full_name || 'Unknown'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={`w-3.5 h-3.5 ${n <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate">{f.comment || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteFeedback(f.id)} className="p-1.5 rounded-md text-slate-400 hover:text-error-600 hover:bg-error-50 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Paper modal */}
      {showModal && editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" /> {editing.id ? 'Edit Paper' : 'Add Question Paper'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSavePaper} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Year Level</label>
                  <select value={editing.year_level} onChange={(e) => setEditing({ ...editing, year_level: e.target.value as YearLevel })} className="input-field">
                    {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-field">Pattern</label>
                  <select value={editing.pattern} onChange={(e) => setEditing({ ...editing, pattern: e.target.value })} className="input-field">
                    {PATTERN_OPTIONS.map((p) => <option key={p} value={p}>{p} Pattern</option>)}
                  </select>
                </div>
              </div>

              {editing.year_level === 'FE' ? (
                <div>
                  <label className="label-field">Subject Name</label>
                  <input value={editing.subject_name} onChange={(e) => setEditing({ ...editing, subject_name: e.target.value })} className="input-field" placeholder="e.g. Engineering Mathematics I" />
                  <p className="text-xs text-slate-400 mt-1">FE papers are organized by subject, not branch.</p>
                </div>
              ) : (
                <div>
                  <label className="label-field">Branch</label>
                  <input value={editing.branch} onChange={(e) => setEditing({ ...editing, branch: e.target.value })} className="input-field" placeholder="e.g. CE, CIVIL, IT, E & TC" />
                  <p className="text-xs text-slate-400 mt-1">SE/TE/BE papers are organized by branch.</p>
                </div>
              )}

              <div>
                <label className="label-field">Google Drive Link</label>
                <input value={editing.drive_link} onChange={(e) => setEditing({ ...editing, drive_link: e.target.value })} className="input-field" placeholder="https://drive.google.com/drive/folders/..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editing.id ? 'Save changes' : 'Add paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-error-50 text-error-600 flex items-center justify-center mb-4"><Trash2 className="w-6 h-6" /></div>
            <h3 className="font-display font-bold text-slate-900 mb-1">Delete this paper?</h3>
            <p className="text-sm text-slate-500 mb-5">This action cannot be undone. The paper and its Drive link will be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDeletePaper(confirmDelete)} className="btn-danger flex-1"><Trash2 className="w-4 h-4" /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
