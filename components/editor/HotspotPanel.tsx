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

// ─── Nominatim geocoder ───────────────────────────────────────────────────────

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

async function geocodeAddress(query: string): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=0`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  return res.json();
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
  const updateHotspot  = useTourStore((s) => s.updateHotspot);
  const removeHotspot  = useTourStore((s) => s.removeHotspot);
  const selectHotspot  = useTourStore((s) => s.selectHotspot);
  const tourUnits      = useTourStore((s) => s.tour?.units ?? []);
  const propertyLat    = useTourStore((s) => s.tour?.propertyLat);
  const propertyLng    = useTourStore((s) => s.tour?.propertyLng);

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
            >
              <option value="">— Seleccionar unidad —</option>
              {tourUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label} · {UNIT_STATUS_LABELS[u.status]}
                </option>
              ))}
            </select>
          </Field>
          {tourUnits.length === 0 && (
            <p className="text-xs text-amber-500/80">
              Agrega unidades en la pestaña Inventario primero.
            </p>
          )}
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
  const [searchQuery, setSearchQuery]     = useState('');
  const [results,     setResults]         = useState<NominatimResult[]>([]);
  const [searching,   setSearching]       = useState(false);
  const [showResults, setShowResults]     = useState(false);
  const searchTimeout                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasOrigin  = propertyLat != null && propertyLng != null;
  const hasDest    = selected.mapLat != null && selected.mapLng != null;

  // Auto-calculate and fill distance when both points are known
  const autoDistance = useCallback(() => {
    if (!hasOrigin || !hasDest) return;
    const km = haversineKm(propertyLat!, propertyLng!, selected.mapLat!, selected.mapLng!);
    const dist = `${formatWalkTime(km)} · ${formatDistance(km)}`;
    update({ mapDistance: dist });
  }, [hasOrigin, hasDest, propertyLat, propertyLng, selected.mapLat, selected.mapLng, update]);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearching(true);
    setShowResults(false);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await geocodeAddress(q);
        setResults(res);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const applyResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const shortAddress = r.display_name.split(',').slice(0, 3).join(', ');
    update({ mapLat: lat, mapLng: lng, mapAddress: shortAddress });
    setShowResults(false);
    setSearchQuery('');
    // Auto-calculate distance from property origin
    if (hasOrigin) {
      const km = haversineKm(propertyLat!, propertyLng!, lat, lng);
      update({ mapDistance: `${formatWalkTime(km)} · ${formatDistance(km)}` });
    }
  };

  return (
    <>
      {/* Search box */}
      <Field label="Buscar lugar en el mapa">
        <div className="relative">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="input-dark flex-1"
              placeholder="Playa del Carmen, Hospital, Colegio…"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          {showResults && results.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-xl shadow-2xl overflow-hidden">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyResult(r)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 border-b border-gray-700 last:border-0 leading-snug"
                >
                  <MapPin className="w-3 h-3 inline mr-1 text-blue-400 flex-shrink-0" />
                  {r.display_name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowResults(false)}
                className="w-full px-3 py-1.5 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
        {!hasOrigin && (
          <p className="text-[10px] text-amber-500/80 leading-snug mt-1">
            Configura la ubicación del desarrollo en Marca → Ubicación para calcular distancias automáticamente.
          </p>
        )}
      </Field>

      {/* Name */}
      <Field label="Nombre del lugar">
        <input
          type="text"
          value={selected.label}
          onChange={(e) => update({ label: e.target.value })}
          className="input-dark"
          placeholder="Playa, Colegio, Hospital Central…"
        />
      </Field>

      {/* Address (read-only after geocode, editable manually) */}
      <Field label="Dirección">
        <input
          type="text"
          value={selected.mapAddress ?? ''}
          onChange={(e) => update({ mapAddress: e.target.value })}
          className="input-dark"
          placeholder="Se llena automáticamente al buscar"
        />
      </Field>

      {/* Distance */}
      <Field label="Distancia / tiempo">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={selected.mapDistance ?? ''}
            onChange={(e) => update({ mapDistance: e.target.value })}
            className="input-dark flex-1"
            placeholder="5 min caminando · 2.3 km"
          />
          {hasOrigin && hasDest && (
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

      {/* Map preview — appears once a location is selected */}
      {hasDest && (
        <div className="space-y-1.5">
          <div className="rounded-xl overflow-hidden border border-gray-700" style={{ height: 140 }}>
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selected.mapLng! - 0.008},${selected.mapLat! - 0.006},${selected.mapLng! + 0.008},${selected.mapLat! + 0.006}&layer=mapnik&marker=${selected.mapLat},${selected.mapLng}`}
              className="w-full h-full border-0"
              title="Vista previa del mapa"
            />
          </div>
          <a
            href={`https://www.google.com/maps?q=${selected.mapLat},${selected.mapLng}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline"
          >
            <MapPin className="w-3 h-3" /> Verificar en Google Maps ↗
          </a>
        </div>
      )}

      <p className="text-[11px] text-gray-600 leading-snug">
        Al tocar el hotspot se abrirá Google Maps. Estilo <strong className="text-gray-400">Etiqueta</strong> ideal para vistas aéreas.
      </p>
    </>
  );
}
