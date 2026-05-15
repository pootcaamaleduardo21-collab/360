'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Hotspot, HotspotType, HotspotStyle, HotspotAnimation,
  Scene, PropertyStatus,
} from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import {
  Trash2, ArrowRight, Info, Image, User, ShoppingCart, Building2, MapPin,
  Search, Loader2, Navigation, Ban,
  DoorOpen, BedDouble, BedSingle, Bath, ChefHat, Sofa, Armchair, Tv, MonitorPlay,
  Dumbbell, Waves, Wifi, Car, Trees, Flower2, Zap, Flame, Snowflake, Wind, Sun,
  Home, Key, Store, Hotel, Warehouse, Landmark, ParkingCircle,
  School, Hospital, ShoppingBag, Coffee, Church, Star, Eye,
  HelpCircle, Heart, Bookmark, Bell, Navigation2, Compass, CornerUpRight,
  Utensils, Package, Tag, Camera, Music, Video, FileText, Globe,
  Phone, Mail, Lock, Unlock, Wrench, Hammer,
  Leaf, Mountain, Umbrella, Sunset, Bike, Bus, Train, Plane,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ICON_REGISTRY } from '@/components/viewer/HotspotMarker';
import { cn } from '@/lib/utils';

// ─── Haversine distance ───────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lng2 - lng1) * Math.PI / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatWalkTime(km: number): string {
  const min = Math.round((km / 5) * 60); // avg 5 km/h
  if (min < 60) return `${min} min caminando`;
  return `${Math.floor(min / 60)}h ${min % 60}min caminando`;
}

// ─── Google Places suggestions ────────────────────────────────────────────────

interface PlaceSuggestion {
  placeId:       string;
  description:   string;
  mainText:      string;
  secondaryText: string;
}

interface PlaceDetails {
  lat: number | null;
  lng: number | null;
  formattedAddress: string;
  name: string;
}

interface RouteSummary {
  summary: string;
}

const TYPE_OPTIONS: { value: HotspotType; label: string; icon: React.ReactNode }[] = [
  { value: 'navigation', label: 'Navegación',  icon: <ArrowRight   className="w-3.5 h-3.5" /> },
  { value: 'info',       label: 'Información', icon: <Info         className="w-3.5 h-3.5" /> },
  { value: 'media',      label: 'Media',       icon: <Image        className="w-3.5 h-3.5" /> },
  { value: 'agent',      label: 'Agente',      icon: <User         className="w-3.5 h-3.5" /> },
  { value: 'product',    label: 'Producto',    icon: <ShoppingCart className="w-3.5 h-3.5" /> },
  { value: 'unit',       label: 'Unidad',      icon: <Building2    className="w-3.5 h-3.5" /> },
  { value: 'map',        label: 'Mapa / POI',  icon: <MapPin       className="w-3.5 h-3.5" /> },
];

const STYLE_OPTIONS: { value: HotspotStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'bubble',     label: 'Burbuja',     emoji: '⭕', desc: 'Círculo flotante' },
  { value: 'floor',      label: 'Piso',        emoji: '🔵', desc: 'Anillo perspectiva' },
  { value: 'wall',       label: 'Pared',       emoji: '🔲', desc: 'Badge rectangular' },
  { value: 'label',      label: 'Etiqueta',    emoji: '📍', desc: 'Pin tipo Maps' },
  { value: 'icon-badge', label: 'Ícono',       emoji: '🟦', desc: 'Tarjeta grande' },
];

const ANIM_OPTIONS: { value: HotspotAnimation; label: string }[] = [
  { value: 'ping',  label: 'Ping' },
  { value: 'pulse', label: 'Pulso' },
  { value: 'glow',  label: 'Brillo' },
  { value: 'none',  label: 'Ninguna' },
];

// ─── Icon library ─────────────────────────────────────────────────────────────

