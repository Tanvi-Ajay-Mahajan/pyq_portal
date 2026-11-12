import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '@/lib/api';
import {
  deleteAiDocument,
  fetchAiDocuments,
  uploadAiDocument,
} from '@/services/aiService';
import type { AiDocumentSummary } from '@/types/ai';

/**
 * Loads the signed-in student's uploaded PDFs and handles new uploads.
 * Every AI tool shares this so the document list stays consistent.
 */
export function useAiDocuments() {
  const [documents, setDocuments] = useState<AiDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDocuments(await fetchAiDocuments());
      setError(null);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Could not load your uploaded documents.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setProgress(0);
    try {
      const document = await uploadAiDocument(file, setProgress);
      setDocuments((prev) => [document, ...prev]);
      return document;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteAiDocument(id);
    setDocuments((prev) => prev.filter((document) => document.id !== id));
  }, []);

  return { documents, loading, uploading, progress, error, refresh, upload, remove };
}

export default useAiDocuments;
