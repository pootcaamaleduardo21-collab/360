'use client';

import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { ROLE_LABELS, ROLE_COLORS, UserRole } from '@/lib/roles';
import {
  Users, Globe, Eye, BarChart2, Zap,
  Shield, CheckCircle, AlertCircle, RefreshCw, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformStats {
  totalTours:   number;
  publishedTours: number;
  totalViews:   number;
  totalUsers:   number;
}

interface UserRow {
  id:         string;
  email:      string;
  full_name?: string;
  role:       UserRole;
  created_at: string;
}

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
      const sb = getSupabase();

      // Platform stats from tours table
      const { data: tourRows } = await sb
        .from('tours')
        .select('is_published, view_count');

      const totalTours    = tourRows?.length ?? 0;
      const publishedTours = tourRows?.filter((t: any) => t.is_published).length ?? 0;
      const totalViews    = tourRows?.reduce((acc: number, t: any) => acc + (t.view_count ?? 0), 0) ?? 0;

      // Users from auth via admin API (requires service role) — falls back to empty
      // In production: use a Supabase Edge Function or admin endpoint
      const { data: { users: authUsers } } = await (sb.auth as any).admin?.listUsers?.() ?? { data: { users: [] } };

      const userList: UserRow[] = (authUsers ?? []).map((u: any) => ({
        id:         u.id,
        email:      u.email,
        full_name:  u.user_metadata?.full_name,
        role:       (u.user_metadata?.role as UserRole) ?? 'admin',
        created_at: u.created_at,
      }));

      setStats({ totalTours, publishedTours, totalViews, totalUsers: userList.length });
      setUsers(userList);
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar datos de plataforma.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const STAT_CARDS = [
    { label: 'Tours creados',    value: stats?.totalTours ?? 0,     icon: <Globe     className="w-5 h-5" />, color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
    { label: 'Tours publicados', value: stats?.publishedTours ?? 0, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10'},
    { label: 'Vistas totales',   value: stats?.totalViews ?? 0,     icon: <Eye       className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Usuarios',         value: stats?.totalUsers ?? 0,     icon: <Users     className="w-5 h-5" />, color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-black text-gray-100">Panel de plataforma</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Super Admin</span>
          </div>
          <p className="text-sm text-gray-500">Visibilidad completa sobre todos los tours y usuarios.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((c) => (
          <div key={c.label} className="p-5 rounded-2xl bg-gray-900 border border-gray-800">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', c.bg, c.color)}>
              {c.icon}
            </div>
            <p className="text-2xl font-black text-white">{c.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* System config status */}
      <div className="p-5 rounded-2xl bg-gray-900 border border-gray-800 space-y-3">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Estado del sistema
        </h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <StatusRow label="Supabase"      ok={configured} />
          <StatusRow label="Auth habilitado" ok={configured} />
          <StatusRow label="Analytics table" ok={false} note="Requiere migration" />
          <StatusRow label="Storage buckets" ok={configured} />
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Usuarios registrados
          </h3>
          <span className="text-xs text-gray-600">
            {users.length > 0 ? `${users.length} usuarios` : 'Requiere Supabase Admin API'}
          </span>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <BarChart2 className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Los datos de usuarios requieren la Supabase Admin API</p>
            <p className="text-xs text-gray-700 mt-1">Configura un Edge Function o usa el dashboard de Supabase directamente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Usuario</th>
                  <th className="px-5 py-3 text-left">Rol</th>
                  <th className="px-5 py-3 text-left">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-gray-200 font-medium">{u.full_name ?? u.email}</p>
                      {u.full_name && <p className="text-xs text-gray-500">{u.email}</p>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border', ROLE_COLORS[u.role])}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
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

function StatusRow({ label, ok, note }: { label: string; ok: boolean; note?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok
        ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
      <span className={ok ? 'text-gray-300' : 'text-gray-500'}>{label}</span>
      {note && <span className="text-xs text-gray-600">— {note}</span>}
    </div>
  );
}
