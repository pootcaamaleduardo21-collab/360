'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTeamInvites, inviteAdvisor, removeInvite, TeamInvite } from '@/lib/team';
import { useAuth } from '@/hooks/useAuth';
import {
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  DEFAULT_ADMIN_PERMISSIONS,
  type AdminPermission,
  hasAdminPermission,
  isSubscriptionOwner,
} from '@/lib/teamPermissions';
import {
  Users, Mail, Send, Trash2, Clock, CheckCircle,
  Loader2, AlertCircle, Info, ClipboardList,
  Copy, Check, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_CONFIG = {
  advisor: {
    label: 'Asesor',
    desc:  'Solo puede ver y compartir tours publicados. Sin acceso al editor.',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  admin: {
    label: 'Administrador',
    desc:  'Acceso completo al editor, branding e inventario. No puede invitar super admins.',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
} as const;

interface ReservationRequest {
  id: string;
  unit_label: string | null;
  status: 'pending' | 'documents_needed' | 'in_review' | 'approved' | 'rejected' | 'cancelled';
  client_name: string | null;
  client_phone: string | null;
  notes: string | null;
  created_at: string;
}

const RESERVATION_STATUS: Record<ReservationRequest['status'], { label: string; color: string }> = {
  pending:          { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  documents_needed: { label: 'Faltan docs', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  in_review:        { label: 'En revisión', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  approved:         { label: 'Aprobada', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected:         { label: 'Rechazada', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  cancelled:        { label: 'Cancelada', color: 'bg-gray-500/15 text-gray-300 border-gray-500/30' },
};

export function TeamPanel() {
  const { user } = useAuth();
  const [invites,  setInvites]  = useState<TeamInvite[]>([]);
  const [email,    setEmail]    = useState('');
  const [role,     setRole]     = useState<'advisor' | 'admin'>('advisor');
  const [permissions, setPermissions] = useState<AdminPermission[]>(DEFAULT_ADMIN_PERMISSIONS);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; msg: string } | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canInviteAdmins = isSubscriptionOwner(user) || user?.user_metadata?.role === 'super_admin';
  const canInviteTeam = hasAdminPermission(user, 'manage_team');

  const load = useCallback(async () => {
    setInvites(await getTeamInvites());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setSending(true);
    setFeedback(null);
    setInviteUrl(null);
    setCopied(false);

    const inviteRole = canInviteAdmins ? role : 'advisor';
    const result = await inviteAdvisor(trimmed, inviteRole, inviteRole === 'admin' ? permissions : []);
    if (result.inviteUrl) setInviteUrl(result.inviteUrl);

    if (result.error) {
      setFeedback({ type: 'error', msg: result.error });
    } else if (result.warning) {
      setFeedback({ type: 'warning', msg: result.warning });
      setEmail('');
      await load();
    } else {
      setFeedback({ type: 'success', msg: `Invitación enviada a ${trimmed}. Recibirá un correo para registrarse.` });
      setEmail('');
      setRole('advisor');
      setPermissions(DEFAULT_ADMIN_PERMISSIONS);
      await load();
    }
    setSending(false);
  };

  const copyInviteUrl = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRemove = async (invite: TeamInvite) => {
    await removeInvite(invite.email);
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  };

  const togglePermission = (permission: AdminPermission) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((item) => item !== permission)
        : [...prev, permission]
    );
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-blue-400" />
        <h2 className="text-base font-bold text-white">Equipo de asesores</h2>
      </div>

      {/* How it works */}
      <div className="flex gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          El dueño de la suscripción define qué puede hacer cada administrador. Los asesores solo ven tours publicados y materiales para compartir con clientes.
        </p>
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="space-y-3">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
          Invitar al equipo
        </label>

        {/* Role selector */}
        <div className={cn('grid gap-2', canInviteAdmins ? 'grid-cols-2' : 'grid-cols-1')}>
          {(['advisor', 'admin'] as const).filter((r) => r !== 'admin' || canInviteAdmins).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                'flex flex-col gap-1 p-3 rounded-xl border text-left transition-colors',
                role === r
                  ? 'bg-gray-800 border-blue-500/50 ring-1 ring-blue-500/30'
                  : 'bg-gray-900 border-gray-700 hover:border-gray-600'
              )}
            >
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border w-fit', ROLE_CONFIG[r].color)}>
                {ROLE_CONFIG[r].label}
              </span>
              <span className="text-[10px] text-gray-500 leading-snug">{ROLE_CONFIG[r].desc}</span>
            </button>
          ))}
        </div>

        {role === 'admin' && canInviteAdmins && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-300" />
              <div>
                <p className="text-sm font-bold text-gray-100">Permisos del administrador</p>
                <p className="text-xs text-gray-500">Activa solo las áreas que este admin podrá gestionar.</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ADMIN_PERMISSIONS.map((permission) => {
                const item = ADMIN_PERMISSION_LABELS[permission];
                const checked = permissions.includes(permission);
                return (
                  <label
                    key={permission}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                      checked
                        ? 'border-blue-500/40 bg-blue-500/10'
                        : 'border-gray-800 bg-gray-950/50 hover:border-gray-700'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(permission)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <span>
                      <span className="block text-xs font-semibold text-gray-200">{item.label}</span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-gray-500">{item.desc}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {!canInviteTeam && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>No tienes permiso para invitar equipo. Pide al dueño de la suscripción que active el permiso Equipo.</span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFeedback(null); }}
              placeholder="correo@ejemplo.com"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !email.trim() || !canInviteTeam}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors flex-shrink-0"
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
            Invitar
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={cn(
            'space-y-2 p-3 rounded-xl text-sm',
            feedback.type === 'success' && 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300',
            feedback.type === 'warning' && 'bg-amber-500/10 border border-amber-500/20 text-amber-300',
            feedback.type === 'error'   && 'bg-red-500/10 border border-red-500/20 text-red-400',
          )}>
            <div className="flex items-start gap-2">
              {feedback.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {feedback.type !== 'success' && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>{feedback.msg}</span>
            </div>
            {inviteUrl && (
              <div className="flex items-center gap-2 rounded-lg bg-black/20 border border-white/10 p-2">
                <span className="flex-1 truncate text-[11px] text-gray-300">{inviteUrl}</span>
                <button
                  type="button"
                  onClick={copyInviteUrl}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-200 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Invite list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Invitaciones enviadas ({invites.length})
        </p>

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          </div>
        )}

        {!loading && invites.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Users className="w-8 h-8 text-gray-700" />
            <p className="text-sm text-gray-500">Aún no has invitado a nadie.</p>
            <p className="text-xs text-gray-600">Los asesores podrán compartir tus tours con clientes.</p>
          </div>
        )}

        {invites.map((invite) => (
          <div key={invite.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-600/30 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-blue-400">
                {invite.email[0].toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-200 truncate">{invite.email}</p>
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0',
                  ROLE_CONFIG[invite.role ?? 'advisor'].color
                )}>
                  {ROLE_CONFIG[invite.role ?? 'advisor'].label}
                </span>
              </div>
              {(invite.role ?? 'advisor') === 'admin' && (invite.permissions?.length ?? 0) > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {invite.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-md border border-gray-700 bg-gray-800/70 px-1.5 py-0.5 text-[10px] text-gray-400"
                    >
                      {ADMIN_PERMISSION_LABELS[permission]?.label ?? permission}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {invite.status === 'accepted' ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle className="w-3 h-3" /> Cuenta creada
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400">
                    <Clock className="w-3 h-3" /> Pendiente de registro
                  </span>
                )}
                <span className="text-[11px] text-gray-600">· {fmt(invite.created_at)}</span>
              </div>
            </div>

            {/* Remove */}
            <button
              onClick={() => handleRemove(invite)}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
              title="Eliminar invitación"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <ReservationRequestsPanel />
    </div>
  );
}

function ReservationRequestsPanel() {
  const [requests, setRequests] = useState<ReservationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reservation-requests');
      setRequests(res.ok ? await res.json() : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: ReservationRequest['status']) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/reservation-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setRequests((prev) => prev.map((item) => item.id === id ? updated : item));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-5 h-5 text-emerald-400" />
        <div>
          <h2 className="text-base font-bold text-white">Solicitudes de reserva</h2>
          <p className="text-xs text-gray-500">Aquí llegarán las solicitudes enviadas por asesores desde el panel móvil.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 text-sm text-gray-500">
          Aún no hay solicitudes de reserva.
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => {
            const cfg = RESERVATION_STATUS[request.status];
            return (
              <div key={request.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{request.unit_label ?? 'Unidad'}</p>
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {request.client_name ?? 'Cliente'} {request.client_phone ? `· ${request.client_phone}` : ''}
                    </p>
                    {request.notes && <p className="mt-2 text-xs text-gray-400">{request.notes}</p>}
                  </div>
                  <select
                    value={request.status}
                    disabled={updatingId === request.id}
                    onChange={(e) => updateStatus(request.id, e.target.value as ReservationRequest['status'])}
                    className="rounded-xl border border-gray-700 bg-gray-800 px-2 py-1.5 text-xs text-gray-200"
                  >
                    {Object.entries(RESERVATION_STATUS).map(([status, statusCfg]) => (
                      <option key={status} value={status}>{statusCfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
