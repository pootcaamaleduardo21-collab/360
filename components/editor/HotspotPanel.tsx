'use client';

import { Hotspot, HotspotType, Scene } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { Trash2, ChevronRight, ArrowRight, Info, Image, User, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS: { value: HotspotType; label: string; icon: React.ReactNode }[] = [
  { value: 'navigation', label: 'Navegación',  icon: <ArrowRight     className="w-3.5 h-3.5" /> },
  { value: 'info',       label: 'Información', icon: <Info           className="w-3.5 h-3.5" /> },
  { value: 'media',      label: 'Media',       icon: <Image          className="w-3.5 h-3.5" /> },
  { value: 'agent',      label: 'Agente',      icon: <User           className="w-3.5 h-3.5" /> },
  { value: 'product',    label: 'Producto',    icon: <ShoppingCart   className="w-3.5 h-3.5" /> },
];

interface HotspotPanelProps {
  scene: Scene;
  selectedHotspotId: string | null;
  allScenes: Scene[];
}

export function HotspotPanel({ scene, selectedHotspotId, allScenes }: HotspotPanelProps) {
  const updateHotspot  = useTourStore((s) => s.updateHotspot);
  const removeHotspot  = useTourStore((s) => s.removeHotspot);
  const selectHotspot  = useTourStore((s) => s.selectHotspot);

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