const ICON_LIBRARY: { label: string; icons: { name: string; Icon: LucideIcon }[] }[] = [
  { label: 'Navegación', icons: [
    { name: 'ArrowRight', Icon: ArrowRight }, { name: 'Navigation2', Icon: Navigation2 },
    { name: 'Compass', Icon: Compass }, { name: 'CornerUpRight', Icon: CornerUpRight },
  ]},
  { label: 'Espacios', icons: [
    { name: 'DoorOpen', Icon: DoorOpen }, { name: 'BedDouble', Icon: BedDouble },
    { name: 'BedSingle', Icon: BedSingle }, { name: 'Bath', Icon: Bath },
    { name: 'ChefHat', Icon: ChefHat }, { name: 'Sofa', Icon: Sofa },
    { name: 'Armchair', Icon: Armchair }, { name: 'Tv', Icon: Tv },
    { name: 'MonitorPlay', Icon: MonitorPlay }, { name: 'Dumbbell', Icon: Dumbbell },
  ]},
  { label: 'Amenidades', icons: [
    { name: 'Waves', Icon: Waves }, { name: 'Wifi', Icon: Wifi },
    { name: 'Car', Icon: Car }, { name: 'ParkingCircle', Icon: ParkingCircle },
    { name: 'Trees', Icon: Trees }, { name: 'Flower2', Icon: Flower2 },
    { name: 'Zap', Icon: Zap }, { name: 'Flame', Icon: Flame },
    { name: 'Snowflake', Icon: Snowflake }, { name: 'Wind', Icon: Wind },
    { name: 'Sun', Icon: Sun }, { name: 'Umbrella', Icon: Umbrella },
  ]},
  { label: 'Propiedad', icons: [
    { name: 'Home', Icon: Home }, { name: 'Building2', Icon: Building2 },
    { name: 'Key', Icon: Key }, { name: 'Store', Icon: Store },
    { name: 'Hotel', Icon: Hotel }, { name: 'Warehouse', Icon: Warehouse },
    { name: 'Landmark', Icon: Landmark }, { name: 'Lock', Icon: Lock },
    { name: 'Unlock', Icon: Unlock }, { name: 'Wrench', Icon: Wrench },
    { name: 'Hammer', Icon: Hammer },
  ]},
  { label: 'Lugares', icons: [
    { name: 'School', Icon: School }, { name: 'Hospital', Icon: Hospital },
    { name: 'ShoppingBag', Icon: ShoppingBag }, { name: 'Coffee', Icon: Coffee },
    { name: 'Utensils', Icon: Utensils }, { name: 'Church', Icon: Church },
    { name: 'MapPin', Icon: MapPin }, { name: 'Bike', Icon: Bike },
    { name: 'Bus', Icon: Bus }, { name: 'Train', Icon: Train },
    { name: 'Plane', Icon: Plane }, { name: 'Mountain', Icon: Mountain },
    { name: 'Sunset', Icon: Sunset }, { name: 'Leaf', Icon: Leaf },
  ]},
  { label: 'General', icons: [
    { name: 'Info', Icon: Info }, { name: 'Star', Icon: Star },
    { name: 'Heart', Icon: Heart }, { name: 'Eye', Icon: Eye },
    { name: 'Bell', Icon: Bell }, { name: 'Bookmark', Icon: Bookmark },
    { name: 'HelpCircle', Icon: HelpCircle }, { name: 'Phone', Icon: Phone },
    { name: 'Mail', Icon: Mail }, { name: 'Globe', Icon: Globe },
    { name: 'Camera', Icon: Camera }, { name: 'Music', Icon: Music },
    { name: 'Video', Icon: Video }, { name: 'FileText', Icon: FileText },
    { name: 'Package', Icon: Package }, { name: 'Tag', Icon: Tag },
  ]},
];

const COLOR_PRESETS = [
  '#3b82f6', '#60a5fa', '#06b6d4', '#10b981', '#22c55e',
  '#f59e0b', '#f97316', '#ef4444', '#a855f7', '#ec4899',
  '#ffffff', '#6b7280', '#1f2937', '#0f172a',
];

// ─── Unit status labels ────────────────────────────────────────────────────────

const UNIT_STATUS_LABELS: Record<PropertyStatus, string> = {
  available:    'Disponible',
  reserved:     'Reservado',
  sold:         'Vendido',
  'in-process': 'En proceso',
};

