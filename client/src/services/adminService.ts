import api from '@/lib/api';
import type { UserRole } from '@/types';
import type { AuthUser } from './authService';

export interface AdminUser extends AuthUser {
  feedback_count: number;
}

export interface AdminUserList {
  total: number;
  page: number;
  limit: number;
  users: AdminUser[];
}

export async function fetchUsers(page = 1, limit = 100): Promise<AdminUserList> {
  const { data } = await api.get<AdminUserList>('/users', { params: { page, limit } });
  return data;
}

export async function updateUserRole(id: string, role: UserRole): Promise<AuthUser> {
  const { data } = await api.patch<AuthUser>(`/users/${id}/role`, { role });
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
