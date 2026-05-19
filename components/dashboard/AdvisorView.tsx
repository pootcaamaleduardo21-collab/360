'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TourSummary } from '@/lib/db';
import {
  Globe, Lock, Eye, Layers,
  MessageCircle, BarChart2, CheckCircle,
  Clock, XCircle, AlertCircle, Copy, Check,
  Pencil, Phone, Briefcase, User, Link2,
  ClipboardList, Loader2, Home, LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReservationRequest {
  id:                string;
  unit_label:        string | null;
  client_name:       string | null;
  client_phone:      string | null;
  status:            string;
  notes:             string | null;
  internal_notes:    string | null;
  missing_documents: string[] | null;
  created_at:        string;
  metadata:          Record<string, string> | null;
}

const RESERVATION_STATUS: Record<string, { label: string; color: string }> = {
  pending:          { label: 'Pendiente',             color: 'bg-amber-500/10 border-amber-500/30 text-amber-400'   },
  documents_needed: { label: 'Documentos requeridos', color: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
  in_review:        { label: 'En revisión',           color: 'bg-blue-500/10 border-blue-500/30 text-blue-400'      },
  approved:         { label: 'Aprobado ✓',            color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
  rejected:         { label: 'Rechazado',             color: 'bg-red-500/10 border-red-500/30 text-red-400'         },
  cancelled:        { label: 'Cancelado',             color: 'bg-gray-700 border-gray-600 text-gray-500'            },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdvisorViewProps {
  tours:      TourSummary[];
  userName?:  string;
  userPhone?: string;
  userTitle?: string;
  userId?:    string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdvisorView({ tours, userName, userPhone, userTitle, userId }: AdvisorViewProps) {
  const published = tours.filter((t) => t.is_published);
  const drafts    = tours.filter((t) => !t.is_published);

  const [name,           setName]           = useState(userName  ?? '');
  const [phone,          setPhone]          = useState(userPhone ?? '');
  const [title,          setTitle]          = useState(userTitle ?? 'Asesor inmobiliario');
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);

  useEffect(() => {
    setName(userName  ?? '');
    setPhone(userPhone ?? '');
    setTitle(userTitle ?? 'Asesor inmobiliario');
  }, [userName, userPhone, userTitle]);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    try {
      await fetch('/api/advisor/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_name: name, phone, title }),
      });
      setSaved(true);
      setEditingProfile(false);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [name, phone, title]);

  return (
    <div className="space-y-8">

      {/* ── Greeting + profile editor ──────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600/15 to-blue-600/10 border border-emerald-500/20 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-lg font-black text-white flex-shrink-0">
            {name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white">
              Hola{name ? `, ${name.split(' ')[0]}` : ''}
            </h2>
            <p className="text-xs text-gray-400">
              {published.length} tour{published.length !== 1 ? 's' : ''} activo{published.length !== 1 ? 's' : ''} para compartir
            </p>
          </div>
          <button
            onClick={() => setEditingProfile((v) => !v)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Mi perfil
          </button>
        </div>

        {editingProfile && (
          <div className="space-y-3 pt-3 border-t border-white/10">
            <p className="text-xs text-gray-400">
              Estos datos aparecen en el tour cuando compartes tu link personalizado.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ProfileField icon={<User      className="w-3.5 h-3.5" />} label="Nombre"       value={name}  onChange={setName}  placeholder="Tu nombre completo" />
              <ProfileField icon={<Phone     className="w-3.5 h-3.5" />} label="WhatsApp"     value={phone} onChange={setPhone} placeholder="+52 55 0000 0000" type="tel" />
              <ProfileField icon={<Briefcase className="w-3.5 h-3.5" />} label="Título/Cargo" value={title} onChange={setTitle} placeholder="Asesor inmobiliario" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                {saved ? <><Check className="w-3.5 h-3.5" /> Guardado</> : saving ? 'Guardando…' : 'Guardar perfil'}
              </button>
              <button onClick={() => setEditingProfile(false)} className="px-4 py-2 rounded-xl text-xs text-gray-500 hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tours activos ──────────────────────────────────────────────────── */}
      {published.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Tours listos para compartir
          </h3>
          {published.map((tour) => (
            <AdvisorTourCard
              key={tour.id}
              tour={tour}
              advisorName={name}
              advisorPhone={phone}
              advisorTitle={title}
              advisorUserId={userId}
            />
          ))}
        </div>
      )}

      {/* ── Borradores ────────────────────────────────────────────────────── */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Borradores</h3>
          {drafts.map((tour) => (
            <AdvisorTourCard
              key={tour.id}
              tour={tour}
              advisorName={name}
              advisorPhone={phone}
              advisorTitle={title}
              advisorUserId={userId}
            />
          ))}
        </div>
      )}

      {tours.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Globe className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-sm">No hay tours asignados aún.</p>
          <p className="text-xs mt-1">Contacta a tu administrador para que publique un tour.</p>
        </div>
      )}

      {/* ── Mis solicitudes de reserva ─────────────────────────────────────── */}
      <AdvisorReservationsPanel />

    </div>
  );
}

// ─── Profile field ────────────────────────────────────────────────────────────

