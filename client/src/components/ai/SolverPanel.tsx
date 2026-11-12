import { useState } from 'react';
import { ClipboardPaste, Loader2, Sparkles } from 'lucide-react';
import MarkdownAnswer from '@/components/ai/MarkdownAnswer';
import DocumentSelect from '@/components/ai/DocumentSelect';
import useAiDocuments from '@/components/ai/useAiDocuments';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api';
import { solveQuestion } from '@/services/aiService';
import type { AiMarks, AiSolveResponse } from '@/types/ai';

const MARK_OPTIONS: { marks: AiMarks; label: string; detail: string }[] = [
  { marks: 2, label: '2 marks', detail: 'Short and precise' },
  { marks: 5, label: '5 marks', detail: 'Medium with key points' },
  { marks: 10, label: '10 marks', detail: 'Detailed with example' },
];

/** University-exam style answer generator with mark-aware length. */
export default function SolverPanel() {
  const { notify } = useToast();
  const { documents, upload, remove, uploading, progress } = useAiDocuments();

  const [question, setQuestion] = useState('');
  const [marks, setMarks] = useState<AiMarks>(5);
  const [documentId, setDocumentId] = useState('');
  const [answer, setAnswer] = useState<AiSolveResponse | null>(null);
  const [solving, setSolving] = useState(false);

  const solve = async () => {
    const text = question.trim();
    if (text.length < 3) {
      notify('error', 'Type the question you want solved.');
      return;
    }
    setSolving(true);
    try {
      const result = await solveQuestion({ question: text, marks, document_id: documentId || null });
      setAnswer(result);
    } catch (error) {
      notify('error', apiErrorMessage(error, 'The answer could not be generated.'));
    } finally {
      setSolving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-4 sm:p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Question paper solver</h2>
        <p className="mt-1 text-xs text-slate-500">
          Paste a question from any PYQ paper and pick the marks to get an exam-ready answer.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label-field mb-0" htmlFor="solver-question">
                Question
              </label>
              <button
                type="button"
                className="btn-ghost px-2 py-1 text-xs"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setQuestion(text);
                  } catch {
                    notify('info', 'Clipboard access is blocked — paste with Ctrl+V instead.');
                  }
                }}
              >
                <ClipboardPaste className="h-3.5 w-3.5" /> Paste
              </button>
            </div>
            <textarea
              id="solver-question"
              rows={6}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g. Explain the working of a binary search tree with insertion and deletion operations."
              className="input-field resize-y"
            />
          </div>

          <div>
            <span className="label-field">Answer length</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {MARK_OPTIONS.map((option) => (
                <button
                  key={option.marks}
                  type="button"
                  onClick={() => setMarks(option.marks)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    marks === option.marks
                      ? 'border-primary-500 bg-primary-50 text-primary-800 ring-1 ring-primary-500/30'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-xs font-semibold">{option.label}</span>
                  <span className="block text-[10px] text-slate-500">{option.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <DocumentSelect
            documents={documents}
            value={documentId}
            onChange={setDocumentId}
            label="Base the answer on a document"
            onUpload={upload}
            onDelete={remove}
            uploading={uploading}
            progress={progress}
            hint="Optional. The solver then follows your notes and cites pages."
          />

          <button type="button" className="btn-primary w-full" onClick={() => void solve()} disabled={solving}>
            {solving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {solving ? 'Writing the answer…' : 'Solve question'}
          </button>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-slate-900">Answer</h2>
          {answer && (
            <span className="badge bg-primary-50 text-primary-700">{answer.marks} marks</span>
          )}
        </div>

        {!answer && !solving && (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">Your answer will appear here</p>
            <p className="mt-1 text-xs text-slate-500">
              Definition, explanation, key points, examples and a conclusion — sized to the marks.
            </p>
          </div>
        )}

        {solving && (
          <div className="mt-8 flex flex-col items-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
            Generating a {marks}-mark answer…
          </div>
        )}

        {answer && !solving && (
          <div className="mt-3">
            <MarkdownAnswer content={answer.answer} className="group" />
            {answer.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                {answer.citations.map((citation, index) => (
                  <span
                    key={`cite-${index}`}
                    title={citation.snippet}
                    className="badge bg-slate-100 text-slate-600"
                  >
                    {citation.page ? `p. ${citation.page}` : 'source'}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
