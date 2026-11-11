import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const emptyResult = { data: [] as unknown[], error: null, count: 0 };

/**
 * Offline client used when the database connection details are missing.
 *
 * The app's paper lists come from Supabase, but the branch Drive folders are
 * static, so the UI must keep rendering (with empty lists) instead of crashing
 * or blocking the whole app behind a configuration screen.
 */
function createOfflineClient(): SupabaseClient {
  const query = new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      const key = String(prop);
      if (key === 'then') {
        return (resolve: (value: typeof emptyResult) => unknown) =>
          Promise.resolve(emptyResult).then(resolve);
      }
      if (key === 'single' || key === 'maybeSingle') {
        return () => Promise.resolve({ data: null, error: null });
      }
      return () => query;
    },
  });

  const authBase: Record<string, unknown> = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: null }),
  };

  const auth = new Proxy(authBase, {
    get(target, prop) {
      const key = String(prop);
      if (key in target) return target[key];
      return async () => ({ data: null, error: { message: 'Database not connected' } });
    },
  });

  const channel = () => {
    const proxy: Record<string, unknown> = new Proxy(
      {},
      {
        get() {
          return () => proxy;
        },
      },
    );
    return proxy;
  };

  return {
    from: () => query,
    auth,
    channel,
    removeChannel: async () => ({ error: null }),
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createOfflineClient();