function ProfileField({ icon, label, value, onChange, placeholder, type = 'text' }: {
  icon: React.ReactNode; label: string; value: string;
  onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        {icon}{label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-xl bg-gray-800/80 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-emerald-500 transition-colors"
      />
    </div>
  );
}

// ─── Tour card ────────────────────────────────────────────────────────────────

function AdvisorTourCard({
  tour, advisorName, advisorPhone, advisorTitle, advisorUserId,
}: {
  tour:           TourSummary;
  advisorName:    string;
  advisorPhone:   string;
  advisorTitle:   string;
  advisorUserId?: string;
}) {
  const [copied, setCopied] = useState(false);

  const baseUrl         = typeof window !== 'undefined' ? window.location.origin : '';
  const tourSlug        = (tour as TourSummary & { share_slug?: string }).share_slug ?? tour.id;
  const params          = new URLSearchParams();
  if (advisorName.trim())    params.set('advisor', advisorName.trim());
  if (advisorPhone.trim())   params.set('wa',      advisorPhone.trim());
  if (advisorTitle.trim())   params.set('title',   advisorTitle.trim());
  if (advisorUserId?.trim()) params.set('aid',     advisorUserId.trim());
  const qs              = params.toString();
  const personalizedUrl = `${baseUrl}/viewer/${tourSlug}${qs ? `?${qs}` : ''}`;
  const advisorPanelUrl = `/advisor/${tour.id}`;

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`🏠 *${tour.title}*\nTe comparto el tour virtual 360°:\n${personalizedUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(personalizedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
      {/* Main row */}
      <div className="p-4 flex items-center gap-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
          {tour.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tour.thumbnail} alt={tour.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Layers className="w-5 h-5 text-gray-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-200 truncate">{tour.title}</p>
            <span className={cn(
              'flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
              tour.is_published
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-gray-700 border-gray-600 text-gray-500'
            )}>
              {tour.is_published
                ? <><Globe className="w-2.5 h-2.5" /> Activo</>
                : <><Lock  className="w-2.5 h-2.5" /> Borrador</>}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span><Layers className="w-3 h-3 inline mr-0.5" />{tour.scene_count > 0 ? `${tour.scene_count} escenas` : 'Tour 360'}</span>
            {tour.is_published && <span><Eye className="w-3 h-3 inline mr-0.5" />{tour.view_count} vistas</span>}
          </div>
        </div>

        {/* Secondary actions */}
        {tour.is_published && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={handleWhatsApp} title="Compartir por WhatsApp"
              className="w-8 h-8 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] flex items-center justify-center transition-colors border border-[#25D366]/20">
              <MessageCircle className="w-4 h-4" />
            </button>
            <button onClick={handleCopy} title="Copiar link personalizado"
              className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-colors border',
                copied ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border-gray-700')}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <Link href={`/dashboard/analytics/${tour.id}`} title="Ver analytics"
              className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors border border-gray-700">
              <BarChart2 className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Link preview + primary CTA */}
      {tour.is_published && (
        <div className="px-4 pb-4 space-y-2">
          {/* Personalized link */}
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={handleCopy}
            title="Copiar link"
          >
            <Link2 className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <p className="flex-1 text-[10px] text-gray-600 group-hover:text-gray-400 truncate transition-colors font-mono">
              {personalizedUrl}
            </p>
            {copied
              ? <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              : <Copy  className="w-3 h-3 text-gray-700 group-hover:text-gray-400 flex-shrink-0 transition-colors" />}
          </div>

          {/* Primary CTA: open advisor panel */}
          <Link
            href={advisorPanelUrl}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Abrir herramientas de asesor
          </Link>
        </div>
      )}
    </div>
  );
}


// ─── Advisor reservations panel ───────────────────────────────────────────────

function AdvisorReservationsPanel() {
  const [requests, setRequests] = useState<ReservationRequest[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch('/api/reservation-requests')
      .then((r) => r.ok ? r.json() : [])
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-6">
      <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
    </div>
  );

  if (requests.length === 0) return null;

  const pending  = requests.filter((r) => ['pending', 'documents_needed', 'in_review'].includes(r.status));
  const resolved = requests.filter((r) => ['approved', 'rejected', 'cancelled'].includes(r.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-bold text-gray-300">Mis solicitudes de reserva</h3>
        {pending.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
            {pending.length}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {pending.map((req)  => <ReservationCard key={req.id} req={req} />)}
        {resolved.map((req) => <ReservationCard key={req.id} req={req} muted />)}
      </div>
    </div>
  );
}

function ReservationCard({ req, muted = false }: { req: ReservationRequest; muted?: boolean }) {
  const cfg  = RESERVATION_STATUS[req.status] ?? { label: req.status, color: 'bg-gray-700 border-gray-600 text-gray-500' };
  const date = new Date(req.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

  return (
    <div className={cn('rounded-2xl border p-4 space-y-2', muted ? 'border-gray-800 bg-gray-900/50' : 'border-gray-700 bg-gray-900')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Home className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-200 truncate">{req.unit_label ?? 'Unidad'}</p>
            <span className={cn('flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', cfg.color)}>
              {cfg.label}
            </span>
          </div>
          {req.client_name && (
            <p className="mt-1 text-xs text-gray-500">
              Cliente: {req.client_name}{req.client_phone ? ` · ${req.client_phone}` : ''}
            </p>
          )}
        </div>
        <span className="flex-shrink-0 text-[10px] text-gray-600">{date}</span>
      </div>

      {req.notes && (
        <p className="text-xs text-gray-500 border-t border-gray-800 pt-2">{req.notes}</p>
      )}

      {req.internal_notes && (
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2">
          <p className="text-xs font-semibold text-blue-400 mb-0.5">Nota del admin:</p>
          <p className="text-xs text-blue-300">{req.internal_notes}</p>
        </div>
      )}

      {req.missing_documents && req.missing_documents.length > 0 && (
        <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-2">
          <p className="text-xs font-semibold text-orange-400 mb-1">Documentos requeridos:</p>
          <ul className="space-y-0.5">
            {req.missing_documents.map((doc) => (
              <li key={doc} className="text-xs text-orange-300 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

void [CheckCircle, Clock, XCircle, AlertCircle, User, Phone, Briefcase, Home, ClipboardList];
