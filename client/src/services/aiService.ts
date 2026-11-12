import api from '@/lib/api';
import type {
  AiConversation,
  AiDifficulty,
  AiDocumentSummary,
  AiFlashcard,
  AiMarks,
  AiMessage,
  AiQuiz,
  AiQuizResult,
  AiQuizSummary,
  AiSolveResponse,
  AiStatus,
  AiSummary,
} from '@/types/ai';

/**
 * Axios wrappers for the AI REST API. The Gemini key never appears here: all
 * provider calls happen on the server.
 */

/** Generation calls can legitimately take a while on long documents. */
const GENERATION_TIMEOUT = 120000;

export async function fetchAiStatus(): Promise<AiStatus> {
  const { data } = await api.get<AiStatus>('/ai/status');
  return data;
}

/* ------------------------------------------------------------- documents */

export async function fetchAiDocuments(): Promise<AiDocumentSummary[]> {
  const { data } = await api.get<{ documents: AiDocumentSummary[] }>('/ai/documents');
  return data.documents;
}

export async function uploadAiDocument(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<AiDocumentSummary> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<{ document: AiDocumentSummary }>('/ai/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: GENERATION_TIMEOUT,
    onUploadProgress: (event) => {
      if (!onProgress) return;
      const total = event.total || file.size;
      if (total) onProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
    },
  });
  return data.document;
}

export async function deleteAiDocument(id: string): Promise<void> {
  await api.delete(`/ai/documents/${id}`);
}

/* --------------------------------------------------------- conversations */

export async function fetchConversations(): Promise<AiConversation[]> {
  const { data } = await api.get<{ conversations: AiConversation[] }>('/ai/conversations');
  return data.conversations;
}

export async function createConversation(payload: {
  title?: string;
  document_id?: string | null;
} = {}): Promise<AiConversation> {
  const { data } = await api.post<{ conversation: AiConversation }>('/ai/conversations', payload);
  return data.conversation;
}

export async function renameConversation(id: string, title: string): Promise<AiConversation> {
  const { data } = await api.patch<{ conversation: AiConversation }>(`/ai/conversations/${id}`, {
    title,
  });
  return data.conversation;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/ai/conversations/${id}`);
}

export async function fetchMessages(
  conversationId: string,
): Promise<{ conversation: AiConversation; messages: AiMessage[] }> {
  const { data } = await api.get<{ conversation: AiConversation; messages: AiMessage[] }>(
    `/ai/conversations/${conversationId}/messages`,
  );
  return data;
}

export async function sendChatMessage(
  conversationId: string,
  content: string,
  documentId?: string | null,
): Promise<{ conversation: AiConversation; user_message: AiMessage; assistant_message: AiMessage }> {
  const { data } = await api.post<{
    conversation: AiConversation;
    user_message: AiMessage;
    assistant_message: AiMessage;
  }>(
    `/ai/conversations/${conversationId}/messages`,
    { content, document_id: documentId || undefined },
    { timeout: GENERATION_TIMEOUT },
  );
  return data;
}

/* ------------------------------------------------------------------ solve */

export async function solveQuestion(payload: {
  question: string;
  marks: AiMarks;
  document_id?: string | null;
}): Promise<AiSolveResponse> {
  const { data } = await api.post<AiSolveResponse>('/ai/solve', payload, {
    timeout: GENERATION_TIMEOUT,
  });
  return data;
}

/* ------------------------------------------------------------------- quiz */

export async function fetchQuizzes(): Promise<AiQuizSummary[]> {
  const { data } = await api.get<{ quizzes: AiQuizSummary[] }>('/ai/quizzes');
  return data.quizzes;
}

export async function createQuiz(payload: {
  document_id: string;
  difficulty: AiDifficulty;
  count: number;
}): Promise<AiQuiz> {
  const { data } = await api.post<{ quiz: AiQuiz }>('/ai/quiz', payload, {
    timeout: GENERATION_TIMEOUT,
  });
  return data.quiz;
}

export async function submitQuiz(id: string, answers: number[]): Promise<AiQuizResult> {
  const { data } = await api.post<{ result: AiQuizResult }>(`/ai/quiz/${id}/submit`, { answers });
  return data.result;
}

/* ---------------------------------------------------------------- summary */

export async function summarizeDocument(documentId: string): Promise<AiSummary> {
  const { data } = await api.post<{ summary: AiSummary }>(
    '/ai/summary',
    { document_id: documentId },
    { timeout: GENERATION_TIMEOUT },
  );
  return data.summary;
}

/* ------------------------------------------------------------- flashcards */

export async function fetchFlashcards(documentId?: string): Promise<AiFlashcard[]> {
  const { data } = await api.get<{ flashcards: AiFlashcard[] }>('/ai/flashcards', {
    params: documentId ? { document_id: documentId } : undefined,
  });
  return data.flashcards;
}

export async function createFlashcards(payload: {
  document_id: string;
  count: number;
}): Promise<AiFlashcard[]> {
  const { data } = await api.post<{ flashcards: AiFlashcard[] }>('/ai/flashcards', payload, {
    timeout: GENERATION_TIMEOUT,
  });
  return data.flashcards;
}

export async function updateFlashcard(
  id: string,
  payload: { marked?: boolean; front?: string; back?: string },
): Promise<AiFlashcard> {
  const { data } = await api.patch<{ flashcard: AiFlashcard }>(`/ai/flashcards/${id}`, payload);
  return data.flashcard;
}

export async function deleteFlashcard(id: string): Promise<void> {
  await api.delete(`/ai/flashcards/${id}`);
}
