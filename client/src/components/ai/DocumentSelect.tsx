import { useRef } from 'react';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { apiErrorMessage } from '@/lib/api';
import type { AiDocumentSummary } from '@/types/ai';

interface DocumentSelectProps {
  documents: AiDocumentSummary[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  hint?: string;
  allowUpload?: boolean;
  onUpload?: (file: File) => Promise<AiDocumentSummary>;
  onDelete?: (id: string) => Promise<void>;
  uploading?: boolean;
  progress?: number;
  maxMb?: number;
}

/** Select an uploaded PDF, with an inline upload + progress control. */
export default function DocumentSelect({
  documents,
  value,
  onChange,
  label = 'Study material (PDF)',
  hint,
  allowUpload = true,
  onUpload,
  onDelete,
  uploading = false,
  progress = 0,
  maxMb = 20,
}: DocumentSelectProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { notify } = useToast();
  const selected = documents.find((document) => document.id === value);

  const handleFile = async (file: File | undefined) => {
    if (!file || !onUpload) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      notify('error', 'Please choose a PDF file.');
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      notify('error', `That PDF is larger than ${maxMb} MB.`);
      return;
    }
    try {
      const uploaded = await onUpload(file);
      onChange(uploaded.id);
      notify('success', `${uploaded.filename} is ready (${uploaded.page_count} pages).`);
    } catch (error) {
      notify('error', apiErrorMessage(error, 'The PDF could not be processed.'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="label-field mb-0" htmlFor="ai-document-select">
          {label}
        </label>
        {allowUpload && onUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? `Uploading ${progress}%` : 'Upload PDF'}
            </button>
          </>
        )}
      </div>

      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-primary-500 transition-all"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
      )}

      {documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
          No PDFs yet. Upload notes, a textbook chapter or a question paper to get started
          (max {maxMb} MB).
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <select
            id="ai-document-select"
            className="input-field flex-1"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">No document — general answer</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.filename} · {document.page_count} pages
              </option>
            ))}
          </select>
          {selected && onDelete && (
            <button
              type="button"
              className="btn-ghost px-2 py-2 text-slate-400 hover:text-error-600"
              aria-label={`Delete ${selected.filename}`}
              onClick={async () => {
                try {
                  await onDelete(selected.id);
                  if (value === selected.id) onChange('');
                  notify('success', 'Document deleted.');
                } catch (error) {
                  notify('error', apiErrorMessage(error, 'Could not delete that document.'));
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {selected && (
        <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" /> {selected.page_count} pages ·{' '}
            {selected.chunk_count} passages indexed
          </span>
          {!selected.embedded && (
            <span className="badge bg-amber-50 text-amber-700">keyword search only</span>
          )}
        </p>
      )}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
