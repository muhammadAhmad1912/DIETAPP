import type { Session, User, AuthError } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './client';

export type AuthResult = {
  user: User | null;
  session: Session | null;
  error: AuthError | Error | null;
};

function requireConfigured(): AuthError | Error | null {
  if (!isSupabaseConfigured) {
    return new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env',
    );
  }
  return null;
}

export async function signUp(params: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResult> {
  const configError = requireConfigured();
  if (configError) return { user: null, session: null, error: configError };

  const { data, error } = await supabase.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      data: {
        display_name: params.displayName?.trim() || undefined,
      },
    },
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

export async function signIn(params: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const configError = requireConfigured();
  if (configError) return { user: null, session: null, error: configError };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email.trim(),
    password: params.password,
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

export async function signOut(): Promise<{ error: AuthError | Error | null }> {
  const configError = requireConfigured();
  if (configError) return { error: configError };
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
}
