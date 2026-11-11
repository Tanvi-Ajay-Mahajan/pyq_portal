import axios from 'axios';

const TOKEN_KEY = 'pyq_token';

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — the session simply won't persist */
  }
};

/**
 * Axios instance for the Express API. `VITE_API_URL` defaults to `/api`, which
 * works both with the Vite dev proxy and with Express serving the built client.
 */
export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Fired when the API rejects the stored token, so the UI can reset auth state. */
export const UNAUTHORIZED_EVENT = 'pyq:unauthorized';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && getToken()) {
      setToken(null);
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

/** Human readable message from an API/validation error. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; errors?: { field?: string; message?: string }[] }
      | undefined;
    if (data?.errors?.length) {
      return data.errors
        .map((issue) => (issue.field ? `${issue.field}: ${issue.message}` : issue.message))
        .filter(Boolean)
        .join(', ');
    }
    if (data?.message) return data.message;
    if (error.code === 'ERR_NETWORK') {
      return 'Cannot reach the API server. Is the backend running?';
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default api;
