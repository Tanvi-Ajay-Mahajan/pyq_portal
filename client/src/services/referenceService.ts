import api from '@/lib/api';
import type { AcademicYear, Branch, Scheme, Semester, Subject } from '@/types';

export interface ReferenceData {
  branches: Branch[];
  schemes: Scheme[];
  academicYears: AcademicYear[];
  semesters: Semester[];
  subjects: Subject[];
}

export async function fetchReferenceData(): Promise<ReferenceData> {
  const { data } = await api.get<ReferenceData>('/reference');
  return data;
}

export async function fetchBranches(): Promise<Branch[]> {
  const { data } = await api.get<Branch[]>('/branches');
  return data;
}

export async function createBranch(payload: {
  code: string;
  name: string;
  drive_link?: string | null;
}): Promise<Branch> {
  const { data } = await api.post<Branch>('/branches', payload);
  return data;
}

export async function updateBranch(
  id: string,
  payload: Partial<{ code: string; name: string; drive_link: string | null }>,
): Promise<Branch> {
  const { data } = await api.patch<Branch>(`/branches/${id}`, payload);
  return data;
}

export async function deleteBranch(id: string): Promise<void> {
  await api.delete(`/branches/${id}`);
}

export async function fetchSubjects(params: { branch_id?: string; semester_id?: string } = {}) {
  const { data } = await api.get<Subject[]>('/subjects', { params });
  return data;
}

export async function createSubject(payload: {
  name: string;
  code: string;
  branch_id: string;
  semester_id: string;
  scheme_id?: string | null;
}): Promise<Subject> {
  const { data } = await api.post<Subject>('/subjects', payload);
  return data;
}

export async function updateSubject(id: string, payload: Record<string, unknown>): Promise<Subject> {
  const { data } = await api.patch<Subject>(`/subjects/${id}`, payload);
  return data;
}

export async function deleteSubject(id: string): Promise<void> {
  await api.delete(`/subjects/${id}`);
}

export async function createScheme(payload: { name: string }): Promise<Scheme> {
  const { data } = await api.post<Scheme>('/schemes', payload);
  return data;
}

export async function deleteScheme(id: string): Promise<void> {
  await api.delete(`/schemes/${id}`);
}
