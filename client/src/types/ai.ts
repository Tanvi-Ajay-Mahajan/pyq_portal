/** Shared types for the AI features. Mirrors the JSON returned by /api/ai. */

export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type AiMarks = 2 | 5 | 10;

export interface AiStatus {
  ai_configured: boolean;
  model: string | null;
  max_pdf_mb: number;
  limits: {
    generations_per_hour: number;
    uploads_per_hour: number;
  };
}

export interface AiDocumentSummary {
  id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  char_count: number;
  size_bytes: number;
  status: string;
  embedded: boolean;
  warnings: string[];
  created_at: string;
}

export interface AiCitation {
  page: number | null;
  snippet: string;
  document_id: string | null;
  document_name: string | null;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: AiCitation[];
  created_at: string;
}

export interface AiConversation {
  id: string;
  title: string;
  mode: 'chat' | 'solve';
  document_ids: string[];
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface AiQuizQuestion {
  question: string;
  options: string[];
}

export interface AiQuiz {
  id: string;
  title: string;
  difficulty: AiDifficulty;
  total: number;
  questions: AiQuizQuestion[];
}

export interface AiQuizResultQuestion extends AiQuizQuestion {
  answer_index: number;
  explanation: string;
  page: number | null;
  selected_index: number | null;
  correct: boolean;
}

export interface AiQuizResult {
  id: string;
  score: number;
  total: number;
  percentage: number;
  questions: AiQuizResultQuestion[];
}

export interface AiQuizSummary {
  id: string;
  title: string;
  difficulty: AiDifficulty;
  score: number;
  total: number;
  completed: boolean;
  created_at: string;
}

export interface AiDefinition {
  term: string;
  meaning: string;
}

export interface AiChapter {
  heading: string;
  summary: string;
  key_points: string[];
  definitions: AiDefinition[];
  formulas: string[];
}

export interface AiFaq {
  question: string;
  answer: string;
}

export interface AiSummary {
  document_id: string;
  filename: string;
  title: string;
  chapters: AiChapter[];
  exam_points: string[];
  faqs: AiFaq[];
  revision_notes: string[];
}

export interface AiFlashcard {
  id: string;
  front: string;
  back: string;
  page: number | null;
  marked: boolean;
  document_id: string;
}

export interface AiSolveResponse {
  answer: string;
  marks: AiMarks;
  citations: AiCitation[];
  model: string;
}
