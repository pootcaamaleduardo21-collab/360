'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getUserRole, isRoleTesterEmail, type UserRole } from '@/lib/roles';

const SS_KEY = '__dev_role__';

// Module-level cache: avoids re-reading sessionStorage on every render.
// Resets on hard refresh (module is re-evaluated).
let _cache: UserRole | null | 'unread' = 'unread';

function readOverride(): UserRole | null {
  if (_cache !== 'unread') return _cache;
  try {
    const v = sessionStorage.getItem(SS_KEY) as string | null;
    _cache = (['super_admin', 'admin', 'advisor'] as string[]).includes(v ?? '') ? (v as UserRole) : null;
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
 * Like getUserRole() but authorized tester accounts can temporarily override
 * their visible role to test what other users see. The override lives in
 * sessionStorage only; server-side permissions remain unchanged.
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
  const canOverride = isRoleTesterEmail(user?.email) || baseRole === 'super_admin';
  const role: UserRole = canOverride && override ? override : baseRole;

  const setOverride = useCallback((r: UserRole | null) => {
    if (!canOverride) {
      writeOverride(null);
      setOverrideState(null);
      return;
    }
    writeOverride(r);
    setOverrideState(r);
  }, [canOverride]);

  return {
    role,
    baseRole,
    canOverride,
    isOverridden: canOverride && !!override,
    setOverride,
    isLoading,
  };
}
