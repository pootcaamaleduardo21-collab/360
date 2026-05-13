'use client';

import { useState, useMemo } from 'react';
import { Tour, PropertyUnit, GalleryItem, PropertyStatus } from '@/types/tour.types';
import { POI_CONFIG } from '@/lib/poiTypes';
import { getNiche } from '@/lib/niches';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useTourStore } from '@/store/tourStore';
import {
  X, Building2, Images, FileText, MapPin, Globe,
  Download, Play, ChevronRight, ExternalLink,
  Facebook, Instagram, Youtube, Phone, CheckCircle,
  XCircle, Clock, AlertCircle, Maximize2,
  Heart, SlidersHorizontal, MessageCircle, Trash2,
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SalesPanelProps {
  tour: Tour;
  onClose: () => void;
  onUnitClick?: (unit: PropertyUnit) => void;
  onNavigate?: (sceneId: string) => void;
}

// ─── Tab definition ───────────────────────────────────────────────────────────

type PanelTab = 'units' | 'gallery' | 'brochure' | 'poi';

const UNIT_STATUS = {
  available:    { label: 'Disponible', color: 'text-emerald-600', bg: 'bg-emerald-50',  icon: <CheckCircle  className="w-3 h-3" /> },
  reserved:     { label: 'Reservado',  color: 'text-amber-600',   bg: 'bg-amber-50',    icon: <Clock        className="w-3 h-3" /> },
  sold:         { label: 'Vendido',    color: 'text-red-600',     bg: 'bg-red-50',      icon: <XCircle      className="w-3 h-3" /> },
  'in-process': { label: 'En proceso', color: 'text-blue-600',    bg: 'bg-blue-50',     icon: <AlertCircle  className="w-3 h-3" /> },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function SalesPanel({ tour, onClose, onUnitClick, onNavigate }: SalesPanelProps) {
  const brand = tour.brandColor ?? '#1e40af';
  const niche = getNiche(tour);
  const units = tour.units ?? [];
  const gallery = tour.gallery ?? [];
  const pois = tour.pointsOfInterest ?? [];
  const social = tour.socialLinks ?? {};

  const { wishlistIds, toggleWishlist, clearWishlist } = useTourStore();

  // Build available tabs
  const tabs = useMemo(() => {
    const t: { id: PanelTab; label: string; icon: React.ReactNode }[] = [];
    if (units.length > 0) t.push({ id: 'units',   label: niche.salesPanelTitle, icon: <Building2  className="w-3.5 h-3.5" /> });
    if (gallery.length > 0) t.push({ id: 'gallery', label: 'Galería',    icon: <Images     className="w-3.5 h-3.5" /> });
    if (tour.brochureUrl)   t.push({ id: 'brochure',label: 'Brochure',   icon: <FileText   className="w-3.5 h-3.5" /> });
    if (pois.length > 0)    t.push({ id: 'poi',     label: 'Lugares',    icon: <MapPin     className="w-3.5 h-3.5" /> });
    return t;
  }, [units.length, gallery.length, tour.brochureUrl, pois.length, niche.salesPanelTitle]);

  const [activeTab, setActiveTab] = useState<PanelTab>(tabs[0]?.id ?? 'units');
  const [lightbox,  setLightbox]  = useState<GalleryItem | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [showFilters,    setShowFilters]    = useState(false);
  const [showWishlist,   setShowWishlist]   = useState(false);
  const [filterStatus,   setFilterStatus]   = useState<PropertyStatus | 'all'>('all');
  const [filterBedrooms, setFilterBedrooms] = useState<number | null>(null);
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  const displayName = tour.brandName ?? tour.title;

  // Derive unique floors and bedroom counts present in units
  const uniqueFloors = useMemo(
    () => [...new Set(units.map((u) => u.floor).filter((f): f is number => f != null))].sort((a, b) => a - b),
    [units]
  );
  const uniqueBeds = useMemo(
    () => [...new Set(units.map((u) => u.bedrooms).filter((b): b is number => b != null))].sort((a, b) => a - b),
    [units]
  );
  const hasPrices = units.some((u) => u.price != null);

  // Active filter count (for badge)
  const activeFilterCount = [
    filterStatus !== 'all',
    filterBedrooms !== null,
    filterMinPrice !== '',
    filterMaxPrice !== '',
  ].filter(Boolean).length;

  // Derived: filtered units
  const filteredUnits = useMemo(() => {
    let list = showWishlist ? units.filter((u) => wishlistIds.includes(u.id)) : units;
    if (filterStatus !== 'all') list = list.filter((u) => u.status === filterStatus);
    if (filterBedrooms !== null) list = list.filter((u) => (u.bedrooms ?? 0) === filterBedrooms);
    const minP = parseFloat(filterMinPrice);
    const maxP = parseFloat(filterMaxPrice);
    if (!isNaN(minP)) list = list.filter((u) => u.price != null && u.price >= minP);
    if (!isNaN(maxP)) list = list.filter((u) => u.price != null && u.price <= maxP);
    return list;
  }, [units, showWishlist, wishlistIds, filterStatus, filterBedrooms, filterMinPrice, filterMaxPrice]);

  // Wishlist totals
  const wishlistUnits = useMemo(() => units.filter((u) => wishlistIds.includes(u.id)), [units, wishlistIds]);
  const wishlistTotal = wishlistUnits.reduce((sum, u) => sum + (u.price ?? 0), 0);
  const currency = tour.currency ?? 'MXN';

  // WhatsApp share message
  const buildWhatsAppMessage = () => {
    const lines = [`🏠 *${displayName}* — Mi lista de propiedades:\n`];
    wishlistUnits.forEach((u) => {
      const st = UNIT_STATUS[u.status];
      const proto = tour.unitPrototypes?.find((p) => p.id === u.prototypeId);
      const beds = u.bedrooms ?? proto?.bedrooms;
      const area = u.area ?? proto?.area;
      const parts = [u.label];
      if (beds != null) parts.push(`${beds} rec`);
      if (area != null) parts.push(`${area} m²`);
      if (u.price) parts.push(formatCurrency(u.price, u.currency ?? currency));
      parts.push(st.label);
      lines.push(`• ${parts.join(' · ')}`);
    });
    if (wishlistTotal > 0) {
      lines.push(`\n💰 *Total: ${formatCurrency(wishlistTotal, currency)}*`);
    }
    lines.push(`\nVer tour: ${typeof window !== 'undefined' ? window.location.href : ''}`);
    return encodeURIComponent(lines.join('\n'));
  };

  const whatsappBase = social.whatsapp
    ? `https://wa.me/${social.whatsapp.replace(/\D/g, '')}`
    : 'https://wa.me/';

  return (
    <>
      {/* Panel */}
      <div className="absolute inset-y-0 right-0 z-30 w-full sm:w-96 flex flex-col bg-white shadow-2xl animate-slide-in-right">

        {/* ── Brand header ─────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4 text-white relative"
          style={{ background: `linear-gradient(135deg, ${brand}, ${brand}cc)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3">
            {tour.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tour.logoUrl}
                alt={displayName}
                className="w-12 h-12 rounded-xl object-contain bg-white/20 p-1 flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl flex-shrink-0">
                {displayName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0 pt-0.5">
              <h2 className="font-black text-lg leading-tight truncate">{displayName}</h2>
              {tour.tagline && (
                <p className="text-white/75 text-xs mt-0.5 leading-snug line-clamp-2">{tour.tagline}</p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          {units.length > 0 && (
            <div className="mt-3 flex gap-3 text-center">
              {(['available', 'reserved', 'sold'] as const).map((s) => {
                const count = units.filter((u) => u.status === s).length;
                if (count === 0) return null;
                return (
                  <div key={s} className="flex-1 bg-white/15 rounded-lg py-1.5">
                    <p className="text-lg font-black leading-none">{count}</p>
                    <p className="text-[10px] text-white/70 mt-0.5">{niche.statusLabels[s]}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Tab nav ──────────────────────────────────────────────────────── */}
        {tabs.length > 1 && (
          <div className="flex border-b border-gray-100 flex-shrink-0 bg-white">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors border-b-2',
                  activeTab === tab.id
                    ? 'border-current'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                )}
                style={activeTab === tab.id ? { color: brand, borderColor: brand } : undefined}
              >
                {tab.icon}
                <span className="text-[10px]">{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* UNITS ─────────────────────────────────────────────────────────── */}
          {activeTab === 'units' && (
            <div>
              {/* ── Filter toolbar ─────────────────────────────────────── */}
              <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
                {/* Top row: quick pills + wishlist + filter toggle */}
                <div className="flex items-center gap-2 px-3 py-2">
                  {/* Status quick filter */}
                  <div className="flex gap-1.5 flex-1 overflow-x-auto scrollbar-none">
                    {(['all', 'available', 'reserved', 'sold'] as const).map((f) => {
                      const labels: Record<string, string> = { all: 'Todas', available: 'Disponibles', reserved: 'Reservadas', sold: 'Vendidas' };
                      return (
                        <button
                          key={f}
                          onClick={() => setFilterStatus(f === 'all' ? 'all' : f as PropertyStatus)}
                          className={cn(
                            'flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap',
                            filterStatus === f ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          )}
                          style={filterStatus === f ? { background: brand } : undefined}
                        >
                          {labels[f]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Wishlist toggle */}
                  <button
                    onClick={() => setShowWishlist(!showWishlist)}
                    className={cn(
                      'relative flex-shrink-0 p-1.5 rounded-full transition-colors',
                      showWishlist ? 'bg-rose-100 text-rose-500' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    )}
                    title="Favoritas"
                  >
                    <Heart className={cn('w-4 h-4', showWishlist && 'fill-rose-500')} />
                    {wishlistIds.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center leading-none">
                        {wishlistIds.length}
                      </span>
                    )}
                  </button>

                  {/* Advanced filter toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      'relative flex-shrink-0 p-1.5 rounded-full transition-colors',
                      showFilters ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    )}
                    title="Filtros"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white text-[8px] font-black flex items-center justify-center leading-none"
                        style={{ background: brand }}>
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Advanced filters panel */}
                {showFilters && (
                  <div className="border-t border-gray-100 px-3 py-2.5 space-y-2.5 bg-gray-50">
                    {/* Bedrooms filter */}
                    {uniqueBeds.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Recámaras</p>
                        <div className="flex gap-1.5 flex-wrap">
                          <FilterPill
                            label="Todas"
                            active={filterBedrooms === null}
                            color={brand}
                            onClick={() => setFilterBedrooms(null)}
                          />
                          {uniqueBeds.map((b) => (
                            <FilterPill
                              key={b}
                              label={`${b}`}
                              active={filterBedrooms === b}
                              color={brand}
                              onClick={() => setFilterBedrooms(filterBedrooms === b ? null : b)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price range */}
                    {hasPrices && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Precio</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Mínimo"
                            value={filterMinPrice}
                            onChange={(e) => setFilterMinPrice(e.target.value)}
                            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-gray-400 min-w-0"
                          />
                          <span className="text-gray-300 text-xs">—</span>
                          <input
                            type="number"
                            placeholder="Máximo"
                            value={filterMaxPrice}
                            onChange={(e) => setFilterMaxPrice(e.target.value)}
                            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-gray-400 min-w-0"
                          />
                        </div>
                      </div>
                    )}

                    {/* Reset */}
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => { setFilterStatus('all'); setFilterBedrooms(null); setFilterMinPrice(''); setFilterMaxPrice(''); }}
                        className="text-[11px] text-gray-400 hover:text-gray-600 underline"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                )}

                {/* Wishlist mode header */}
                {showWishlist && (
                  <div className="flex items-center justify-between border-t border-rose-100 bg-rose-50 px-3 py-1.5">
                    <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-rose-500" />
                      {wishlistUnits.length} favorita{wishlistUnits.length !== 1 ? 's' : ''}
                      {wishlistTotal > 0 && <span className="font-normal text-rose-500"> · {formatCurrency(wishlistTotal, currency)}</span>}
                    </p>
                    {wishlistIds.length > 0 && (
                      <button
                        onClick={clearWishlist}
                        className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Limpiar lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Count row */}
                <div className="px-3 pb-1.5 flex items-center">
                  <span className="text-[10px] text-gray-400">
                    {filteredUnits.length} {niche.overlayCountLabel}
                  </span>
                </div>
              </div>

              {/* Unit list */}
              <ul className="divide-y divide-gray-50">
                {filteredUnits.length === 0 ? (
                  <li className="py-12 flex flex-col items-center gap-2 text-center px-4">
                    {showWishlist
                      ? <Heart className="w-8 h-8 text-gray-200" />
                      : <Building2 className="w-8 h-8 text-gray-200" />
                    }
                    <p className="text-sm text-gray-400">
                      {showWishlist ? 'Agrega propiedades a tus favoritas con ❤' : 'Sin resultados con los filtros actuales'}
                    </p>
                  </li>
                ) : (
                  filteredUnits.map((unit) => {
                    const proto = tour.unitPrototypes?.find((p) => p.id === unit.prototypeId);
                    const st = UNIT_STATUS[unit.status];
                    const area = unit.area ?? proto?.area;
                    const beds = unit.bedrooms ?? proto?.bedrooms;
                    const isWishlisted = wishlistIds.includes(unit.id);

                    return (
                      <li key={unit.id} className="relative">
                        <button
                          onClick={() => onUnitClick?.(unit)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                        >
                          {/* Status accent */}
                          <div
                            className="w-1 self-stretch rounded-full flex-shrink-0"
                            style={{
                              background: unit.status === 'available' ? '#10b981'
                                : unit.status === 'reserved' ? '#f59e0b'
                                : unit.status === 'sold' ? '#ef4444' : '#3b82f6',
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-gray-900 truncate">{unit.label}</p>
                              <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', st.bg, st.color)}>
                                {st.icon}{niche.statusLabels[unit.status]}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-0.5 text-xs text-gray-500">
                              {area  != null && <span>{area} m²</span>}
                              {beds  != null && <span>· {beds} rec</span>}
                              {unit.floor != null && <span>· Piso {unit.floor}</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {unit.price ? (
                              <p className="text-sm font-black text-gray-900">
                                {formatCurrency(unit.price, unit.currency ?? currency)}
                              </p>
                            ) : null}
                            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-0.5" />
                          </div>
                        </button>

                        {/* Heart toggle — positioned absolute so it doesn't break row layout */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleWishlist(unit.id); }}
                          className={cn(
                            'absolute right-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors',
                            isWishlisted
                              ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                              : 'text-gray-300 hover:text-rose-400 hover:bg-rose-50'
                          )}
                          title={isWishlisted ? 'Quitar de favoritas' : 'Agregar a favoritas'}
                        >
                          <Heart className={cn('w-3.5 h-3.5', isWishlisted && 'fill-rose-500')} />
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>

              {/* WhatsApp export — only shown in wishlist mode with items */}
              {showWishlist && wishlistUnits.length > 0 && (
                <div className="px-4 py-4 border-t border-gray-100 bg-white">
                  <a
                    href={`${whatsappBase}?text=${buildWhatsAppMessage()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                    style={{ background: '#25d366' }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Compartir por WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}

          {/* GALLERY ──────────────────────────────────────────────────────── */}
          {activeTab === 'gallery' && (
            <div className="p-3 space-y-3">
              {/* Images grid */}
              {gallery.filter((i) => i.type === 'image').length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">Fotografías</p>
                  <div className="grid grid-cols-2 gap-2">
                    {gallery.filter((i) => i.type === 'image').map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setLightbox(item)}
                        className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt={item.title ?? ''} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        {item.title && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-2 py-1.5">
                            <p className="text-white text-[10px] font-medium truncate">{item.title}</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Videos list */}
              {gallery.filter((i) => i.type === 'video').length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mt-4">Videos</p>
                  <div className="space-y-2">
                    {gallery.filter((i) => i.type === 'video').map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.thumbnail
                            ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
                            : <Play className="w-5 h-5 text-gray-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.title ?? 'Ver video'}</p>
                          <p className="text-[10px] text-gray-400">Abrir video →</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* BROCHURE ─────────────────────────────────────────────────────── */}
          {activeTab === 'brochure' && tour.brochureUrl && (
            <div className="p-5 flex flex-col items-center gap-5">
              {/\.(jpe?g|png|webp|gif)$/i.test(tour.brochureUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tour.brochureUrl}
                  alt="Brochure"
                  className="w-full rounded-2xl shadow-lg border border-gray-100 object-contain max-h-96"
                />
              ) : (
                <div className="w-full aspect-[3/4] max-h-96 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3">
                  <FileText className="w-16 h-16 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">
                    {tour.brochureFilename ?? 'Brochure del proyecto'}
                  </p>
                  <p className="text-xs text-gray-400">PDF disponible para descarga</p>
                </div>
              )}

              <a
                href={tour.brochureUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={tour.brochureFilename}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm shadow-lg transition-opacity hover:opacity-90 w-full justify-center"
                style={{ background: brand }}
              >
                <Download className="w-4 h-4" />
                Descargar brochure
              </a>
            </div>
          )}

          {/* POI ──────────────────────────────────────────────────────────── */}
          {activeTab === 'poi' && (
            <div className="p-4 space-y-2">
              <p className="text-xs text-gray-400 mb-3">Puntos de interés cercanos al desarrollo</p>
              {Object.entries(
                pois.reduce<Record<string, typeof pois>>((acc, poi) => {
                  (acc[poi.category] ??= []).push(poi);
                  return acc;
                }, {})
              ).map(([cat, items]) => {
                const cfg = POI_CONFIG[cat as keyof typeof POI_CONFIG] ?? POI_CONFIG.other;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-1.5 mt-3">
                      <span className="text-base">{cfg.emoji}</span>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cfg.label}</p>
                    </div>
                    <div className="space-y-1">
                      {items.map((poi) => (
                        <div
                          key={poi.id}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-gray-50"
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: cfg.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{poi.label}</p>
                            {poi.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{poi.description}</p>
                            )}
                          </div>
                          {poi.distance && (
                            <span className="text-xs font-semibold text-gray-400 flex-shrink-0 self-center">
                              {poi.distance}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Social / Contact footer ───────────────────────────────────────── */}
        {(social.website || social.facebook || social.instagram || social.youtube || social.whatsapp || social.tiktok) && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Síguenos</p>
            <div className="flex items-center gap-2 flex-wrap">
              {social.website && (
                <SocialBtn href={social.website} color={brand} icon={<Globe className="w-4 h-4" />} label="Web" />
              )}
              {social.facebook && (
                <SocialBtn href={social.facebook} color="#1877f2" icon={<Facebook className="w-4 h-4" />} label="Facebook" />
              )}
              {social.instagram && (
                <SocialBtn href={social.instagram} color="#e1306c" icon={<Instagram className="w-4 h-4" />} label="Instagram" />
              )}
              {social.youtube && (
                <SocialBtn href={social.youtube} color="#ff0000" icon={<Youtube className="w-4 h-4" />} label="YouTube" />
              )}
              {social.tiktok && (
                <SocialBtn href={social.tiktok} color="#010101" icon={<span className="text-xs font-black">TK</span>} label="TikTok" />
              )}
              {social.whatsapp && (
                <SocialBtn
                  href={`https://wa.me/${social.whatsapp.replace(/\D/g, '')}`}
                  color="#25d366"
                  icon={<Phone className="w-4 h-4" />}
                  label="WhatsApp"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="absolute inset-0 z-40 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.title ?? ''}
            className="max-w-full max-h-full object-contain p-8"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.title && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm font-medium">
              {lightbox.title}
            </p>
          )}
        </div>
      )}
    </>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({ label, active, color, onClick }: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors',
        active ? 'text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
      )}
      style={active ? { background: color } : undefined}
    >
      {label}
    </button>
  );
}

// ─── Social button ────────────────────────────────────────────────────────────

function SocialBtn({ href, color, icon, label }: {
  href: string;
  color: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold transition-opacity hover:opacity-85"
      style={{ background: color }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}
