'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export interface AuthState {
  user:        User | null;
  session:     Session | null;
  isLoading:   boolean;
  isConfigured: boolean;
}

export interface AuthActions {
  signIn:   (email: string, password: string) => Promise<{ error: string | null }>;
  signUp:   (email: string, password: string, fullName?: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut:  () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

export function useAuth(): AuthState & AuthActions {
  const configured = isSupabaseConfigured();

  const [user,      setUser]      = useState<User | null>(null);
  const [session,   setSession]   = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!configured) {
      setIsLoading(false);
      return;
    }

    const sb = getSupabase();

    // Get initial session — always resolve isLoading even if Supabase is unreachable
    sb.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        // Network error or invalid storage — treat as logged out, never block the UI
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Error de conexión al iniciar sesión.' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) return { error: error.message, needsConfirmation: false };
      // When email confirmation is disabled, Supabase returns a session immediately.
      // When confirmation is required, session is null and the user gets an email.
      const needsConfirmation = !data.session;
      return { error: null, needsConfirmation };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Error de conexión al registrarse.', needsConfirmation: false };
    }
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    await sb.auth.signOut();
    // ── SECURITY: clear user-specific persisted state on logout ────────────
    // Prevents cart/items from a previous session leaking to the next user
    // on the same browser.
    try {
      const { useTourStore } = await import('@/store/tourStore');
      useTourStore.getState().clearCart();
      useTourStore.setState({ tour: null, currentSceneId: null });
    } catch {
      // Store might not be initialized; safe to ignore
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/auth/new-password`,
      });
      return { error: error?.message ?? null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Error de conexión.' };
    }
  }, []);

  return {
    user,
    session,
    isLoading,
    isConfigured: configured,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}
