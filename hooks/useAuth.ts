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
  signUp:   (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
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

    // Get initial session
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
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
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const sb = getSupabase();
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    await sb.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const sb = getSupabase();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?type=recovery`,
    });
    return { error: error?.message ?? null };
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