interface HotspotPanelProps {
  scene: Scene;
  selectedHotspotId: string | null;
  allScenes: Scene[];
}

export function HotspotPanel({ scene, selectedHotspotId, allScenes }: HotspotPanelProps) {
  const updateHotspot   = useTourStore((s) => s.updateHotspot);
  const removeHotspot   = useTourStore((s) => s.removeHotspot);
  const selectHotspot   = useTourStore((s) => s.selectHotspot);
  const tourUnits       = useTourStore((s) => s.tour?.units ?? []);
  const tourPrototypes  = useTourStore((s) => s.tour?.unitPrototypes ?? []);
  const propertyLat     = useTourStore((s) => s.tour?.propertyLat);
  const propertyLng     = useTourStore((s) => s.tour?.propertyLng);

  const [unitSearch,   setUnitSearch]   = useState('');
  const [protoFilter,  setProtoFilter]  = useState('');

  const selected = scene.hotspots.find((h) => h.id === selectedHotspotId) ?? null;

  if (!selected) {
    return (
      <div className="p-4 text-center text-sm text-gray-500 mt-6">
        Selecciona un hotspot en el visor para editar sus propiedades.
      </div>
    );
  }

  const update = (patch: Partial<Omit<Hotspot, 'id'>>) =>
    updateHotspot(scene.id, selected.id, patch);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Editar hotspot</h3>
        <button
          onClick={() => {
            removeHotspot(scene.id, selected.id);
            selectHotspot(null);
          }}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
          title="Eliminar hotspot"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Label */}
      <Field label="Etiqueta">
        <input
          type="text"
          value={selected.label}
          onChange={(e) => update({ label: e.target.value })}
          className="input-dark"
          placeholder="Nombre del hotspot"
        />
      </Field>

      {/* Type */}
      <Field label="Tipo">
        <div className="grid grid-cols-2 gap-1.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ type: opt.value })}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors',
                selected.type === opt.value
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Per-type fields */}
      {selected.type === 'navigation' && (
        <Field label="Escena destino">
          <select
            value={selected.targetSceneId ?? ''}
            onChange={(e) => update({ targetSceneId: e.target.value })}
            className="input-dark"
          >
            <option value="">— Seleccionar escena —</option>
            {allScenes
              .filter((s) => s.id !== scene.id)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
          </select>
        </Field>
      )}

      {selected.type === 'info' && (
        <Field label="Texto">
          <textarea
            value={selected.infoText ?? ''}
            onChange={(e) => update({ infoText: e.target.value })}
            className="input-dark resize-none h-24"
            placeholder="Descripción del punto de interés…"
          />
        </Field>
      )}

      {selected.type === 'media' && (
        <>
          <Field label="Tipo de media">
            <select
              value={selected.media?.type ?? 'image'}
              onChange={(e) =>
                update({ media: { ...selected.media, type: e.target.value as any, url: selected.media?.url ?? '' } })
              }
              className="input-dark"
            >
              <option value="image">Imagen</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </Field>
          <Field label="URL">
            <input
              type="url"
              value={selected.media?.url ?? ''}
              onChange={(e) =>
                update({ media: { ...selected.media, url: e.target.value, type: selected.media?.type ?? 'image' } })
              }
              className="input-dark"
              placeholder="https://…"
            />
          </Field>
          <Field label="Título (opcional)">
            <input
              type="text"
              value={selected.media?.title ?? ''}
              onChange={(e) =>
                update({ media: { ...selected.media, title: e.target.value, url: selected.media?.url ?? '', type: selected.media?.type ?? 'image' } })
              }
              className="input-dark"
            />
          </Field>
        </>
      )}

      {selected.type === 'agent' && (
        <>
          <Field label="Nombre">
            <input type="text" value={selected.agent?.name ?? ''} onChange={(e) => update({ agent: { ...selected.agent!, name: e.target.value, phone: selected.agent?.phone ?? '', email: selected.agent?.email ?? '' } })} className="input-dark" placeholder="Nombre del agente" />
          </Field>
          <Field label="Teléfono">
            <input type="tel" value={selected.agent?.phone ?? ''} onChange={(e) => update({ agent: { ...selected.agent!, phone: e.target.value, name: selected.agent?.name ?? '', email: selected.agent?.email ?? '' } })} className="input-dark" placeholder="+52 55 1234 5678" />
          </Field>
          <Field label="Email">
            <input type="email" value={selected.agent?.email ?? ''} onChange={(e) => update({ agent: { ...selected.agent!, email: e.target.value, name: selected.agent?.name ?? '', phone: selected.agent?.phone ?? '' } })} className="input-dark" placeholder="agente@inmobiliaria.com" />
          </Field>
          <Field label="Agencia (opcional)">
            <input type="text" value={selected.agent?.agency ?? ''} onChange={(e) => update({ agent: { ...selected.agent!, agency: e.target.value, name: selected.agent?.name ?? '', phone: selected.agent?.phone ?? '', email: selected.agent?.email ?? '' } })} className="input-dark" />
          </Field>
        </>
      )}

      {selected.type === 'unit' && (
        <>
          <Field label="Unidad vinculada">
            {tourUnits.length === 0 ? (
              <p className="text-xs text-amber-500/80">
                Agrega unidades en la pestaña Inventario primero.
              </p>
            ) : (
              <div className="space-y-1.5">
                {/* Prototype filter — only shown when prototypes are defined */}
                {tourPrototypes.length > 0 && (
                  <select
                    value={protoFilter}
                    onChange={(e) => { setProtoFilter(e.target.value); setUnitSearch(''); }}
                    className="input-dark"
                  >
                    <option value="">Todos los prototipos</option>
                    {tourPrototypes.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}

                {/* Text search — shown when there are more than 6 units */}
                {tourUnits.length > 6 && (
                  <input
                    type="text"
                    placeholder="Buscar por nombre…"
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    className="input-dark"
                  />
                )}

                {/* Filtered unit list */}
                {(() => {
                  const q = unitSearch.toLowerCase();
                  const filtered = tourUnits.filter((u) => {
                    const matchSearch = !q || u.label.toLowerCase().includes(q);
                    const matchProto  = !protoFilter || u.prototypeId === protoFilter;
                    return matchSearch && matchProto;
                  });

                  if (filtered.length === 0) {
                    return (
                      <p className="text-xs text-gray-500 py-1">
                        Sin unidades para esa búsqueda.
                      </p>
                    );
                  }

                  return (
                    <select
                      value={selected.unitId ?? ''}
                      onChange={(e) => {
                        const unit = tourUnits.find((u) => u.id === e.target.value);
                        update({
                          unitId: e.target.value || undefined,
                          ...(unit ? { label: unit.label } : {}),
                        });
                      }}
                      className="input-dark"
                      size={Math.min(filtered.length + 1, 7)}
                    >
                      <option value="">— Sin asignar —</option>
                      {filtered.map((u) => {
                        const proto = tourPrototypes.find((p) => p.id === u.prototypeId);
                        return (
                          <option key={u.id} value={u.id}>
                            {u.label}{proto ? ` [${proto.name}]` : ''} · {UNIT_STATUS_LABELS[u.status]}
                          </option>
                        );
                      })}
                    </select>
                  );
                })()}

                {/* Show currently linked unit */}
                {selected.unitId && (() => {
                  const linked = tourUnits.find((u) => u.id === selected.unitId);
                  if (!linked) return null;
                  const proto = tourPrototypes.find((p) => p.id === linked.prototypeId);
                  return (
                    <p className="text-[10px] text-emerald-400/80">
                      ✓ {linked.label}{proto ? ` — ${proto.name}` : ''}
                    </p>
                  );
                })()}
              </div>
            )}
          </Field>
        </>
      )}

      {selected.type === 'product' && (
        <>
          <Field label="Nombre del producto">
            <input type="text" value={selected.product?.name ?? ''} onChange={(e) => update({ product: { ...selected.product!, name: e.target.value, productId: selected.product?.productId ?? '', price: selected.product?.price ?? 0, currency: selected.product?.currency ?? 'MXN' } })} className="input-dark" />
          </Field>
          <Field label="Precio">
            <input type="number" value={selected.product?.price ?? 0} onChange={(e) => update({ product: { ...selected.product!, price: Number(e.target.value), productId: selected.product?.productId ?? '', name: selected.product?.name ?? '', currency: selected.product?.currency ?? 'MXN' } })} className="input-dark" min={0} />
          </Field>
          <Field label="Moneda">
            <select value={selected.product?.currency ?? 'MXN'} onChange={(e) => update({ product: { ...selected.product!, currency: e.target.value, productId: selected.product?.productId ?? '', name: selected.product?.name ?? '', price: selected.product?.price ?? 0 } })} className="input-dark">
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </Field>
        </>
      )}

      {selected.type === 'map' && (
        <POIFields
          selected={selected}
          update={update}
          propertyLat={propertyLat}
          propertyLng={propertyLng}
        />
      )}

      {/* ─── Apariencia ─────────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-gray-700/50 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Apariencia</p>

        {/* Style */}
        <Field label="Estilo visual">
          <div className="grid grid-cols-3 gap-1.5">
            {STYLE_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => update({ style: opt.value })}
                className={cn('flex flex-col items-center gap-0.5 p-2 rounded-lg border text-center transition-colors',
                  (selected.style ?? 'bubble') === opt.value
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300')}>
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-[10px] font-semibold leading-tight">{opt.label}</span>
                <span className="text-[9px] text-gray-600 leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Size */}
        <Field label="Tamaño">
          <div className="grid grid-cols-3 gap-1">
            {([{ value: 'sm', label: 'Pequeño' }, { value: 'md', label: 'Normal' }, { value: 'lg', label: 'Grande' }] as const).map((opt) => (
              <button key={opt.value} type="button" onClick={() => update({ iconSize: opt.value })}
                className={cn('py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  (selected.iconSize ?? 'md') === opt.value
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500')}>
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Animation */}
        <Field label="Animación">
          <div className="grid grid-cols-4 gap-1">
            {ANIM_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => update({ animation: opt.value })}
                className={cn('py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  (selected.animation ?? 'ping') === opt.value
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500')}>
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Show label */}
        <Field label="Etiqueta">
          <div className="grid grid-cols-3 gap-1">
            {([{ value: 'always', label: 'Siempre' }, { value: 'hover', label: 'Al pasar' }, { value: 'never', label: 'Nunca' }] as const).map((opt) => (
              <button key={opt.value} type="button" onClick={() => update({ showLabel: opt.value })}
                className={cn('py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  (selected.showLabel ?? 'hover') === opt.value
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500')}>
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Icon picker */}
        <Field label="Ícono">
          {/* No icon toggle */}
          <button type="button"
            onClick={() => update({ noIcon: !selected.noIcon, customIcon: selected.noIcon ? selected.customIcon : selected.customIcon })}
            className={cn('flex items-center gap-1.5 w-full px-2.5 py-1.5 mb-2 rounded-lg border text-xs font-medium transition-colors',
              selected.noIcon
                ? 'bg-gray-700 border-gray-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500')}>
            <Ban className="w-3.5 h-3.5" />
            Sin ícono {selected.style === 'floor' ? '(solo anillo en piso)' : ''}
          </button>

          {!selected.noIcon && (
            <div className="space-y-2">
              {/* Current icon preview */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800 border border-gray-700">
                {(() => {
                  const Ic = (selected.customIcon && ICON_REGISTRY[selected.customIcon]) ? ICON_REGISTRY[selected.customIcon] : null;
                  return Ic
                    ? <Ic className="w-4 h-4 text-white" strokeWidth={2.5} />
                    : <span className="text-xs text-gray-500 italic">Ícono por tipo</span>;
                })()}
                {selected.customIcon && (
                  <button type="button" onClick={() => update({ customIcon: undefined })}
                    className="ml-auto text-[10px] text-gray-500 hover:text-red-400 transition-colors">
                    Restaurar
                  </button>
                )}
              </div>

              {/* Categorized icon grid */}
              {ICON_LIBRARY.map((cat) => (
                <div key={cat.label}>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{cat.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {cat.icons.map(({ name, Icon }) => (
                      <button key={name} type="button" title={name}
                        onClick={() => update({ customIcon: name })}
                        className={cn('w-7 h-7 flex items-center justify-center rounded-lg border transition-colors',
                          selected.customIcon === name
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white')}>
                        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Field>

        {/* Color */}
        <Field label="Color">
          <div className="space-y-2">
            {/* Presets */}
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button key={c} type="button" title={c}
                  onClick={() => update({ iconColor: c })}
                  className={cn('w-6 h-6 rounded-md border-2 transition-all',
                    selected.iconColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            {/* Custom color picker + reset */}
            <div className="flex items-center gap-2">
              <input type="color" value={selected.iconColor ?? '#3b82f6'}
                onChange={(e) => update({ iconColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-gray-600 bg-transparent" />
              <span className="text-xs text-gray-500 font-mono">{selected.iconColor ?? 'predeterminado'}</span>
              {selected.iconColor && (
                <button type="button" onClick={() => update({ iconColor: undefined })}
                  className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors">
                  Restaurar
                </button>
              )}
            </div>
          </div>
        </Field>
      </div>

      {/* Coordinates (read-only info) */}
      <div className="pt-2 border-t border-gray-700/50">
        <p className="text-xs text-gray-600 font-mono">
          Yaw: {selected.yaw.toFixed(1)}° · Pitch: {selected.pitch.toFixed(1)}°
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

// ─── POI Fields with geocoding ────────────────────────────────────────────────

interface POIFieldsProps {
  selected: Hotspot;
  update: (patch: Partial<Omit<Hotspot, 'id'>>) => void;
  propertyLat?: number;
  propertyLng?: number;
}

function POIFields({ selected, update, propertyLat, propertyLng }: POIFieldsProps) {
  const [originQuery, setOriginQuery]           = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [suggestions, setSuggestions]           = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching]               = useState<'origin' | 'destination' | null>(null);
  const [resolving, setResolving]               = useState<'origin' | 'destination' | null>(null);
  const [showResults, setShowResults]           = useState<'origin' | 'destination' | null>(null);
  const searchTimeout                           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef                              = useRef(crypto.randomUUID());

  const originLat = selected.mapOriginLat ?? propertyLat;
  const originLng = selected.mapOriginLng ?? propertyLng;
  const hasOrigin = originLat != null && originLng != null;
  const hasDest   = selected.mapLat != null && selected.mapLng != null;
  const hasRoute  = hasOrigin && hasDest;
  const mapsKey   = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';
  const travelMode = selected.mapTravelMode ?? 'walking';

  const fallbackDistance = useCallback((fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    const km = haversineKm(fromLat, fromLng, toLat, toLng);
    return `${formatWalkTime(km)} · ${formatDistance(km)}`;
  }, []);

  const getRouteSummary = useCallback(async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    try {
      const origin = `${fromLat},${fromLng}`;
      const destination = `${toLat},${toLng}`;
      const res = await fetch(`/api/places/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${travelMode}`);
      if (!res.ok) return null;
      const route = await res.json() as RouteSummary;
      return route.summary || null;
    } catch {
      return null;
    }
  }, [travelMode]);

  const autoDistance = useCallback(async () => {
    if (!hasRoute) return;
    const dist = await getRouteSummary(originLat!, originLng!, selected.mapLat!, selected.mapLng!)
      ?? fallbackDistance(originLat!, originLng!, selected.mapLat!, selected.mapLng!);
    update({ mapDistance: dist });
  }, [fallbackDistance, getRouteSummary, hasRoute, originLat, originLng, selected.mapLat, selected.mapLng, update]);

  const handleSearch = (target: 'origin' | 'destination') => {
    const q = (target === 'origin' ? originQuery : destinationQuery).trim();
    if (!q) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearching(target);
    setShowResults(null);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&sessiontoken=${sessionRef.current}`);
        setSuggestions(res.ok ? await res.json() : []);
        setShowResults(target);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(null);
      }
    }, 400);
  };

  const applySuggestion = async (target: 'origin' | 'destination', s: PlaceSuggestion) => {
    setShowResults(null);
    if (target === 'origin') setOriginQuery('');
    else setDestinationQuery('');
    setResolving(target);
    try {
      const res = await fetch(`/api/places/${s.placeId}?sessiontoken=${sessionRef.current}`);
      sessionRef.current = crypto.randomUUID();
      if (!res.ok) {
        update(target === 'origin'
          ? { mapOriginAddress: s.description, mapOriginGooglePlaceId: s.placeId }
          : { mapAddress: s.description, mapGooglePlaceId: s.placeId });
        return;
      }

      const details = await res.json() as PlaceDetails;
      const address = details.formattedAddress || s.description;
      const patch: Partial<Omit<Hotspot, 'id'>> = target === 'origin'
        ? { mapOriginAddress: address, mapOriginGooglePlaceId: s.placeId }
        : { mapAddress: address, mapGooglePlaceId: s.placeId };

      if (details.lat != null && details.lng != null) {
        if (target === 'origin') {
          patch.mapOriginLat = details.lat;
          patch.mapOriginLng = details.lng;
          if (hasDest) {
            patch.mapDistance = await getRouteSummary(details.lat, details.lng, selected.mapLat!, selected.mapLng!)
              ?? fallbackDistance(details.lat, details.lng, selected.mapLat!, selected.mapLng!);
          }
        } else {
          patch.mapLat = details.lat;
          patch.mapLng = details.lng;
          if (hasOrigin) {
            patch.mapDistance = await getRouteSummary(originLat!, originLng!, details.lat, details.lng)
              ?? fallbackDistance(originLat!, originLng!, details.lat, details.lng);
          }
        }
      }

      if (target === 'destination' && (!selected.label || selected.label === 'Punto de interés')) {
        patch.label = details.name || s.mainText;
      }
      update(patch);
    } finally {
      setResolving(null);
    }
  };

  const routeHref = hasRoute
    ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${selected.mapLat},${selected.mapLng}&travelmode=${travelMode}`
    : hasDest
      ? `https://www.google.com/maps/search/?api=1&query=${selected.mapLat},${selected.mapLng}`
      : null;

  const mapPreviewSrc = mapsKey
    ? hasRoute
      ? `https://www.google.com/maps/embed/v1/directions?key=${mapsKey}&origin=${originLat},${originLng}&destination=${selected.mapLat},${selected.mapLng}&mode=${travelMode}&language=es`
      : hasDest
        ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${selected.mapLat},${selected.mapLng}&language=es`
        : null
    : null;

  const renderSearch = (
    target: 'origin' | 'destination',
    label: string,
    value: string,
    onValue: (value: string) => void,
    placeholder: string,
  ) => (
    <Field label={label}>
      <div className="relative">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => onValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(target)}
            className="input-dark flex-1"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => handleSearch(target)}
            disabled={searching === target || resolving === target}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {searching === target || resolving === target ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        {showResults === target && suggestions.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.placeId}
                type="button"
                onClick={() => applySuggestion(target, s)}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 border-b border-gray-700 last:border-0 leading-snug"
              >
                <MapPin className="w-3 h-3 inline mr-1 text-blue-400 flex-shrink-0" />
                <span className="font-medium">{s.mainText}</span>
                {s.secondaryText && <span className="block text-[10px] text-gray-500 mt-0.5 truncate">{s.secondaryText}</span>}
              </button>
            ))}
            <div className="flex items-center justify-end gap-1 px-3 py-1.5 bg-gray-900/60 border-t border-gray-700/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-non-white3.png" alt="Powered by Google" className="h-3 opacity-60" />
            </div>
            <button
              type="button"
              onClick={() => setShowResults(null)}
              className="w-full px-3 py-1.5 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </Field>
  );

  return (
    <>
      {renderSearch(
        'origin',
        'Punto de partida',
        originQuery,
        setOriginQuery,
        selected.mapOriginAddress ?? (hasOrigin ? 'Usando ubicación del desarrollo' : 'Buscar punto de partida…'),
      )}

      {!selected.mapOriginAddress && hasOrigin && (
        <p className="text-[10px] text-gray-500 leading-snug -mt-3">
          Si no eliges otro punto, la ruta saldrá desde la ubicación guardada en Marca.
        </p>
      )}

      {renderSearch(
        'destination',
        'Destino',
        destinationQuery,
        setDestinationQuery,
        'Playa del Carmen, Hospital, Colegio…',
      )}

      {!hasOrigin && (
        <p className="text-[10px] text-amber-500/80 leading-snug -mt-3">
          Selecciona un punto de partida aquí o configura la ubicación del desarrollo en Marca.
        </p>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-2.5 space-y-1.5">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-gray-300 leading-snug">
            {selected.mapOriginAddress ?? (hasOrigin ? 'Ubicación del desarrollo' : 'Sin punto de partida')}
          </p>
        </div>
        <div className="ml-1.5 h-4 border-l border-dashed border-gray-700" />
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-gray-300 leading-snug">
            {selected.mapAddress ?? 'Sin destino'}
          </p>
        </div>
      </div>

      <Field label="Nombre del lugar">
        <input
          type="text"
          value={selected.label}
          onChange={(e) => update({ label: e.target.value })}
          className="input-dark"
          placeholder="Playa, Colegio, Hospital Central…"
        />
      </Field>

      <Field label="Dirección destino">
        <input
          type="text"
          value={selected.mapAddress ?? ''}
          onChange={(e) => update({ mapAddress: e.target.value })}
          className="input-dark"
          placeholder="Se llena automáticamente al buscar el destino"
        />
      </Field>

      <Field label="Dirección punto de partida">
        <input
          type="text"
          value={selected.mapOriginAddress ?? ''}
          onChange={(e) => update({ mapOriginAddress: e.target.value || undefined })}
          className="input-dark"
          placeholder={hasOrigin ? 'Usando ubicación del desarrollo' : 'Se llena automáticamente al buscar'}
        />
      </Field>

      <Field label="Distancia / tiempo">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={selected.mapDistance ?? ''}
            onChange={(e) => update({ mapDistance: e.target.value })}
            className="input-dark flex-1"
            placeholder="5 min caminando · 2.3 km"
          />
          {hasRoute && (
            <button
              type="button"
              onClick={autoDistance}
              title="Calcular distancia automáticamente"
              className="px-2 py-1.5 bg-emerald-700/40 hover:bg-emerald-700/60 text-emerald-400 rounded-lg text-xs transition-colors flex-shrink-0 flex items-center gap-1"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </Field>

      <Field label="Modo de ruta">
        <div className="grid grid-cols-2 gap-1.5">
          {(['walking', 'driving'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => update({ mapTravelMode: mode })}
              className={cn(
                'px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors',
                travelMode === mode
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              )}
            >
              {mode === 'walking' ? 'Caminando' : 'Auto'}
            </button>
          ))}
        </div>
      </Field>

      {hasDest && (
        <div className="space-y-1.5">
          <div className="rounded-xl overflow-hidden border border-gray-700" style={{ height: 160 }}>
            {mapPreviewSrc ? (
              <iframe
                src={mapPreviewSrc}
                className="w-full h-full border-0"
                title={hasRoute ? 'Vista previa de la ruta' : 'Vista previa del destino'}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center px-4 text-center bg-gray-900">
                <p className="text-[11px] text-gray-500">Agrega NEXT_PUBLIC_GOOGLE_MAPS_KEY para ver la ruta embebida.</p>
              </div>
            )}
          </div>
          {routeHref && (
            <a
              href={routeHref}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
            >
              <MapPin className="w-3 h-3" /> {hasRoute ? 'Ver ruta en Google Maps ↗' : 'Verificar destino en Google Maps ↗'}
            </a>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-600 leading-snug">
        Al tocar el hotspot se abrirá la ruta en Google Maps. Estilo <strong className="text-gray-400">Etiqueta</strong> ideal para vistas aéreas.
      </p>
    </>
  );
}
