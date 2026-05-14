'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import QRCode from 'qrcode';
import type { Tour, GalleryItem, PropertyUnit, SalesAdvisor, UnitPrototype } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { getSupabase } from '@/lib/supabase';
import { MaterialsPanel } from '@/components/dashboard/MaterialsPanel';
import { AnnouncementsSection } from '@/components/dashboard/AnnouncementsSection';
import {
  Link2, Copy, CheckCheck, Download, Upload, Play, ExternalLink, QrCode,
  Calendar, MessageCircle, Mail, Phone, LayoutDashboard,
  Building2, CheckCircle, Clock, XCircle, AlertCircle,
  FileText, Image as ImageIcon, Video, ChevronRight, Loader2,
  Share2, BedDouble, Bath, Car, Ruler, FolderOpen, Megaphone,
  UserCog, Save, PanelRightClose, PanelRightOpen, Filter,
} from 'lucide-react';

const Viewer360 = dynamic(
  () => import('@/components/viewer/Viewer360').then((m) => m.Viewer360),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div> }
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tour:      Tour;
  tourId:    string;
  shareSlug: string | null;
}

type Tab = 'link' | 'profile' | 'material' | 'booking' | 'units' | 'kit' | 'novedades';
type InventoryStatusFilter = 'all' | PropertyUnit['status'];

