'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tour } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { saveTour, updateTourPublishing, slugify } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import {
  Globe, Lock, Copy, CheckCheck, ExternalLink, QrCode,
  Loader2, AlertCircle, RefreshCw, Link2,
  Eye, EyeOff, Calendar, Phone, Mail, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

async function sha256hex(text: string): Promise<string> {
  const buf  = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
import QRCode from 'qrcode';

interface EmbedPanelProps {
  tour: Tour;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const IFRAME_SIZES = [
  { label: 'Completo', width: '100%', height: '600' },
  { label: '16:9',     width: '854',  height: '480' },
  { label: '4:3',      width: '640',  height: '480' },
  { label: 'Cuadrado', width: '600',  height: '600' },
];

export function EmbedPanel({ tour }: EmbedPanelProps) {
  const { user } = useAuth();
  const updateTour = useTourStore((s) => s.updateTour);

  const [isPublished,  setIsPublished]  = useState(false);
  const [slug,         setSlug]         = useState('');
  const [saveStatus,   setSaveStatus]   = useState<SaveStatus>('idle');
  const [saveError,    setSaveError]    = useState<string | null>(null);
  const [copied,       setCopied]       = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState(0);
  const [qrDataUrl,    setQrDataUrl]    = useState<string | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // ── Password protection ──────────────────────────────────────────────────
  const [pwEnabled,   setPwEnabled]   = useState(!!tour.passwordEnabled);
  const [pwInput,     setPwInput]     = useState('');
  const [pwShow,      setPwShow]      = useState(false);
  const [pwSaved,     setPwSaved]     = useState(false);

  const handleSavePassword = useCallback(async () => {
    if (!pwInput.trim()) return;
    const hash = await sha256hex(pwInput.trim());
    updateTour({ passwordEnabled: true, passwordHash: hash } as any);
    setPwEnabled(true);
    setPwSaved(true);
    setPwInput('');
    setTimeout(() => setPwSaved(false), 2500);
  }, [pwInput, updateTour]);

  const handleTogglePassword = (enabled: boolean) => {
    setPwEnabled(enabled);
    updateTour({ passwordEnabled: enabled } as any);
  };

  // ── Booking config ───────────────────────────────────────────────────────
  const bc = tour.bookingConfig ?? { method: 'whatsapp' as const };
  const [bkEnabled, setBkEnabled] = useState(!!tour.bookingEnabled);
  const [bkMethod,  setBkMethod]  = useState<'whatsapp' | 'email' | 'calendly'>(bc.method ?? 'whatsapp');
  const [bkPhone,   setBkPhone]   = useState(bc.phone ?? '');
  const [bkEmail,   setBkEmail]   = useState(bc.email ?? '');
  const [bkCalendly,setBkCalendly]= useState(bc.calendlyUrl ?? '');
  const [bkLabel,   setBkLabel]   = useState(bc.ctaLabel ?? '');

  const saveBooking = useCallback(() => {
    updateTour({
      bookingEnabled: bkEnabled,
      bookingConfig: {
        method:      bkMethod,
        phone:       bkPhone   || undefined,
        email:       bkEmail   || undefined,
        calendlyUrl: bkCalendly|| undefined,
        ctaLabel:    bkLabel   || undefined,
      },
    } as any);
  }, [bkEnabled, bkMethod, bkPhone, bkEmail, bkCalendly, bkLabel, updateTour]);

  const baseUrl    = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl  = slug ? `${baseUrl}/viewer/${slug}` : `${baseUrl}/viewer/${tour.id}`;
  const iframeSize = IFRAME_SIZES[selectedSize];
  const iframeCode = `<iframe
  src="${publicUrl}"
  width="${iframeSize.width}"
  height="${iframeSize.height}"
  frameborder="0"
  allowfullscreen
  allow="xr-spatial-tracking"
  title="${tour.title}"
></iframe>`;

  // Generate QR when URL changes
  useEffect(() => {
    if (!isPublished) return;
    QRCode.toDataURL(publicUrl, { width: 200, margin: 1, color: { dark: '#ffffff', light: '#00000000' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [publicUrl, isPublished]);

  const handleSaveAndPublish = async () => {
    if (!user) return;
    setSaveStatus('saving');
    setSaveError(null);

    try {
      // 1. Save full tour data to DB
      await saveTour(tour);

      // 2. Update publishing state
      const finalSlug = slug || slugify(tour.title);
      await updateTourPublishing(tour.id, { isPublished: true, shareSlug: finalSlug });

      setSlug(finalSlug);
      setIsPublished(true);
      setSaveStatus('saved');

      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveError(err.message ?? 'Error al publicar');
      setSaveStatus('error');
    }
  };

  const handleUnpublish = async () => {
    try {
      await updateTourPublishing(tour.id, { isPublished: false });
      setIsPublished(false);
      setQrDataUrl(null);
    } catch {}
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      await saveTour(tour);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setSaveError(err.message);
      setSaveStatus('error');
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // sync booking changes to store on each field change
  useEffect(() => { saveBooking(); }, [bkEnabled, bkMethod, bkPhone, bkEmail, bkCalendly, bkLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 space-y-5">
      {/* Save to cloud */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Guardar</h3>

        <button
          onClick={handleSaveDraft}
          disabled={saveStatus === 'saving'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm font-medium text-gray-300 transition-colors disabled:opacity-50"
        >
          {saveStatus === 'saving' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
          ) : saveStatus === 'saved' && !isPublished ? (
            <><CheckCheck className="w-4 h-4 text-green-400" /> Guardado</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Guardar borrador</>
          )}
        </button>

        {saveError && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5" /> {saveError}
          </p>
        )}
      </section>

      <div className="border-t border-gray-700/50" />

      {/* Publishing */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Publicación</h3>

        {/* Status badge */}
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-xl border text-sm',
          isPublished
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-gray-800 border-gray-700 text-gray-500'
        )}>
          {isPublished ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span className="font-medium">
            {isPublished ? 'Publicado y visible al público' : 'Borrador — solo tú puedes verlo'}
          </span>
        </div>

        {/* Slug input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">URL personalizada (slug)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 whitespace-nowrap">/viewer/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="input-dark flex-1 text-xs"
              placeholder={slugify(tour.title) || 'mi-propiedad'}
            />
          </div>
        </div>

        {/* Action buttons */}
        {!isPublished ? (
          <button
            onClick={handleSaveAndPublish}
            disabled={saveStatus === 'saving' || !user}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {saveStatus === 'saving' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Publicando…</>
            ) : (
              <><Globe className="w-4 h-4" /> Publicar tour</>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-1.5 text-xs text-green-400 justify-center">
                <CheckCheck className="w-3.5 h-3.5" /> Tour guardado y publicado
              </div>
            )}
            <button
              onClick={handleUnpublish}
              className="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-medium transition-colors border border-gray-700"
            >
              Despublicar (convertir a borrador)
            </button>
          </div>
        )}

        {!user && (
          <p className="text-xs text-amber-400 text-center">
            Inicia sesión para publicar y guardar en la nube.
          </p>
        )}
      </section>

      {/* Public link + copy */}
      {isPublished && (
        <>
          <div className="border-t border-gray-700/50" />

          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Link público</h3>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800 border border-gray-700">
              <Link2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="flex-1 text-xs text-gray-300 truncate">{publicUrl}</span>
              <button
                onClick={() => copy(publicUrl, 'url')}
                className="text-gray-500 hover:text-white transition-colors"
              >
                {copied === 'url' ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR del tour" className="w-32 h-32 rounded-xl bg-gray-800 p-2" />
                <a
                  href={qrDataUrl}
                  download={`qr-${slug || tour.id}.png`}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  <QrCode className="w-3 h-3" /> Descargar QR
                </a>
              </div>
            )}
          </section>

          <div className="border-t border-gray-700/50" />

          {/* Iframe embed */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Código de embed</h3>

            {/* Size selector */}
            <div className="flex gap-1.5 flex-wrap">
              {IFRAME_SIZES.map((size, i) => (
                <button
                  key={size.label}
                  onClick={() => setSelectedSize(i)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                    selectedSize === i
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                  )}
                >
                  {size.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                readOnly
                value={iframeCode}
                className="input-dark text-xs font-mono h-28 resize-none w-full"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <button
                onClick={() => copy(iframeCode, 'iframe')}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
              >
                {copied === 'iframe'
                  ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                  : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Pega este código en cualquier web, CRM o plataforma inmobiliaria.
            </p>
          </section>
        </>
      )}

      <div className="border-t border-gray-700/50" />

      {/* ── Password protection ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Protección por contraseña
        </h3>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-400">Activar protección</span>
          <button
            onClick={() => handleTogglePassword(!pwEnabled)}
            className={cn(
              'relative w-10 h-5 rounded-full transition-colors',
              pwEnabled ? 'bg-blue-600' : 'bg-gray-700'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
              pwEnabled ? 'translate-x-5' : 'translate-x-0.5'
            )} />
          </button>
        </label>

        {pwEnabled && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              {tour.passwordHash ? '✓ Contraseña guardada. Escribe una nueva para cambiarla.' : 'Define la contraseña de acceso.'}
            </p>
            <div className="relative">
              <input
                type={pwShow ? 'text' : 'password'}
                value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                placeholder="Nueva contraseña…"
                className="input-dark w-full pr-9 text-xs"
              />
              <button
                type="button"
                onClick={() => setPwShow((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {pwShow ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={handleSavePassword}
              disabled={!pwInput.trim()}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              {pwSaved ? <><CheckCheck className="w-3.5 h-3.5" /> Guardada</> : <><Lock className="w-3.5 h-3.5" /> Guardar contraseña</>}
            </button>
          </div>
        )}
      </section>

      <div className="border-t border-gray-700/50" />

      {/* ── Booking / appointment ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Integración de reservas
        </h3>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-400">Mostrar botón de cita</span>
          <button
            onClick={() => setBkEnabled((v) => !v)}
            className={cn('relative w-10 h-5 rounded-full transition-colors', bkEnabled ? 'bg-blue-600' : 'bg-gray-700')}
          >
            <span className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', bkEnabled ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
        </label>

        {bkEnabled && (
          <div className="space-y-2.5">
            {/* Method selector */}
            <div className="grid grid-cols-3 gap-1">
              {(['whatsapp', 'email', 'calendly'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setBkMethod(m)}
                  className={cn(
                    'py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize',
                    bkMethod === m ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                  )}
                >
                  {m === 'whatsapp' ? 'WhatsApp' : m === 'email' ? 'Email' : 'Calendly'}
                </button>
              ))}
            </div>

            {/* Method-specific fields */}
            {bkMethod === 'whatsapp' && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <input
                  type="tel"
                  value={bkPhone}
                  onChange={(e) => setBkPhone(e.target.value)}
                  placeholder="+52155…"
                  className="input-dark flex-1 text-xs"
                />
              </div>
            )}

            {bkMethod === 'email' && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <input
                  type="email"
                  value={bkEmail}
                  onChange={(e) => setBkEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="input-dark flex-1 text-xs"
                />
              </div>
            )}

            {bkMethod === 'calendly' && (
              <div className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <input
                  type="url"
                  value={bkCalendly}
                  onChange={(e) => setBkCalendly(e.target.value)}
                  placeholder="https://calendly.com/tu-link"
                  className="input-dark flex-1 text-xs"
                />
              </div>
            )}

            {/* CTA label override */}
            <input
              type="text"
              value={bkLabel}
              onChange={(e) => setBkLabel(e.target.value)}
              placeholder={`Texto del botón (ej. "Agendar visita")`}
              className="input-dark w-full text-xs"
            />

            <p className="text-[10px] text-gray-600">
              Los cambios se guardan automáticamente.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
