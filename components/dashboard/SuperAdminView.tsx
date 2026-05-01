'use client';

import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ROLE_LABELS, ROLE_COLORS, UserRole } from '@/lib/roles';
import {
  Users, Globe, Eye, BarChart2, Zap,
  Shield, CheckCircle, AlertCircle, RefreshCw, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformStats {
  totalTours:     number;
  publishedTours: number;
  totalViews:     number;
  totalUsers:     number;
}

interface UserRow {
  id:         string;
  email:      string;
  full_name:  string;
  role:       UserRole;
  created_at: string;
  tour_count: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SuperAdminView() {
  const [stats,   setStats]   = useState<PlatformStats | null>(null);
  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const load = async () => {
    if (!configured) { setLoading(false); return; }

    setLoading(true);
    setError(null);
    try {
      // Calls our server-side route that uses the service-role key safely
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { stats: s, users: u } = await res.json();
      setStats(s);
      setUsers(u);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const STAT_CARDS = [
    { label: 'Tours creados',    value: stats?.totalTours     ?? 0, icon: <Globe      className="w-5 h-5" />, color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
    { label: 'Tours publicados', value: stats?.publishedTours ?? 0, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Vistas totales',   value: stats?.totalViews     ?? 0, icon: <Eye        className="w-5 h-5" />, color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
    { label: 'Usuarios',         value: stats?.totalUsers     ?? 0, icon: <Users      className="w-5 h-5" />, color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-black text-gray-100">Panel de plataforma</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Super Admin
            </span>
          </div>
          <p className="text-sm text-gray-500">Visibilidad completa sobre todos los tours y usuarios.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Actualizar
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{error}</p>
            {error.includes('SUPABASE_SERVICE_ROLE_KEY') && (
              <p className="text-xs text-red-300/70 mt-1">
                Agrega <code className="bg-red-500/10 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> a tu <code>.env.local</code> y reinicia el servidor.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((c) => (
          <div key={c.label} className="p-5 rounded-2xl bg-gray-900 border border-gray-800">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', c.bg, c.color)}>
              {c.icon}
            </div>
            {loading ? (
              <div className="h-7 w-16 bg-gray-800 rounded-lg animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-black text-white">{c.value.toLocaleString()}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* System status */}
      <div className="p-5 rounded-2xl bg-gray-900 border border-gray-800 space-y-3">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Estado del sistema
        </h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <StatusRow label="Supabase"                ok={configured}  />
          <StatusRow label="Auth habilitado"         ok={configured}  />
          <StatusRow label="Service-role API"        ok={!error && !loading && users.length > 0} note={!error && users.length === 0 && !loading ? 'Agrega SUPABASE_SERVICE_ROLE_KEY' : undefined} />
          <StatusRow label="Storage buckets"         ok={configured}  />
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Usuarios registrados
          </h3>
          <span className="text-xs text-gray-600">
            {users.length > 0 ? `${users.length} usuarios` : loading ? 'Cargando…' : 'Sin datos'}
          </span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <BarChart2 className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Sin datos de usuarios.</p>
            <p className="text-xs text-gray-700 mt-1">
              Agrega <code className="bg-gray-800 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> al servidor para activar esta sección.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Usuario</th>
                  <th className="px-5 py-3 text-left">Rol</th>
                  <th className="px-5 py-3 text-left hidden sm:table-cell">Tours</th>
                  <th className="px-5 py-3 text-left hidden md:table-cell">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-gray-200 font-medium truncate max-w-[180px]">
                        {u.full_name || u.email}
                      </p>
                      {u.full_name && (
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">{u.email}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold border',
                        ROLE_COLORS[(u.role as UserRole) in ROLE_COLORS ? u.role as UserRole : 'admin'],
                      )}>
                        {ROLE_LABELS[(u.role as UserRole) in ROLE_LABELS ? u.role as UserRole : 'admin']}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 hidden sm:table-cell">
                      {u.tour_count}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 hidden md:table-cell">
                      {new Date(u.created_at).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusRow({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok
        ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 text-amber-400  flex-shrink-0" />}
      <span className={ok ? 'text-gray-300' : 'text-gray-500'}>{label}</span>
      {note && <span className="text-xs text-gray-600">— {note}</span>}
    </div>
  );
}