const STATUS_CONF = {
  available:   { label: 'Disponible',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: <CheckCircle  className="w-3 h-3" /> },
  reserved:    { label: 'Apartado',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: <Clock        className="w-3 h-3" /> },
  sold:        { label: 'Vendido',     color: 'text-red-400',     bg: 'bg-red-500/10',     icon: <XCircle      className="w-3 h-3" /> },
  'in-process':{ label: 'En proceso',  color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: <AlertCircle  className="w-3 h-3" /> },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isYouTube(url: string) { return /youtube\.com|youtu\.be/.test(url); }
function isVimeo(url: string)   { return /vimeo\.com/.test(url); }

function youtubeThumbnail(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
}

function buildAdvisorUrl(baseUrl: string, advisor: SalesAdvisor): string {
  if (!advisor.phone && !advisor.name && !advisor.title) return baseUrl;
  const params = new URLSearchParams();
  if (advisor.phone) params.set('wa', advisor.phone.replace(/\D/g, ''));
  if (advisor.name) params.set('advisor', advisor.name);
  if (advisor.title) params.set('title', advisor.title);
  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

function filterUnits(units: PropertyUnit[], status: InventoryStatusFilter, prototypeId: string) {
  return units.filter((unit) => {
    const statusMatch = status === 'all' || unit.status === status;
    const prototypeMatch = prototypeId === 'all' || unit.prototypeId === prototypeId;
    return statusMatch && prototypeMatch;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdvisorClient({ tour, tourId, shareSlug }: Props) {
  // Load tour into store synchronously before first render
  useState(() => { useTourStore.getState().loadTour(tour); });
  const { user } = useAuth();

  const storeTour      = useTourStore((s) => s.tour);
  const currentScene   = useTourStore((s) => {
    const id = s.currentSceneId ?? s.tour?.initialSceneId ?? s.tour?.scenes?.[0]?.id;
    return s.tour?.scenes.find((sc) => sc.id === id) ?? s.tour?.scenes?.[0] ?? null;
  });
  const viewerConfig   = useTourStore((s) => s.viewerConfig);
  const navigateTo     = useTourStore((s) => s.navigateTo);

  const [tab,      setTab]      = useState<Tab>('link');
  const [copied,   setCopied]   = useState<string | null>(null);
  const [qrUrl,    setQrUrl]    = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [unitStatus, setUnitStatus] = useState<InventoryStatusFilter>('all');
  const [prototypeFilter, setPrototypeFilter] = useState('all');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [advisorDraft, setAdvisorDraft] = useState<SalesAdvisor>(() => ({
    name: tour.salesAdvisor?.name ?? '',
    phone: tour.salesAdvisor?.phone ?? '',
    email: tour.salesAdvisor?.email ?? '',
    photoUrl: tour.salesAdvisor?.photoUrl ?? '',
    title: tour.salesAdvisor?.title ?? '',
    company: tour.salesAdvisor?.company ?? '',
  }));

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata ?? {};
    setAdvisorDraft((prev) => ({
      name: (meta.full_name as string | undefined) ?? prev.name,
      phone: (meta.whatsapp as string | undefined) ?? (meta.phone as string | undefined) ?? prev.phone,
      email: user.email ?? prev.email,
      photoUrl: (meta.avatar_url as string | undefined) ?? (meta.photo_url as string | undefined) ?? prev.photoUrl,
      title: (meta.advisor_title as string | undefined) ?? prev.title,
      company: (meta.company as string | undefined) ?? prev.company,
    }));
  }, [user]);

  const advisor: SalesAdvisor = {
    name: advisorDraft.name || tour.salesAdvisor?.name || 'Asesor',
    phone: advisorDraft.phone || tour.salesAdvisor?.phone || '',
    email: advisorDraft.email || tour.salesAdvisor?.email,
    photoUrl: advisorDraft.photoUrl || tour.salesAdvisor?.photoUrl,
    title: advisorDraft.title || tour.salesAdvisor?.title,
    company: advisorDraft.company || tour.salesAdvisor?.company,
  };
  const origin    = typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl   = `${origin}/viewer/${shareSlug || tourId}`;
  const advisorUrl = buildAdvisorUrl(baseUrl, advisor);

  const hasMaterial = !!(tour.brochureUrl || (tour.gallery?.length ?? 0) > 0);
  const hasBooking  = !!(tour.bookingEnabled && tour.bookingConfig);
  const hasUnits    = (tour.units?.length ?? 0) > 0;

  // Determine default tab
  useEffect(() => {
    if (!hasUnits && !hasBooking && hasMaterial) setTab('material');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate QR for advisor URL
  useEffect(() => {
    if (!advisorUrl) return;
    QRCode.toDataURL(advisorUrl, {
      width: 220, margin: 1, color: { dark: '#ffffff', light: '#111827' },
    }).then(setQrUrl).catch(() => setQrUrl(null));
  }, [advisorUrl]);

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const saveAdvisorProfile = useCallback(async () => {
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      const { error } = await getSupabase().auth.updateUser({
        data: {
          full_name: advisorDraft.name.trim() || undefined,
          phone: advisorDraft.phone.trim() || undefined,
          whatsapp: advisorDraft.phone.trim() || undefined,
          advisor_title: advisorDraft.title?.trim() || undefined,
          company: advisorDraft.company?.trim() || undefined,
          photo_url: advisorDraft.photoUrl?.trim() || undefined,
        },
      });
      if (error) throw error;
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {
      alert('No se pudo guardar tu perfil. Intenta de nuevo.');
    } finally {
      setProfileSaving(false);
    }
  }, [advisorDraft]);

  const uploadAdvisorPhoto = useCallback(async (file: File) => {
    setPhotoUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/advisor/photo', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No se pudo subir la foto.');
      setAdvisorDraft((prev) => ({ ...prev, photoUrl: json.photoUrl }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, []);

  if (!storeTour || !currentScene) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'link',    label: 'Mi Link',    icon: <Link2      className="w-4 h-4" /> },
    { id: 'profile', label: 'Perfil',     icon: <UserCog    className="w-4 h-4" /> },
    ...(hasMaterial ? [{ id: 'material' as Tab, label: 'Material',  icon: <Download   className="w-4 h-4" /> }] : []),
    ...(hasBooking  ? [{ id: 'booking'  as Tab, label: 'Agendar',   icon: <Calendar   className="w-4 h-4" /> }] : []),
    ...(hasUnits    ? [{ id: 'units'    as Tab, label: 'Inventario',icon: <Building2  className="w-4 h-4" /> }] : []),
    { id: 'kit',      label: 'Kit Ventas', icon: <FolderOpen  className="w-4 h-4" /> },
    { id: 'novedades',label: 'Novedades',  icon: <Megaphone   className="w-4 h-4" /> },
  ];

  return (
    <div className="relative flex flex-col md:flex-row h-screen bg-gray-950 overflow-hidden">

      {/* ── Viewer ──────────────────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 h-[45vh] md:h-full md:flex-1">
        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          {tour.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tour.logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{tour.title}</p>
            {tour.brandName && <p className="text-white/50 text-xs truncate">{tour.brandName}</p>}
          </div>
          {advisor.name && (
            <div className="flex items-center gap-2 pointer-events-auto rounded-full border border-white/10 bg-black/30 px-2 py-1 backdrop-blur-sm">
              <AdvisorAvatar advisor={advisor} color={tour.brandColor} size="sm" />
              <span className="text-white/80 text-xs font-medium hidden sm:block">{advisor.name}</span>
            </div>
          )}
        </div>

        <Viewer360
          tour={storeTour}
          currentScene={currentScene}
          config={{ ...viewerConfig, showTutorial: false, showMinimap: false, showControls: true }}
          onNavigate={navigateTo}
          preloadAdjacentScenes
        />

        {/* Dashboard link — bottom-left */}
        <Link
          href="/dashboard"
          className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/60 hover:text-white text-xs border border-white/10 transition-colors"
        >
          <LayoutDashboard className="w-3 h-3" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <button
          onClick={() => setToolsOpen((v) => !v)}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/55 backdrop-blur-sm text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
          title={toolsOpen ? 'Contraer herramientas' : 'Abrir herramientas'}
        >
          {toolsOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          {toolsOpen ? 'Presentar' : 'Herramientas'}
        </button>
      </div>

      {/* ── Tools panel ─────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex flex-col flex-shrink-0 w-full bg-gray-900 border-t md:border-t-0 md:border-l border-white/10 overflow-hidden transition-all duration-300',
        'fixed inset-x-0 bottom-0 z-40 max-h-[58vh] rounded-t-3xl shadow-2xl md:static md:max-h-none md:rounded-none md:shadow-none',
        toolsOpen ? 'translate-y-0 md:w-80 lg:w-96' : 'translate-y-[calc(100%-52px)] md:translate-y-0 md:w-0 md:border-l-0'
      )}>
        <div className="min-w-0 md:min-w-80 lg:min-w-96 h-full flex flex-col">

        {/* Tab bar */}
        <div className="flex border-b border-white/10 flex-shrink-0 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'min-w-[76px] flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors',
                tab === t.id
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Mi Link ───────────────────────────────────────────────────── */}
          {tab === 'link' && (
            <div className="p-4 space-y-5">

              {/* QR */}
              {qrUrl && (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR mi link" className="w-44 h-44 rounded-2xl" />
                  <a
                    href={qrUrl}
                    download={`qr-${advisor?.name?.replace(/\s+/g, '-').toLowerCase() ?? 'asesor'}.png`}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar QR
                  </a>
                </div>
              )}

              {/* Personal advisor link */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mi link personalizado</p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800 border border-gray-700">
                  <Link2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="flex-1 text-xs text-gray-300 truncate">{advisorUrl}</span>
                  <button onClick={() => copy(advisorUrl, 'advisor')} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
                    {copied === 'advisor' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a href={advisorUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-[10px] text-gray-600">
                  Cuando el cliente abre este link, el botón de WhatsApp se conecta con tu número y muestra tu nombre.
                </p>
              </div>

              {/* Share via WhatsApp */}
              {advisor?.phone && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hola! Te comparto el recorrido virtual 360° de *${tour.title}*.\n\n${advisorUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold text-sm transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar por WhatsApp
                </a>
              )}

              {/* Base tour link */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Link general del tour</p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800/50 border border-gray-700/50">
                  <Link2 className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  <span className="flex-1 text-xs text-gray-400 truncate">{baseUrl}</span>
                  <button onClick={() => copy(baseUrl, 'base')} className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
                    {copied === 'base' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ── Perfil ───────────────────────────────────────────────────── */}
          {tab === 'profile' && (
            <div className="p-4 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Perfil del asesor</p>
                <p className="text-xs text-gray-500 mt-1">Estos datos personalizan tu link, QR y contacto de WhatsApp.</p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-800/60 p-3">
                <AdvisorAvatar advisor={advisor} color={tour.brandColor} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{advisor.name}</p>
                  <p className="text-xs text-gray-500 truncate">{advisor.title || advisor.company || user?.email}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-800/40 p-3">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAdvisorPhoto(file);
                  }}
                />
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-800 px-3 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700 disabled:opacity-60"
                >
                  {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {photoUploading ? 'Subiendo foto...' : 'Cargar foto desde mi teléfono'}
                </button>
                <p className="mt-2 text-center text-[10px] text-gray-600">JPG, PNG o WEBP. Máximo 5 MB.</p>
              </div>

              <AdvisorField label="Nombre">
                <input value={advisorDraft.name} onChange={(e) => setAdvisorDraft((p) => ({ ...p, name: e.target.value }))} className="input-dark" placeholder="Tu nombre" />
              </AdvisorField>
              <AdvisorField label="WhatsApp">
                <input value={advisorDraft.phone} onChange={(e) => setAdvisorDraft((p) => ({ ...p, phone: e.target.value }))} className="input-dark" placeholder="+52 984 000 0000" />
              </AdvisorField>
              <AdvisorField label="Cargo">
                <input value={advisorDraft.title ?? ''} onChange={(e) => setAdvisorDraft((p) => ({ ...p, title: e.target.value }))} className="input-dark" placeholder="Asesor inmobiliario" />
              </AdvisorField>
              <AdvisorField label="Empresa">
                <input value={advisorDraft.company ?? ''} onChange={(e) => setAdvisorDraft((p) => ({ ...p, company: e.target.value }))} className="input-dark" placeholder="Nombre de la inmobiliaria" />
              </AdvisorField>
              <button
                onClick={saveAdvisorProfile}
                disabled={profileSaving}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : profileSaved ? <CheckCheck className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {profileSaved ? 'Perfil guardado' : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* ── Material ──────────────────────────────────────────────────── */}
          {tab === 'material' && (
            <div className="p-4 space-y-5">

              {/* Brochure */}
              {tour.brochureUrl && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Brochure
                  </p>
                  <a
                    href={tour.brochureUrl}
                    download={tour.brochureFilename ?? 'brochure.pdf'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/80 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{tour.brochureFilename ?? 'Brochure'}</p>
                      <p className="text-xs text-gray-500">PDF • Toca para descargar</p>
                    </div>
                    <Download className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                  </a>
                </div>
              )}

              {/* Images */}
              {(tour.gallery?.filter((g) => g.type === 'image').length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Imágenes
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {tour.gallery!.filter((g) => g.type === 'image').map((item) => (
                      <GalleryImageCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Videos */}
              {(tour.gallery?.filter((g) => g.type === 'video').length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Videos
                  </p>
                  <div className="space-y-2">
                    {tour.gallery!.filter((g) => g.type === 'video').map((item) => (
                      <GalleryVideoCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {!hasMaterial && (
                <p className="text-xs text-gray-500 text-center py-8">No hay material configurado para este tour.</p>
              )}
            </div>
          )}

          {/* ── Agendar ───────────────────────────────────────────────────── */}
          {tab === 'booking' && tour.bookingConfig && (
            <div className="p-4 space-y-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Agendar cita con el cliente</p>

              <BookingCTA config={tour.bookingConfig} tourTitle={tour.title} advisorUrl={advisorUrl} brandColor={tour.brandColor} />

              {/* Also show advisor contact */}
              {advisor && (
                <div className="mt-4 p-3 rounded-xl bg-gray-800 border border-gray-700 space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tu contacto configurado</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: tour.brandColor ?? '#1e40af' }}
                    >
                      {advisor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{advisor.name}</p>
                      <p className="text-xs text-gray-400">{advisor.title ?? 'Asesor inmobiliario'}</p>
                      {advisor.phone && <p className="text-xs text-gray-500">{advisor.phone}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Inventario ────────────────────────────────────────────────── */}
          {tab === 'units' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Inventario</p>
                <span className="text-[10px] text-gray-600">{tour.units?.length ?? 0} unidades</span>
              </div>

              {/* Status summary chips */}
              <UnitSummary units={tour.units ?? []} />

              <InventoryFilters
                units={tour.units ?? []}
                prototypes={tour.unitPrototypes ?? []}
                status={unitStatus}
                prototypeId={prototypeFilter}
                onStatusChange={setUnitStatus}
                onPrototypeChange={setPrototypeFilter}
              />

              {/* Unit list */}
              <div className="space-y-1.5">
                {filterUnits(tour.units ?? [], unitStatus, prototypeFilter).map((unit) => (
                  <UnitRow key={unit.id} unit={unit} tour={tour} onNavigate={navigateTo} />
                ))}
                {filterUnits(tour.units ?? [], unitStatus, prototypeFilter).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-800/40 p-5 text-center text-xs text-gray-500">
                    No hay unidades con esos filtros.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Kit de Ventas ─────────────────────────────────────────────── */}
          {tab === 'kit' && (
            <div className="p-4">
              <MaterialsPanel isAdmin={false} />
            </div>
          )}

          {/* ── Novedades ─────────────────────────────────────────────────── */}
          {tab === 'novedades' && (
            <div className="p-4">
              <AnnouncementsSection isAdmin={false} />
            </div>
          )}

        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AdvisorAvatar({ advisor, color, size = 'md' }: { advisor: SalesAdvisor; color?: string; size?: 'sm' | 'md' }) {
  const className = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-11 h-11 text-base';
  if (advisor.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={advisor.photoUrl} alt={advisor.name} className={cn(className, 'rounded-full object-cover border border-white/20 flex-shrink-0')} />
    );
  }
  return (
    <div
      className={cn(className, 'rounded-full flex items-center justify-center text-white font-bold border border-white/20 flex-shrink-0')}
      style={{ background: color ?? '#1e40af' }}
    >
      {(advisor.name || 'A').charAt(0).toUpperCase()}
    </div>
  );
}

function AdvisorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function InventoryFilters({
  units,
  prototypes,
  status,
  prototypeId,
  onStatusChange,
  onPrototypeChange,
}: {
  units: PropertyUnit[];
  prototypes: UnitPrototype[];
  status: InventoryStatusFilter;
  prototypeId: string;
  onStatusChange: (status: InventoryStatusFilter) => void;
  onPrototypeChange: (prototypeId: string) => void;
}) {
  const availableStatuses = (Object.keys(STATUS_CONF) as PropertyUnit['status'][]).filter((key) =>
    units.some((unit) => unit.status === key)
  );

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/45 p-3 space-y-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        <Filter className="w-3.5 h-3.5" />
        Filtros
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onStatusChange('all')}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
            status === 'all' ? 'border-blue-400 bg-blue-500/15 text-blue-200' : 'border-gray-700 text-gray-400 hover:text-white'
          )}
        >
          Todos
        </button>
        {availableStatuses.map((key) => {
          const conf = STATUS_CONF[key];
          return (
            <button
              key={key}
              onClick={() => onStatusChange(key)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
                status === key ? `${conf.bg} ${conf.color} border-current/50` : 'border-gray-700 text-gray-400 hover:text-white'
              )}
            >
              {conf.icon}
              {conf.label}
            </button>
          );
        })}
      </div>
      {prototypes.length > 0 && (
        <select
          value={prototypeId}
          onChange={(e) => onPrototypeChange(e.target.value)}
          className="input-dark text-xs"
        >
          <option value="all">Todos los prototipos</option>
          {prototypes.map((prototype) => (
            <option key={prototype.id} value={prototype.id}>{prototype.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function GalleryImageCard({ item }: { item: GalleryItem }) {
  return (
    <a
      href={item.url}
      download
      target="_blank"
      rel="noopener noreferrer"
      className="relative group rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500/50 transition-colors aspect-video bg-gray-800"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt={item.title ?? ''} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <Download className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
      </div>
      {item.title && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
          <p className="text-[10px] text-white/90 truncate">{item.title}</p>
        </div>
      )}
    </a>
  );
}

function GalleryVideoCard({ item }: { item: GalleryItem }) {
  const isYT    = isYouTube(item.url);
  const isVim   = isVimeo(item.url);
  const isEmbed = isYT || isVim;
  const thumb   = item.thumbnail ?? (isYT ? youtubeThumbnail(item.url) : null);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      download={!isEmbed || undefined}
      className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/80 transition-colors group"
    >
      <div className="relative w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-5 h-5 text-gray-500" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.title ?? 'Video'}</p>
        <p className="text-[10px] text-gray-500">{isYT ? 'YouTube' : isVim ? 'Vimeo' : 'Descargar video'}</p>
      </div>
      {isEmbed
        ? <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
        : <Download     className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
      }
    </a>
  );
}

function BookingCTA({ config, tourTitle, advisorUrl, brandColor }: {
  config: NonNullable<Tour['bookingConfig']>;
  tourTitle: string;
  advisorUrl: string;
  brandColor?: string;
}) {
  const color = brandColor ?? '#059669';

  if (config.method === 'whatsapp' && config.phone) {
    const phone = config.phone.replace(/\D/g, '');
    const text  = encodeURIComponent(`Hola! Me gustaría agendar una cita para ver *${tourTitle}*. ¿Cuándo tendría disponibilidad? 😊\n\nLink del recorrido: ${advisorUrl}`);
    return (
      <a
        href={`https://wa.me/${phone}?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm transition-opacity hover:opacity-90 shadow"
        style={{ background: color }}
      >
        <MessageCircle className="w-4 h-4" />
        {config.ctaLabel ?? 'Agendar cita por WhatsApp'}
      </a>
    );
  }

  if (config.method === 'email' && config.email) {
    const subject = encodeURIComponent(`Solicitud de cita — ${tourTitle}`);
    const body    = encodeURIComponent(`Hola,\n\nMe gustaría agendar una cita para conocer el proyecto ${tourTitle}.\n\nLink del recorrido: ${advisorUrl}\n\nQuedo en espera, gracias.`);
    return (
      <a
        href={`mailto:${config.email}?subject=${subject}&body=${body}`}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm transition-opacity hover:opacity-90 shadow"
        style={{ background: color }}
      >
        <Mail className="w-4 h-4" />
        {config.ctaLabel ?? 'Agendar cita por Email'}
      </a>
    );
  }

  if (config.method === 'calendly' && config.calendlyUrl) {
    return (
      <a
        href={config.calendlyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-sm transition-opacity hover:opacity-90 shadow"
        style={{ background: color }}
      >
        <Calendar className="w-4 h-4" />
        {config.ctaLabel ?? 'Agendar cita en Calendly'}
      </a>
    );
  }

  return null;
}

function UnitSummary({ units }: { units: PropertyUnit[] }) {
  const counts = units.reduce<Record<string, number>>((acc, u) => {
    acc[u.status] = (acc[u.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.entries(counts) as [string, number][]).map(([status, count]) => {
        const conf = STATUS_CONF[status as keyof typeof STATUS_CONF];
        if (!conf) return null;
        return (
          <span key={status} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', conf.bg, conf.color, 'border-current/20')}>
            {conf.icon} {count} {conf.label}
          </span>
        );
      })}
    </div>
  );
}

function UnitRow({ unit, tour, onNavigate }: { unit: PropertyUnit; tour: Tour; onNavigate: (id: string) => void }) {
  const conf   = STATUS_CONF[unit.status];
  const proto  = tour.unitPrototypes?.find((p) => p.id === unit.prototypeId);
  const area   = unit.area    ?? proto?.area;
  const beds   = unit.bedrooms  ?? proto?.bedrooms;
  const baths  = unit.bathrooms ?? proto?.bathrooms;
  const park   = unit.parking   ?? proto?.parking;
  const currency = unit.currency ?? tour.currency ?? 'MXN';

  return (
    <button
      onClick={() => { if (unit.sceneId) onNavigate(unit.sceneId); }}
      disabled={!unit.sceneId}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
        unit.sceneId
          ? 'bg-gray-800 border-gray-700 hover:border-gray-500 cursor-pointer'
          : 'bg-gray-800/50 border-gray-700/50 cursor-default'
      )}
    >
      {/* Status dot */}
      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', {
        'bg-emerald-500': unit.status === 'available',
        'bg-amber-500':   unit.status === 'reserved',
        'bg-red-500':     unit.status === 'sold',
        'bg-blue-500':    unit.status === 'in-process',
      })} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{unit.label}</span>
          {proto && <span className="text-[10px] text-gray-500 truncate hidden sm:block">{proto.name}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {area  != null && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Ruler      className="w-2.5 h-2.5" />{area}m²</span>}
          {beds  != null && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><BedDouble  className="w-2.5 h-2.5" />{beds}</span>}
          {baths != null && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Bath        className="w-2.5 h-2.5" />{baths}</span>}
          {park  != null && <span className="text-[10px] text-gray-500 flex items-center gap-0.5"><Car         className="w-2.5 h-2.5" />{park}</span>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {unit.price && (
          <span className="text-xs font-bold text-white">{formatCurrency(unit.price, currency)}</span>
        )}
        <span className={cn('text-[10px] font-semibold flex items-center gap-0.5', conf.color)}>
          {conf.icon} {conf.label}
        </span>
      </div>

      {unit.sceneId && <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />}
    </button>
  );
}
