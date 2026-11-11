import api from '@/lib/api';
import type { PyqFeedback, PyqFeedbackWithUser } from '@/types';

export interface FeedbackSummary {
  average: number;
  count: number;
}

export interface FeedbackMutationResult extends FeedbackSummary {
  feedback: PyqFeedbackWithUser;
}

export interface RecentFeedback extends PyqFeedbackWithUser {
  paper: {
    id: string;
    subject_name: string | null;
    branch: string | null;
    year_level: string;
    pattern: string;
  } | null;
}

export async function fetchRecentFeedback(limit = 6): Promise<RecentFeedback[]> {
  const { data } = await api.get<RecentFeedback[]>('/feedback/recent', { params: { limit } });
  return data;
}

export async function fetchMyFeedback(): Promise<PyqFeedback[]> {
  const { data } = await api.get<PyqFeedback[]>('/feedback/mine');
  return data;
}

export async function submitFeedback(payload: {
  paper_id: string;
  rating: number;
  comment?: string | null;
}): Promise<FeedbackMutationResult> {
  const { data } = await api.post<FeedbackMutationResult>('/feedback', payload);
  return data;
}

export async function updateFeedback(
  id: string,
  payload: { rating?: number; comment?: string | null },
): Promise<FeedbackMutationResult> {
  const { data } = await api.patch<FeedbackMutationResult>(`/feedback/${id}`, payload);
  return data;
}

export async function deleteFeedback(id: string): Promise<void> {
  await api.delete(`/feedback/${id}`);
}
