import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Profile, UserRole } from '@/types';
import { UNAUTHORIZED_EVENT, getToken, setToken } from '@/lib/api';
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type AuthUser,
} from '@/services/authService';

interface Session {
  user: { id: string; email: string };
  token: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toProfile = (user: AuthUser): Profile => ({
  id: user.id,
  full_name: user.name,
  role: user.role,
  created_at: user.created_at,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextToken: string | null, nextUser: AuthUser | null) => {
    setToken(nextToken);
    setTokenState(nextToken);
    setUser(nextUser);
  }, []);

  // Restore the session from the stored JWT on first load.
  useEffect(() => {
    let active = true;

    const restore = async () => {
      const stored = getToken();
      if (!stored) {
        if (active) setLoading(false);
        return;
      }
      try {
        const current = await fetchCurrentUser();
        if (active) {
          setUser(current);
          setTokenState(stored);
        }
      } catch {
        if (active) {
          setToken(null);
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    restore();
    return () => {
      active = false;
    };
  }, []);

  // A rejected token anywhere in the app clears the session once.
  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setTokenState(null);
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await loginUser({ email, password });
      applySession(result.token, result.user);
    },
    [applySession],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await registerUser({ name, email, password });
      applySession(result.token, result.user);
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    await logoutUser();
    applySession(null, null);
  }, [applySession]);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      applySession(null, null);
      return;
    }
    try {
      setUser(await fetchCurrentUser());
    } catch {
      applySession(null, null);
    }
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: token && user ? { user: { id: user.id, email: user.email }, token } : null,
      profile: user ? toProfile(user) : null,
      role: user?.role ?? null,
      loading,
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [token, user, loading, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
