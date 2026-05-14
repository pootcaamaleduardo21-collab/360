'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Beaker, ChevronDown, X, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/roles';

interface RoleOption {
  value: UserRole | null;
  label: string;
  desc: string;
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: null,
    label: 'Super Admin',
    desc: 'Tu rol real',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  {
    value: 'admin',
    label: 'Administrador',
    desc: 'Editor completo + equipo',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    value: 'advisor',
    label: 'Asesor',
    desc: 'Dashboard asesor + portal',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
];

interface Props {
  /** Tour ID — if provided, shows a direct link to the advisor portal for quick testing. */
  tourId?: string;
}

export function DevRolePanel({ tourId }: Props) {
  const { user } = useAuth();
  const { baseRole, role, isOverridden, setOverride } = useRole();
  const [open, setOpen] = useState(false);

  // Only visible to the exact super-admin email — no one else, ever.
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? '';
  if (baseRole !== 'super_admin' || !superAdminEmail || user?.email !== superAdminEmail) return null;

  const active = ROLE_OPTIONS.find((o) => o.value === (isOverridden ? role : null)) ?? ROLE_OPTIONS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
          isOverridden
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
            : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25'
        )}
        title="Simular rol de usuario"
      >
        <Beaker className="w-3 h-3" />
        <span className="hidden sm:inline">
          {isOverridden ? `Vista: ${active.label}` : 'Test rol'}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-10 z-50 w-60 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Beaker className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold text-gray-300">Simular rol</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-2 space-y-1">
              {ROLE_OPTIONS.map((opt) => {
                const isCurrent = (isOverridden ? role : null) === opt.value;
                return (
                  <button
                    key={opt.label}
                    onClick={() => { setOverride(opt.value); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                      isCurrent ? 'bg-gray-800 ring-1 ring-gray-600' : 'hover:bg-gray-800/70'
                    )}
                  >
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0', opt.color)}>
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-gray-500 leading-tight">{opt.desc}</span>
                    {isCurrent && (
                      <span className="ml-auto text-[9px] font-bold text-gray-500 uppercase tracking-wide">activo</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick links for the active override */}
            {isOverridden && role === 'advisor' && tourId && (
              <div className="px-3 pb-3">
                <div className="h-px bg-gray-800 mb-2" />
                <Link
                  href={`/advisor/${tourId}`}
                  target="_blank"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-600/25 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir portal del asesor
                </Link>
              </div>
            )}

            <div className="px-4 py-2.5 border-t border-gray-800 bg-gray-950/50">
              <p className="text-[10px] text-gray-600 leading-snug">
                Solo afecta tu vista. Se resetea al cerrar la pestaña.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
