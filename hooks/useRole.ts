'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getUserRole, type UserRole } from '@/lib/roles';

const SS_KEY = '__dev_role__';

// Module-level cache: avoids re-reading sessionStorage on every render.
// Resets on hard refresh (module is re-evaluated).
let _cache: UserRole | null | 'unread' = 'unread';

function readOverride(): UserRole | null {
  if (_cache !== 'unread') return _cache;
  try {
    const v = sessionStorage.getItem(SS_KEY) as string | null;
    _cache = (['admin', 'advisor'] as string[]).includes(v ?? '') ? (v as UserRole) : null;
  } catch {
    _cache = null;
  }
  return _cache;
}

function writeOverride(role: UserRole | null) {
  _cache = role;
  try {
    if (role) sessionStorage.setItem(SS_KEY, role);
    else sessionStorage.removeItem(SS_KEY);
  } catch {}
}

/**
 * Like getUserRole() but super_admins can temporarily override their visible role
 * to test what other users see. The override lives in sessionStorage only.
 */
export function useRole() {
  const { user, isLoading } = useAuth();
  const [override, setOverrideState] = useState<UserRole | null>(null);

  // Read sessionStorage after mount (client-only — avoids SSR hydration mismatch).
  useEffect(() => {
    const stored = readOverride();
    if (stored) setOverrideState(stored);
  }, []);

  const baseRole = getUserRole(user);
  // Only the designated super-admin email can activate role overrides.
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? '';
  const canOverride = baseRole === 'super_admin'
    && !!superAdminEmail
    && user?.email === superAdminEmail;
  const role: UserRole = canOverride && override ? override : baseRole;

  const setOverride = useCallback((r: UserRole | null) => {
    writeOverride(r);
    setOverrideState(r);
  }, []);

  return {
    role,
    baseRole,
    isOverridden: canOverride && !!override,
    setOverride,
    isLoading,
  };
}
