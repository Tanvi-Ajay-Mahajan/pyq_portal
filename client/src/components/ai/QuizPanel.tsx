import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Trophy, XCircle } from 'lucide-react';
import DocumentSelect from '@/components/ai/DocumentSelect';
import useAiDocuments from '@/components/ai/useAiDocuments';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api';
import { createQuiz, fetchQuizzes, submitQuiz } from '@/services/aiService';
import type { AiDifficulty, AiQuiz, AiQuizResult, AiQuizSummary } from '@/types/ai';

const DIFFICULTIES: { value: AiDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

/** MCQ generator: pick a PDF, choose difficulty, answer, get scored feedback. */
export default function QuizPanel() {
  const { notify } = useToast();
  const { documents, upload, remove, uploading, progress } = useAiDocuments();

  const [documentId, setDocumentId] = useState('');
  const [difficulty, setDifficulty] = useState<AiDifficulty>('medium');
  const [count, setCount] = useState(5);
  const [quiz, setQuiz] = useState<AiQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<AiQuizResult | null>(null);
  const [history, setHistory] = useState<AiQuizSummary[]>([]);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchQuizzes());
    } catch {
      /* history is optional; generation errors are surfaced instead */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const generate = async () => {
    if (!documentId) {
      notify('error', 'Upload and select a PDF to generate a quiz from.');
      return;
    }
    setGenerating(true);
    setResult(null);
    setAnswers({});
    try {
      setQuiz(await createQuiz({ document_id: documentId, difficulty, count }));
    } catch (error) {
      notify('error', apiErrorMessage(error, 'The quiz could not be generated.'));
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const graded = await submitQuiz(
        quiz.id,
        quiz.questions.map((_, index) => (answers[index] === undefined ? -1 : answers[index])),
      );
      setResult(graded);
      void loadHistory();
    } catch (error) {
      notify('error', apiErrorMessage(error, 'The quiz could not be submitted.'));
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className="card h-fit p-4 sm:p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Quiz generator</h2>
        <p className="mt-1 text-xs text-slate-500">
          Turn your notes into an MCQ mock test with explanations.
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
            <span className="label-field">Difficulty</span>
            <div className="flex gap-2">
              {DIFFICULTIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDifficulty(option.value)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                    difficulty === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label-field">Number of questions</span>
            <div className="flex gap-2">
              {[5, 10, 15].map((option) => (
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

          <button type="button" className="btn-primary w-full" onClick={() => void generate()} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            {generating ? 'Generating quiz…' : 'Generate quiz'}
          </button>
        </div>

        {history.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recent attempts
            </p>
            <ul className="space-y-1.5">
              {history.slice(0, 5).map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between text-xs text-slate-600">
                  <span className="truncate pr-2">{attempt.title || 'Quiz'}</span>
                  <span className="badge bg-slate-100 text-slate-600">
                    {attempt.completed ? `${attempt.score}/${attempt.total}` : 'not submitted'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card p-4 sm:p-5">
        {!quiz && !generating && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
            <Trophy className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">No quiz yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Select a PDF and generate a quiz to test yourself.
            </p>
          </div>
        )}

        {generating && (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
            Reading your document and writing questions…
          </div>
        )}

        {quiz && !generating && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">{quiz.title}</h3>
                <p className="text-xs text-slate-500">
                  {quiz.total} questions · {quiz.difficulty} · {answeredCount}/{quiz.total} answered
                </p>
              </div>
              {result && (
                <span className="badge bg-emerald-50 text-emerald-700">
                  Score {result.score}/{result.total} ({result.percentage}%)
                </span>
              )}
            </div>

            <ol className="space-y-4">
              {quiz.questions.map((question, index) => {
                const graded = result?.questions[index];
                return (
                  <li key={`q-${index}`} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-800">
                      {index + 1}. {question.question}
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {question.options.map((option, optionIndex) => {
                        const selected = answers[index] === optionIndex;
                        const isCorrect = graded && graded.answer_index === optionIndex;
                        const isWrongPick = graded && selected && !graded.correct;
                        return (
                          <label
                            key={`q-${index}-o-${optionIndex}`}
                            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                              isCorrect
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                : isWrongPick
                                  ? 'border-red-300 bg-red-50 text-red-900'
                                  : selected
                                    ? 'border-primary-400 bg-primary-50 text-primary-900'
                                    : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${index}`}
                              className="mt-0.5"
                              checked={selected}
                              disabled={Boolean(result)}
                              onChange={() =>
                                setAnswers((prev) => ({ ...prev, [index]: optionIndex }))
                              }
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                    {graded && (
                      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <p className="flex items-center gap-1.5 font-medium">
                          {graded.correct ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {graded.correct ? 'Correct' : 'Incorrect'}
                          {graded.page ? ` · page ${graded.page}` : ''}
                        </p>
                        <p className="mt-1">{graded.explanation}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 flex flex-wrap gap-2">
              {!result ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void submit()}
                  disabled={submitting || answeredCount === 0}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  Submit answers
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                  }}
                >
                  <RefreshCw className="h-4 w-4" /> Retake this quiz
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={() => void generate()}>
                Generate a new quiz
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
