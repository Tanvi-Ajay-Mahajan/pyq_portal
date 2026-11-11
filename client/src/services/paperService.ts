import api from '@/lib/api';
import type { PyqPaper, YearLevel } from '@/types';

export interface PaperFilters {
  year_level?: YearLevel;
  pattern?: string;
  branch?: string;
  category?: string;
  semester?: number;
  subject_id?: string;
  q?: string;
  limit?: number;
}

export interface PaperInput {
  year_level: YearLevel;
  pattern: string;
  branch?: string | null;
  subject_name?: string | null;
  category?: string;
  semester?: number | null;
  exam_year?: number | null;
  drive_link: string;
  subject_id?: string | null;
}

export interface PortalStats {
  total_papers: number;
  total_subjects: number;
  total_branches: number;
  total_feedback: number;
  average_rating: number;
  latest_papers?: PyqPaper[];
}

export interface PaperFeedbackResponse {
  average: number;
  count: number;
  feedback: import('@/types').PyqFeedbackWithUser[];
}

export async function fetchPapers(filters: PaperFilters = {}): Promise<PyqPaper[]> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
  const { data } = await api.get<PyqPaper[]>('/papers', { params });
  return data;
}

export async function fetchStats(): Promise<PortalStats> {
  const { data } = await api.get<PortalStats>('/papers/stats');
  return data;
}

export async function fetchPaper(id: string): Promise<PyqPaper> {
  const { data } = await api.get<PyqPaper>(`/papers/${id}`);
  return data;
}

export async function fetchPaperFeedback(id: string): Promise<PaperFeedbackResponse> {
  const { data } = await api.get<PaperFeedbackResponse>(`/papers/${id}/feedback`);
  return data;
}

export async function createPaper(payload: PaperInput): Promise<PyqPaper> {
  const { data } = await api.post<PyqPaper>('/papers', payload);
  return data;
}

export async function updatePaper(id: string, payload: Partial<PaperInput>): Promise<PyqPaper> {
  const { data } = await api.patch<PyqPaper>(`/papers/${id}`, payload);
  return data;
}

export async function deletePaper(id: string): Promise<void> {
  await api.delete(`/papers/${id}`);
}
