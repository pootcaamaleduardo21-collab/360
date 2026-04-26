'use client';

import { useState, useCallback } from 'react';
import { PropertyStatus, Tour, PropertyUnit } from '@/types/tour.types';
import { getNiche } from '@/lib/niches';
import { formatCurrency } from '@/lib/utils';
import {
  X, Share2, Phone, MessageCircle, ChevronRight,
  Maximize2, BedDouble, Bath, Car, Ruler, Building2,
  CheckCircle, XCircle, Clock, AlertCircle, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface UnitDetailModalProps {
  unit: PropertyUnit;
  tour: Tour;
  onClose: () => void;
  onNavigate?: (sceneId: string) => void;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<PropertyStatus, {
  color: string; bg: string; border: string; bar: string; icon: React.ReactNode;
}> = {
  available:    { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  reserved:     { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: 'bg-amber-500',   icon: <Clock       className="w-3.5 h-3.5" /> },
  sold:         { color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     bar: 'bg-red-500',     icon: <XCircle     className="w-3.5 h-3.5" /> },
  'in-process': { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    bar: 'bg-blue-500',    icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function UnitDetailModal({ unit, tour, onClose, onNavigate }: UnitDetailModalProps) {
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [copied,        setCopied]        = useState(false);

  // Resolve effective values — unit fields override prototype
  const niche   = getNiche(tour);
  const proto   = tour.unitPrototypes?.find((p) => p.id === unit.prototypeId);
  const advisor = tour.salesAdvisor;

  const ef = {
    bedrooms:     unit.bedrooms    ?? proto?.bedrooms,
    bathrooms:    unit.bathrooms   ?? proto?.bathrooms,
    parking:      unit.parking     ?? proto?.parking,
    area:         unit.area        ?? proto?.area,
    description:  unit.description ?? proto?.description,
    floorPlanUrl: unit.floorPlanUrl ?? proto?.floorPlanUrl,
    amenities:    unit.amenities   ?? proto?.amenities ?? [],
    currency:     unit.currency    ?? tour.currency    ?? 'MXN',
  };

  const st = STATUS_STYLE[unit.status];

  // ── Tour URL with unit deep-link ───────────────────────────────────────────
  const tourUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?unit=${unit.id}`
    : '';

  // ── Message builders ───────────────────────────────────────────────────────

  const buildShareMsg = useCallback(() => {
    const lines: string[] = [
      `🏠 *${unit.label}* — ${tour.title}`,
      `📋 Estado: ${niche.statusLabels[unit.status]}`,
    ];
    if (unit.price) lines.push(`💰 Precio: ${formatCurrency(unit.price, ef.currency)}`);
    if (ef.area)    lines.push(`📐 Superficie: ${ef.area} m²`);
    const specs = [
      ef.bedrooms  != null ? `🛏 ${ef.bedrooms} rec`      : null,
      ef.bathrooms != null ? `🚿 ${ef.bathrooms} baños`   : null,
      ef.parking   != null ? `🚗 ${ef.parking} cajón(es)` : null,
    ].filter(Boolean).join(' · ');
    if (specs) lines.push(specs);
    if (ef.amenities.length) lines.push(`✨ Incluye: ${ef.amenities.map((a) => a.label).join(', ')}`);
    if (ef.description) lines.push('', ef.description);
    lines.push('', '📱 Tour 360° completo:', tourUrl);
    return lines.join('\n');
  }, [unit, tour, st, ef, tourUrl]);

  const buildInterestMsg = useCallback(() =>
    `Hola ${advisor?.name ?? niche.ctaAdvisorLabel}! Vi el tour 360° de *${tour.title}* y me interesa ${niche.unitLabel.toLowerCase()} *${unit.label}*. ¿Me podrías dar más información? 😊`,
    [unit, tour, advisor, niche]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (typeof navigator === 'undefined') return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${unit.label} — ${tour.title}`, url: tourUrl });
        return;
      } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(tourUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [tourUrl, unit, tour]);

  const handleInterest = () => {
    if (!advisor?.phone) return;
    const phone = advisor.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildInterestMsg())}`, '_blank');
  };

  const handleAdvisorShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareMsg())}`, '_blank');
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        {/* Card — bottom sheet on mobile, centered on desktop */}
        <div
          className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Status color bar */}
          <div className={cn('h-1.5 flex-shrink-0', st.bar)} />

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1">

            {/* Header */}
            <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                  st.bg, st.color, st.border
                )}>
                  {st.icon}
                  {niche.statusLabels[unit.status]}
                </div>
                <h2 className="text-xl font-black text-gray-900 mt-1.5 leading-tight">{unit.label}</h2>
                {(unit.floor != null || unit.orientation) && (
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {[unit.floor != null ? `Piso ${unit.floor}` : null, unit.orientation].filter(Boolean).join(' · ')}
                  </p>
                )}
                {proto && (
                  <p className="text-xs text-gray-400 mt-0.5">{proto.name}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Price */}
            {unit.price ? (
              <div className="px-5 pb-3">
                <span className="text-3xl font-black text-gray-900">
                  {formatCurrency(unit.price, ef.currency)}
                </span>
                {tour.listingType === 'rent' && (
                  <span className="text-gray-400 text-sm ml-1">/mes</span>
                )}
              </div>
            ) : null}

            {/* Specs row */}
            {(ef.area || ef.bedrooms != null || ef.bathrooms != null || ef.parking != null) && (
              <div className="px-5 pb-4 grid grid-cols-4 gap-1.5">
                {ef.area       != null && <SpecBadge icon={<Ruler     className="w-3.5 h-3.5" />} value={`${ef.area}`}        label="m²"    />}
                {ef.bedrooms   != null && <SpecBadge icon={<BedDouble  className="w-3.5 h-3.5" />} value={`${ef.bedrooms}`}   label="Rec"   />}
                {ef.bathrooms  != null && <SpecBadge icon={<Bath       className="w-3.5 h-3.5" />} value={`${ef.bathrooms}`}  label="Baños" />}
                {ef.parking    != null && <SpecBadge icon={<Car        className="w-3.5 h-3.5" />} value={`${ef.parking}`}    label="Auto"  />}
              </div>
            )}

            {/* Description */}
            {ef.description && (
              <div className="px-5 pb-4">
                <p className="text-sm text-gray-600 leading-relaxed">{ef.description}</p>
              </div>
            )}

            {/* Amenities */}
            {ef.amenities.length > 0 && (
              <div className="px-5 pb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Equipamiento incluido</p>
                <div className="flex flex-wrap gap-2">
                  {ef.amenities.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium"
                    >
                      {a.icon && <span className="text-sm">{a.icon}</span>}
                      {a.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Unit floor plan thumbnail */}
            {ef.floorPlanUrl && (
              <div className="px-5 pb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{niche.floorPlanLabel}</p>
                <button
                  onClick={() => setShowFloorPlan(true)}
                  className="relative w-full rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ef.floorPlanUrl}
                    alt="Plano"
                    className="w-full h-36 object-contain bg-gray-50"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                  </div>
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-5 pb-5 space-y-2.5">
              {unit.sceneId && (
                <button
                  onClick={() => { onNavigate?.(unit.sceneId!); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-2xl transition-colors text-sm"
                >
                  Ver tour interior 360°
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* "Me interesa" → WhatsApp to advisor */}
              {advisor?.phone && unit.status !== 'sold' && (
                <button
                  onClick={handleInterest}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold rounded-2xl transition-colors text-sm shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  {niche.ctaLabel} — Escribir al {niche.ctaAdvisorLabel.toLowerCase()}
                </button>
              )}

              {/* Share row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
                >
                  {copied
                    ? <><Check className="w-4 h-4 text-emerald-500" /> Copiado</>
                    : <><Share2 className="w-4 h-4" /> Compartir</>
                  }
                </button>
                <button
                  onClick={handleAdvisorShare}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C45] text-sm font-medium transition-colors border border-[#25D366]/30"
                >
                  <Share2 className="w-4 h-4" />
                  Enviar info
                </button>
              </div>
            </div>
          </div>

          {/* Advisor footer */}
          {advisor && (
            <div className="flex-shrink-0 border-t border-gray-100 px-5 py-3 flex items-center gap-3 bg-gray-50">
              {advisor.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={advisor.photoUrl}
                  alt={advisor.name}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                  {advisor.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{advisor.name}</p>
                <p className="text-xs text-gray-500 truncate">{advisor.title ?? advisor.company ?? 'Asesor inmobiliario'}</p>
              </div>
              {advisor.phone && (
                <a
                  href={`tel:${advisor.phone}`}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors shadow-sm"
                  title="Llamar"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floor plan lightbox */}
      {showFloorPlan && ef.floorPlanUrl && (
        <div
          className="absolute inset-0 z-50 bg-black/92 flex items-center justify-center"
          onClick={() => setShowFloorPlan(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            onClick={() => setShowFloorPlan(false)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ef.floorPlanUrl}
            alt="Plano ampliado"
            className="max-w-full max-h-full object-contain p-8"
          />
        </div>
      )}
    </>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function SpecBadge({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl bg-gray-50 border border-gray-100">
      <span className="text-gray-500">{icon}</span>
      <span className="text-sm font-bold text-gray-900 leading-none">{value}</span>
      <span className="text-[10px] text-gray-400 font-medium">{label}</span>
    </div>
  );
}
