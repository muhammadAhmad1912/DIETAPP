import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import {
  getSession,
  onAuthStateChange,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
} from '@/services/supabase/auth';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { cacheGet, cacheSet, cacheRemove } from '@/services/storage/cache';
import { StorageKeys } from '@/services/storage/keys';

interface AuthContextValue {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  keepSignedInDefault: boolean;
  signIn: (
    email: string,
    password: string,
    keepSignedIn?: boolean,
  ) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    keepSignedIn?: boolean,
  ) => Promise<string | null>;
  signOut: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [keepSignedInDefault, setKeepSignedInDefault] = useState(true);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const keep = await cacheGet<boolean>(StorageKeys.KEEP_SIGNED_IN);
      const preferKeep = keep !== false;
      if (mounted) setKeepSignedInDefault(preferKeep);

      const current = await getSession();

      // Cold start: drop persisted session when user did not opt into "keep signed in"
      if (current && keep === false) {
        await authSignOut();
        if (mounted) {
          setSession(null);
          setReady(true);
        }
        return;
      }

      if (mounted) {
        setSession(current);
        setReady(true);
      }
    })();

    const { data } = onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const persistKeepPreference = useCallback(async (keep: boolean) => {
    await cacheSet(StorageKeys.KEEP_SIGNED_IN, keep);
    setKeepSignedInDefault(keep);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, keepSignedIn = true) => {
      const result = await authSignIn({ email, password });
      if (result.error) return result.error.message;
      await persistKeepPreference(keepSignedIn);
      setSession(result.session);
      return null;
    },
    [persistKeepPreference],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName?: string,
      keepSignedIn = true,
    ) => {
      const result = await authSignUp({ email, password, displayName });
      if (result.error) return result.error.message;
      await persistKeepPreference(keepSignedIn);
      setSession(result.session);
      if (!result.session) {
        return 'Check your email to confirm your account, then sign in.';
      }
      return null;
    },
    [persistKeepPreference],
  );

  const signOut = useCallback(async () => {
    const { error } = await authSignOut();
    if (error) return error.message;
    await cacheRemove(StorageKeys.KEEP_SIGNED_IN);
    setSession(null);
    return null;
  }, []);

  const value = useMemo(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      keepSignedInDefault,
      signIn,
      signUp,
      signOut,
    }),
    [ready, session, keepSignedInDefault, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
