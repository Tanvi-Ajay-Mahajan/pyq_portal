import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { PyqFeedbackWithUser } from '@/types';
import { Star, Loader2, MessageSquare, Send, Trash2, X } from 'lucide-react';

interface PaperFeedbackProps {
  paperId: string;
  compact?: boolean;
}

export default function PaperFeedback({ paperId, compact = false }: PaperFeedbackProps) {
  const { session } = useAuth();
  const { notify } = useToast();
  const [feedback, setFeedback] = useState<PyqFeedbackWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [myFeedbackId, setMyFeedbackId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pyq_feedback')
      .select('id, paper_id, user_id, rating, comment, created_at, user:profiles(full_name)')
      .eq('paper_id', paperId)
      .order('created_at', { ascending: false });
    if (error) {
      setFeedback([]);
    } else {
      const rows = (data ?? []) as unknown as PyqFeedbackWithUser[];
      setFeedback(rows);
      if (session) {
        const mine = rows.find((f) => f.user_id === session.user.id);
        if (mine) {
          setMyRating(mine.rating);
          setMyComment(mine.comment ?? '');
          setMyFeedbackId(mine.id);
        }
      }
    }
    setLoading(false);
  }, [paperId, session]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const avgRating = feedback.length > 0 ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length : 0;

  const submit = async () => {
    if (!session) { notify('info', 'Sign in to leave feedback.'); return; }
    if (myRating === 0) { notify('error', 'Please select a star rating.'); return; }
    setSubmitting(true);
    if (myFeedbackId) {
      const { error } = await supabase
        .from('pyq_feedback')
        .update({ rating: myRating, comment: myComment.trim() || null })
        .eq('id', myFeedbackId);
      if (error) { notify('error', 'Could not update feedback.'); setSubmitting(false); return; }
      notify('success', 'Feedback updated.');
    } else {
      const { data, error } = await supabase
        .from('pyq_feedback')
        .insert({ paper_id: paperId, rating: myRating, comment: myComment.trim() || null })
        .select('id')
        .maybeSingle();
      if (error) { notify('error', 'Could not submit feedback.'); setSubmitting(false); return; }
      if (data) setMyFeedbackId(data.id);
      notify('success', 'Thanks for your feedback!');
    }
    setSubmitting(false);
    loadFeedback();
  };

  const remove = async () => {
    if (!myFeedbackId) return;
    const { error } = await supabase.from('pyq_feedback').delete().eq('id', myFeedbackId);
    if (error) { notify('error', 'Could not delete feedback.'); return; }
    setMyRating(0); setMyComment(''); setMyFeedbackId(null);
    notify('success', 'Feedback removed.');
    loadFeedback();
  };

  const StarRow = ({ value, onChange, size = 'w-5 h-5' }: { value: number; onChange?: (v: number) => void; size?: string }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star className={`${size} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
        </button>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <span className="text-xs font-semibold text-slate-700">
          {feedback.length > 0 ? avgRating.toFixed(1) : '—'}
        </span>
        <span className="text-xs text-slate-400">({feedback.length})</span>
      </div>
    );
  }

  const visibleFeedback = showAll ? feedback : feedback.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Rating summary */}
      <div className="flex items-center gap-3">
        <div className="text-3xl font-display font-bold text-slate-900">
          {feedback.length > 0 ? avgRating.toFixed(1) : '—'}
        </div>
        <div>
          <StarRow value={Math.round(avgRating)} size="w-4 h-4" />
          <p className="text-xs text-slate-400 mt-0.5">{feedback.length} review{feedback.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Submit form */}
      {session ? (
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">
            {myFeedbackId ? 'Your review' : 'Rate this paper'}
          </p>
          <StarRow value={myRating} onChange={setMyRating} />
          <div className="relative">
            <textarea
              value={myComment}
              onChange={(e) => setMyComment(e.target.value.slice(0, 500))}
              placeholder="Share your thoughts (optional)..."
              rows={2}
              className="input-field resize-none text-sm"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">{myComment.length}/500</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={submit} disabled={submitting || myRating === 0} className="btn-primary py-2 text-xs">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {myFeedbackId ? 'Update' : 'Submit'}
            </button>
            {myFeedbackId && (
              <button onClick={remove} className="btn-ghost py-2 text-xs text-error-600 hover:bg-error-50">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <MessageSquare className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs text-slate-500">Sign in to rate and review this paper.</p>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
      ) : feedback.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No reviews yet. Be the first to review!</p>
      ) : (
        <div className="space-y-3">
          {visibleFeedback.map((f) => (
            <div key={f.id} className="border border-slate-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                    {(f.user?.full_name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{f.user?.full_name || 'Anonymous'}</span>
                </div>
                <StarRow value={f.rating} size="w-3.5 h-3.5" />
              </div>
              {f.comment && <p className="text-sm text-slate-600 leading-relaxed pl-9">{f.comment}</p>}
            </div>
          ))}
          {feedback.length > 3 && (
            <button onClick={() => setShowAll((v) => !v)} className="btn-ghost w-full text-xs">
              {showAll ? 'Show less' : `Show all ${feedback.length} reviews`}
              {!showAll && <X className="w-3.5 h-3.5 rotate-45" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
