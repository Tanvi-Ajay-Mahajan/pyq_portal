import { useState } from 'react';
import { BookOpen, Copy, FileText, Loader2, Sigma } from 'lucide-react';
import DocumentSelect from '@/components/ai/DocumentSelect';
import useAiDocuments from '@/components/ai/useAiDocuments';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api';
import { summarizeDocument } from '@/services/aiService';
import type { AiSummary } from '@/types/ai';

/** Turns a PDF into chapter summaries, definitions, formulas and FAQs. */
export default function SummaryPanel() {
  const { notify } = useToast();
  const { documents, upload, remove, uploading, progress } = useAiDocuments();

  const [documentId, setDocumentId] = useState('');
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [working, setWorking] = useState(false);

  const generate = async () => {
    if (!documentId) {
      notify('error', 'Select the PDF you want summarised.');
      return;
    }
    setWorking(true);
    setSummary(null);
    try {
      setSummary(await summarizeDocument(documentId));
    } catch (error) {
      notify('error', apiErrorMessage(error, 'The summary could not be generated.'));
    } finally {
      setWorking(false);
    }
  };

  const copyAll = async () => {
    if (!summary) return;
    const text = [
      summary.title,
      ...summary.chapters.map((chapter) =>
        [
          `## ${chapter.heading}`,
          chapter.summary,
          chapter.key_points.length ? `Key points:\n${chapter.key_points.map((p) => `- ${p}`).join('\n')}` : '',
          chapter.definitions.length
            ? `Definitions:\n${chapter.definitions.map((d) => `- ${d.term}: ${d.meaning}`).join('\n')}`
            : '',
          chapter.formulas.length ? `Formulas:\n${chapter.formulas.map((f) => `- ${f}`).join('\n')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      ),
      summary.exam_points.length
        ? `## Exam points\n${summary.exam_points.map((point) => `- ${point}`).join('\n')}`
        : '',
      summary.revision_notes.length
        ? `## Revision notes\n${summary.revision_notes.map((note) => `- ${note}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      notify('success', 'Summary copied to clipboard.');
    } catch {
      notify('error', 'Clipboard is blocked in this browser.');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className="card h-fit p-4 sm:p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Notes summarizer</h2>
        <p className="mt-1 text-xs text-slate-500">
          Chapter-wise summaries, definitions, formulas and likely exam questions.
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
            label="PDF to summarise"
          />
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => void generate()}
            disabled={working}
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            {working ? 'Summarising…' : 'Generate summary'}
          </button>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        {!summary && !working && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
            <FileText className="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">No summary yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Upload your unit or notes PDF and generate a revision-ready summary.
            </p>
          </div>
        )}

        {working && (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
            Reading the document and writing the summary…
          </div>
        )}

        {summary && !working && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">{summary.title}</h3>
                <p className="text-xs text-slate-500">{summary.filename}</p>
              </div>
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => void copyAll()}>
                <Copy className="h-3.5 w-3.5" /> Copy all
              </button>
            </div>

            {summary.chapters.map((chapter, index) => (
              <article key={`chapter-${index}`} className="rounded-xl border border-slate-200 p-3">
                <h4 className="text-sm font-semibold text-slate-900">{chapter.heading}</h4>
                {chapter.summary && <p className="mt-1 text-sm text-slate-600">{chapter.summary}</p>}
                {chapter.key_points.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600 marker:text-primary-400">
                    {chapter.key_points.map((point, pointIndex) => (
                      <li key={`kp-${index}-${pointIndex}`}>{point}</li>
                    ))}
                  </ul>
                )}
                {chapter.definitions.length > 0 && (
                  <dl className="mt-2 space-y-1 text-xs">
                    {chapter.definitions.map((definition, definitionIndex) => (
                      <div key={`def-${index}-${definitionIndex}`} className="rounded-lg bg-slate-50 px-2 py-1.5">
                        <dt className="font-semibold text-slate-800">{definition.term}</dt>
                        <dd className="text-slate-600">{definition.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {chapter.formulas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {chapter.formulas.map((formula, formulaIndex) => (
                      <span
                        key={`f-${index}-${formulaIndex}`}
                        className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 font-mono text-[11px] text-primary-800"
                      >
                        <Sigma className="h-3 w-3" /> {formula}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}

            {summary.exam_points.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <h4 className="text-sm font-semibold text-emerald-900">Important exam points</h4>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-emerald-900/90">
                  {summary.exam_points.map((point, index) => (
                    <li key={`exam-${index}`}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.revision_notes.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="text-sm font-semibold text-slate-800">Quick revision</h4>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-slate-600">
                  {summary.revision_notes.map((note, index) => (
                    <li key={`rev-${index}`}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.faqs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-800">Frequently asked questions</h4>
                {summary.faqs.map((faq, index) => (
                  <details
                    key={`faq-${index}`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <summary className="cursor-pointer font-medium text-slate-800">
                      {faq.question}
                    </summary>
                    <p className="mt-1.5 text-slate-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
