import type { User } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'admin' | 'advisor';

// The email that always gets super_admin regardless of metadata
const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? '';

export function getUserRole(user: User | null): UserRole {
  if (!user) return 'advisor';
  if (SUPER_ADMIN_EMAIL && user.email === SUPER_ADMIN_EMAIL) return 'super_admin';
  const meta = user.user_metadata?.role as string | undefined;
  if (meta === 'super_admin') return 'super_admin';
  if (meta === 'advisor')     return 'advisor';
  return 'admin';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin:       'Administrador',
  advisor:     'Asesor',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  admin:       'bg-blue-500/20   text-blue-300   border-blue-500/30',
  advisor:     'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};
