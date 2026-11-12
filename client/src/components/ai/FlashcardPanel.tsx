import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  Loader2,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import DocumentSelect from '@/components/ai/DocumentSelect';
import useAiDocuments from '@/components/ai/useAiDocuments';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api';
import {
  createFlashcards,
  deleteFlashcard,
  fetchFlashcards,
  updateFlashcard,
} from '@/services/aiService';
import type { AiFlashcard } from '@/types/ai';

/** Q&A flashcards with reveal, navigation and a revision mark. */
export default function FlashcardPanel() {
  const { notify } = useToast();
  const { documents, upload, remove, uploading, progress } = useAiDocuments();

  const [documentId, setDocumentId] = useState('');
  const [count, setCount] = useState(10);
  const [cards, setCards] = useState<AiFlashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      setCards(await fetchFlashcards());
    } catch {
      /* an empty deck is a fine starting state */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = onlyMarked ? cards.filter((card) => card.marked) : cards;
  const current = visible[Math.min(index, Math.max(visible.length - 1, 0))];

  const generate = async () => {
    if (!documentId) {
      notify('error', 'Select a PDF to build flashcards from.');
      return;
    }
    setWorking(true);
    try {
      const created = await createFlashcards({ document_id: documentId, count });
      setCards((prev) => [...created, ...prev]);
      setIndex(0);
      setRevealed(false);
      setOnlyMarked(false);
      notify('success', `${created.length} flashcards created.`);
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Flashcards could not be generated.'));
    } finally {
      setWorking(false);
    }
  };

  const toggleMark = async (card: AiFlashcard) => {
    try {
      const updated = await updateFlashcard(card.id, { marked: !card.marked });
      setCards((prev) => prev.map((item) => (item.id === card.id ? updated : item)));
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Could not update that card.'));
    }
  };

  const drop = async (card: AiFlashcard) => {
    try {
      await deleteFlashcard(card.id);
      setCards((prev) => prev.filter((item) => item.id !== card.id));
      setRevealed(false);
      setIndex((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      notify('error', apiErrorMessage(error, 'Could not delete that card.'));
    }
  };

  const step = (delta: number) => {
    if (visible.length === 0) return;
    setRevealed(false);
    setIndex((prev) => (prev + delta + visible.length) % visible.length);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className="card h-fit p-4 sm:p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Flashcard generator</h2>
        <p className="mt-1 text-xs text-slate-500">
          Question-and-answer cards from your notes, ready for revision.
        </p>

        <div className="mt-4 space-y-3">
          <DocumentSelect
            documents={documents}
            value={documentId}
            onChange={setDocumentId}
            onUpload={upload}
            onDelete={remove}
            uploading={uploading}
            progress={progress}
            label="Source PDF"
          />

          <div>
            <span className="label-field">How many cards</span>
            <div className="flex gap-2">
              {[10, 20, 30].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCount(option)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                    count === option
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="btn-primary w-full" onClick={() => void generate()} disabled={working}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            {working ? 'Creating cards…' : 'Generate flashcards'}
          </button>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span>{cards.length} cards saved</span>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={onlyMarked}
                onChange={(event) => {
                  setOnlyMarked(event.target.checked);
                  setIndex(0);
                  setRevealed(false);
                }}
              />
              Revision only
            </label>
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        {!current && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
            <Layers className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">
              {onlyMarked ? 'No cards marked for revision' : 'No flashcards yet'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {onlyMarked
                ? 'Untick “Revision only” to see the full deck.'
                : 'Pick a PDF and generate a deck to start revising.'}
            </p>
          </div>
        )}

        {current && (
          <div>
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                Card {Math.min(index, visible.length - 1) + 1} of {visible.length}
                {current.page ? ` · page ${current.page}` : ''}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={`btn-ghost px-2 py-1 ${current.marked ? 'text-amber-600' : 'text-slate-400'}`}
                  onClick={() => void toggleMark(current)}
                  aria-label={current.marked ? 'Remove revision mark' : 'Mark for revision'}
                >
                  <Star className={`h-4 w-4 ${current.marked ? 'fill-amber-400 text-amber-500' : ''}`} />
                  {current.marked ? 'Marked' : 'Mark'}
                </button>
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-slate-400 hover:text-error-600"
                  onClick={() => void drop(current)}
                  aria-label="Delete card"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-[240px] flex-col justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-5 py-6 text-center shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600">Question</p>
              <p className="mt-2 text-base font-medium text-slate-900">{current.front}</p>

              {revealed ? (
                <div className="mt-4 border-t border-dashed border-slate-300 pt-4 text-sm text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Answer</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-left sm:text-center">{current.back}</p>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-secondary mx-auto mt-5"
                  onClick={() => setRevealed(true)}
                >
                  <Eye className="h-4 w-4" /> Reveal answer
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button type="button" className="btn-secondary" onClick={() => step(-1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setRevealed(false);
                  setIndex(0);
                }}
              >
                <RotateCcw className="h-4 w-4" /> Restart
              </button>
              <button type="button" className="btn-primary" onClick={() => step(1)}>
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
