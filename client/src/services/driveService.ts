import api from '@/lib/api';

export interface DriveFolder {
  id: string;
  year_level: string;
  branch: string;
  pattern: string;
  drive_link: string;
  label: string | null;
  is_default: boolean;
  updated_at?: string;
  /** 'builtin' when the server served its fallback list (no database yet). */
  source?: string;
}

export interface DriveResolution {
  id?: string;
  year_level: string;
  branch: string;
  pattern: string | null;
  drive_link: string;
  label?: string | null;
  match?: string;
  requested_branch?: string;
}

export async function fetchDriveFolders(): Promise<DriveFolder[]> {
  const { data } = await api.get<DriveFolder[]>('/drive-folders');
  return data;
}

/** Resolves the Drive folder for a year + branch (+ optional pattern). */
export async function resolveDriveFolder(params: {
  branch: string;
  year_level?: string;
  pattern?: string;
}): Promise<DriveResolution> {
  const { data } = await api.get<DriveResolution>('/drive-folders/resolve', { params });
  return data;
}

export async function createDriveFolder(payload: {
  year_level: string;
  branch: string;
  pattern: string;
  drive_link: string;
  label?: string | null;
}): Promise<DriveFolder> {
  const { data } = await api.post<DriveFolder>('/drive-folders', payload);
  return data;
}

export async function updateDriveFolder(
  id: string,
  payload: Partial<Pick<DriveFolder, 'year_level' | 'branch' | 'pattern' | 'drive_link' | 'label'>>,
): Promise<DriveFolder> {
  const { data } = await api.patch<DriveFolder>(`/drive-folders/${id}`, payload);
  return data;
}

export async function deleteDriveFolder(id: string): Promise<void> {
  await api.delete(`/drive-folders/${id}`);
}
