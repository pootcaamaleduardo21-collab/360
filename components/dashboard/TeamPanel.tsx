'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTeamInvites, inviteAdvisor, removeInvite, TeamInvite } from '@/lib/team';
import {
  Users, Mail, Send, Trash2, Clock, CheckCircle,
  Loader2, AlertCircle, Info,
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

export function TeamPanel() {
  const [invites,  setInvites]  = useState<TeamInvite[]>([]);
  const [email,    setEmail]    = useState('');
  const [role,     setRole]     = useState<'advisor' | 'admin'>('advisor');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; msg: string } | null>(null);

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

    const result = await inviteAdvisor(trimmed, role);

    if (result.error) {
      setFeedback({ type: 'error', msg: result.error });
    } else if (result.warning) {
      setFeedback({ type: 'warning', msg: result.warning });
      setEmail('');
      await load();
    } else {
      setFeedback({ type: 'success', msg: `Invitación enviada a ${trimmed}. Recibirá un correo para registrarse.` });
      setEmail('');
      await load();
    }
    setSending(false);
  };

  const handleRemove = async (invite: TeamInvite) => {
    await removeInvite(invite.email);
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-blue-400" />
        <h2 className="text-base font-bold text-white">Equipo de asesores</h2>
      </div>

      {/* How it works */}
      <div className="flex gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Los asesores invitados recibirán un correo para crear su cuenta. Una vez registrados, verán los tours publicados de tu cuenta y podrán compartirlos con clientes.
        </p>
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="space-y-3">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
          Invitar al equipo
        </label>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-2">
          {(['advisor', 'admin'] as const).map((r) => (
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
            disabled={sending || !email.trim()}
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
            'flex items-start gap-2 p-3 rounded-xl text-sm',
            feedback.type === 'success' && 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300',
            feedback.type === 'warning' && 'bg-amber-500/10 border border-amber-500/20 text-amber-300',
            feedback.type === 'error'   && 'bg-red-500/10 border border-red-500/20 text-red-400',
          )}>
            {feedback.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            {feedback.type !== 'success' && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            {feedback.msg}
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
    </div>
  );
}
