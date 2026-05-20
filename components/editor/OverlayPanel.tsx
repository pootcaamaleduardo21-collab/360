'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  AnnotationOverlay, SceneOverlay, PolylineOverlay, DEFAULT_POLYLINE_STYLE, PolylineStyle,
} from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Crosshair, ChevronDown, ChevronRight, MapPin, Type, Image as ImageIcon,
} from 'lucide-react';

interface OverlayPanelProps {
  sceneId: string;
  overlays: SceneOverlay[];
  selectedOverlayId: string | null;
  onSelectOverlay: (id: string | null) => void;
  /** When true, viewer is in vertex-placement mode for this overlay */
  addingVertexToOverlayId: string | null;
  onSetAddingVertex: (overlayId: string | null) => void;
}

const DASH_OPTIONS = [
  { label: 'Sólida',   value: '' },
  { label: 'Guiones',  value: '12,6' },
  { label: 'Puntos',   value: '3,6' },
  { label: 'Mixta',    value: '12,4,3,4' },
];

export function OverlayPanel({
  sceneId,
  overlays,
  selectedOverlayId,
  onSelectOverlay,
  addingVertexToOverlayId,
  onSetAddingVertex,
}: OverlayPanelProps) {
  const addOverlay        = useTourStore((s) => s.addOverlay);
  const removeOverlay     = useTourStore((s) => s.removeOverlay);
  const updateOverlayStyle = useTourStore((s) => s.updateOverlayStyle);
  const updateAnnotationOverlay = useTourStore((s) => s.updateAnnotationOverlay);
  const updateOverlayLabel = useTourStore((s) => s.updateOverlayLabel);
  const removeOverlayPoint = useTourStore((s) => s.removeOverlayPoint);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId) ?? null;

  const handleAddPolyline = () => {
    const overlay: PolylineOverlay = {
      id: uuidv4(),
      type: 'polyline',
      label: `Línea ${overlays.length + 1}`,
      points: [],
      style: { ...DEFAULT_POLYLINE_STYLE },
    };
    addOverlay(sceneId, overlay);
    onSelectOverlay(overlay.id);
    setExpandedId(overlay.id);
  };

  const handleAddAnnotation = () => {
    const overlay: AnnotationOverlay = {
      id: uuidv4(),
      type: 'annotation',
      label: `Anotación ${overlays.length + 1}`,
      yaw: 0,
      pitch: 0,
      contentType: 'text',
      text: 'Texto sobre el recorrido',
      style: {
        textColor: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: 'rgba(0,0,0,0)',
        width: 320,
        opacity: 1,
        fontSize: 24,
        radius: 0,
        shadow: true,
      },
    };
    addOverlay(sceneId, overlay);
    onSelectOverlay(overlay.id);
    onSetAddingVertex(overlay.id);
    setExpandedId(overlay.id);
  };

  const patchStyle = (patch: Partial<PolylineStyle>) => {
    if (!selectedOverlayId || selectedOverlay?.type !== 'polyline') return;
    updateOverlayStyle(sceneId, selectedOverlayId, patch);
  };

  return (
    <div className="p-3 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Líneas / anotaciones</p>
        <div className="flex gap-1.5">
          <button
            onClick={handleAddAnnotation}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Type className="w-3.5 h-3.5" />
            Anotación
          </button>
          <button
            onClick={handleAddPolyline}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Línea
          </button>
        </div>
      </div>

      {overlays.length === 0 && (
        <div className="py-8 text-center text-gray-600 text-xs leading-relaxed">
          <MapPin className="w-6 h-6 mx-auto mb-2 opacity-40" />
          Crea líneas, textos o imágenes<br />pegadas al espacio 3D.
        </div>
      )}

      {/* Overlay list */}
      <div className="space-y-1">
        {overlays.map((overlay) => {
          const isSelected = overlay.id === selectedOverlayId;
          const isExpanded = expandedId === overlay.id;
          const isPlacingVertex = addingVertexToOverlayId === overlay.id;

          return (
            <div
              key={overlay.id}
              className={cn(
                'rounded-xl border transition-colors',
                isSelected
                  ? 'border-emerald-600/50 bg-emerald-950/30'
                  : 'border-gray-700/50 bg-gray-800/30'
              )}
            >
              {/* Row header */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer"
                onClick={() => {
                  onSelectOverlay(isSelected ? null : overlay.id);
                  setExpandedId(isSelected ? null : overlay.id);
                }}
              >
                {/* Color swatch */}
                {overlay.type === 'polyline' ? (
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: overlay.style.color }}
                  />
                ) : (
                  <Type className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
                )}

                {/* Name */}
                <span className="flex-1 text-xs font-semibold text-white truncate">
                  {overlay.label || 'Sin nombre'}
                </span>

                {/* Vertex count badge */}
                <span className="text-[10px] text-gray-500 flex-shrink-0">
                  {overlay.type === 'polyline' ? `${overlay.points.length} vértices` : 'texto / imagen'}
                </span>

                {/* Expand / collapse */}
                {isSelected ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                )}
              </div>

              {/* Expanded controls */}
              {isSelected && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-700/40 pt-3">

                  {/* Name field */}
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Nombre</p>
                    <input
                      type="text"
                      value={overlay.label ?? ''}
                      onChange={(e) => updateOverlayLabel(sceneId, overlay.id, e.target.value)}
                      className="input-dark text-xs py-1.5"
                      placeholder="Ej. Lote 001"
                    />
                  </div>

                  {overlay.type === 'polyline' ? (
                  <>
                    {/* Vertex placement */}
                    <div>
                    <p className="text-[10px] text-gray-500 mb-1.5">Vértices</p>
                    <button
                      onClick={() => onSetAddingVertex(isPlacingVertex ? null : overlay.id)}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition-all',
                        isPlacingVertex
                          ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      )}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      {isPlacingVertex ? 'Haz clic en el viewer para agregar vértice — Esc para terminar' : 'Agregar vértices'}
                    </button>

                    {overlay.points.length > 0 && (
                      <div className="mt-1.5 space-y-0.5 max-h-28 overflow-y-auto scrollbar-thin">
                        {overlay.points.map((pt, i) => (
                          <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-800/60 text-[10px] font-mono text-gray-400">
                            <span className="text-gray-600 flex-shrink-0">#{i + 1}</span>
                            <span className="flex-1">Y {pt.yaw.toFixed(1)}° P {pt.pitch.toFixed(1)}°</span>
                            <button
                              onClick={() => removeOverlayPoint(sceneId, overlay.id, i)}
                              className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    </div>

                    {/* Style section */}
                    <div className="space-y-2.5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Estilo</p>

                    {/* Color + glow color */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1">Color de línea</p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={overlay.style.color}
                            onChange={(e) => patchStyle({ color: e.target.value })}
                            className="w-8 h-7 rounded cursor-pointer border border-gray-700 bg-transparent p-0.5"
                          />
                          <input
                            type="text"
                            value={overlay.style.color}
                            onChange={(e) => patchStyle({ color: e.target.value })}
                            className="input-dark text-[10px] font-mono uppercase py-1 flex-1 min-w-0"
                            maxLength={7}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1">Color glow</p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={overlay.style.glowColor}
                            onChange={(e) => patchStyle({ glowColor: e.target.value })}
                            className="w-8 h-7 rounded cursor-pointer border border-gray-700 bg-transparent p-0.5"
                          />
                          <input
                            type="text"
                            value={overlay.style.glowColor}
                            onChange={(e) => patchStyle({ glowColor: e.target.value })}
                            className="input-dark text-[10px] font-mono uppercase py-1 flex-1 min-w-0"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Width */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-gray-600">Grosor de línea</p>
                        <span className="text-[10px] text-gray-400 font-mono">{overlay.style.width}px</span>
                      </div>
                      <input
                        type="range" min={1} max={20} step={1}
                        value={overlay.style.width}
                        onChange={(e) => patchStyle({ width: Number(e.target.value) })}
                        className="w-full accent-emerald-500 h-1.5"
                      />
                    </div>

                    {/* Opacity */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-gray-600">Opacidad</p>
                        <span className="text-[10px] text-gray-400 font-mono">{Math.round(overlay.style.opacity * 100)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={overlay.style.opacity}
                        onChange={(e) => patchStyle({ opacity: Number(e.target.value) })}
                        className="w-full accent-emerald-500 h-1.5"
                      />
                    </div>

                    {/* Glow */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-gray-600">Glow / destello</p>
                        <span className="text-[10px] text-gray-400 font-mono">{overlay.style.glow === 0 ? 'off' : `${overlay.style.glow}px`}</span>
                      </div>
                      <input
                        type="range" min={0} max={20} step={1}
                        value={overlay.style.glow}
                        onChange={(e) => patchStyle({ glow: Number(e.target.value) })}
                        className="w-full accent-emerald-500 h-1.5"
                      />
                    </div>

                    {/* Dash pattern */}
                    <div>
                      <p className="text-[10px] text-gray-600 mb-1.5">Tipo de trazo</p>
                      <div className="grid grid-cols-2 gap-1">
                        {DASH_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => patchStyle({ dash: opt.value })}
                            className={cn(
                              'py-1.5 rounded-lg text-[10px] font-medium border transition-colors',
                              overlay.style.dash === opt.value
                                ? 'bg-emerald-700 border-emerald-600 text-white'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Closed polygon toggle */}
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overlay.style.closed}
                        onChange={(e) => patchStyle({ closed: e.target.checked })}
                        className="w-3.5 h-3.5 accent-emerald-500 rounded"
                      />
                      <span className="text-xs text-gray-400">Cerrar polígono (conectar último → primero)</span>
                    </label>
                    </div>
                  </>
                  ) : (
                    <AnnotationControls
                      overlay={overlay}
                      isPlacing={isPlacingVertex}
                      onSetPlacing={() => onSetAddingVertex(isPlacingVertex ? null : overlay.id)}
                      onUpdate={(patch) => updateAnnotationOverlay(sceneId, overlay.id, patch)}
                    />
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => {
                      removeOverlay(sceneId, overlay.id);
                      onSelectOverlay(null);
                      onSetAddingVertex(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40 text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar {overlay.type === 'polyline' ? 'línea' : 'anotación'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnnotationControls({
  overlay,
  isPlacing,
  onSetPlacing,
  onUpdate,
}: {
  overlay: AnnotationOverlay;
  isPlacing: boolean;
  onSetPlacing: () => void;
  onUpdate: (patch: Partial<Omit<AnnotationOverlay, 'id' | 'type'>>) => void;
}) {
  const patchStyle = (style: Partial<AnnotationOverlay['style']>) =>
    onUpdate({ style: { ...overlay.style, ...style } });

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] text-gray-500 mb-1.5">Ubicación 3D</p>
        <button
          onClick={onSetPlacing}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition-all',
            isPlacing
              ? 'bg-blue-600 border-blue-500 text-white animate-pulse'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          )}
        >
          <Crosshair className="w-3.5 h-3.5" />
          {isPlacing ? 'Haz clic en el viewer para fijar posición' : 'Fijar posición en el viewer'}
        </button>
        <p className="mt-1 text-[10px] text-gray-600 font-mono">
          Y {overlay.yaw.toFixed(1)}° · P {overlay.pitch.toFixed(1)}°
        </p>
      </div>

      <div>
        <p className="text-[10px] text-gray-500 mb-1.5">Contenido</p>
        <div className="grid grid-cols-3 gap-1">
          {([
            { value: 'text', label: 'Texto', Icon: Type },
            { value: 'image', label: 'Imagen', Icon: ImageIcon },
            { value: 'text-image', label: 'Ambos', Icon: Plus },
          ] as const).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onUpdate({ contentType: value })}
              className={cn(
                'flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[10px] font-semibold transition-colors',
                overlay.contentType === value
                  ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {overlay.contentType !== 'image' && (
        <div>
          <p className="text-[10px] text-gray-500 mb-1">Texto visible</p>
          <textarea
            value={overlay.text ?? ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
            className="input-dark h-20 resize-none text-xs"
            placeholder="Escribe el texto que se verá sobre el recorrido..."
          />
        </div>
      )}

      {overlay.contentType !== 'image' && (
        <button
          type="button"
          onClick={() => patchStyle({
            backgroundColor: 'rgba(0,0,0,0)',
            borderColor: 'rgba(0,0,0,0)',
            radius: 0,
            shadow: true,
          })}
          className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-500/15"
        >
          Usar como texto flotante sin caja
        </button>
      )}

      {overlay.contentType !== 'text' && (
        <div>
          <p className="text-[10px] text-gray-500 mb-1">URL de imagen</p>
          <input
            type="url"
            value={overlay.imageUrl ?? ''}
            onChange={(e) => onUpdate({ imageUrl: e.target.value })}
            className="input-dark text-xs"
            placeholder="https://..."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-gray-600 mb-1">Texto</p>
          <input
            type="color"
            value={overlay.style.textColor}
            onChange={(e) => patchStyle({ textColor: e.target.value })}
            className="h-8 w-full rounded border border-gray-700 bg-transparent p-0.5"
          />
        </div>
        <div>
          <p className="text-[10px] text-gray-600 mb-1">Borde</p>
          <input
            type="color"
            value={overlay.style.borderColor.startsWith('#') ? overlay.style.borderColor : '#ffffff'}
            onChange={(e) => patchStyle({ borderColor: e.target.value })}
            className="h-8 w-full rounded border border-gray-700 bg-transparent p-0.5"
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] text-gray-600 mb-1">Fondo</p>
        <select
          value={overlay.style.backgroundColor}
          onChange={(e) => patchStyle({ backgroundColor: e.target.value })}
          className="input-dark text-xs"
        >
          <option value="rgba(15,23,42,0.78)">Cristal oscuro</option>
          <option value="rgba(255,255,255,0.88)">Cristal claro</option>
          <option value="rgba(0,0,0,0)">Sin fondo</option>
          <option value="transparent">Transparente</option>
          <option value="#111827">Sólido oscuro</option>
          <option value="#ffffff">Sólido claro</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RangeField label="Ancho" value={overlay.style.width} min={120} max={520} step={10} suffix="px" onChange={(width) => patchStyle({ width })} />
        <RangeField label="Texto" value={overlay.style.fontSize} min={10} max={34} step={1} suffix="px" onChange={(fontSize) => patchStyle({ fontSize })} />
        <RangeField label="Opacidad" value={overlay.style.opacity} min={0.2} max={1} step={0.05} suffix="%" display={(v) => Math.round(v * 100)} onChange={(opacity) => patchStyle({ opacity })} />
        <RangeField label="Radio" value={overlay.style.radius} min={0} max={28} step={1} suffix="px" onChange={(radius) => patchStyle({ radius })} />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={overlay.style.shadow}
          onChange={(e) => patchStyle({ shadow: e.target.checked })}
          className="w-3.5 h-3.5 accent-blue-500 rounded"
        />
        <span className="text-xs text-gray-400">Sombra / profundidad</span>
      </label>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  display?: (value: number) => number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] text-gray-600">{label}</p>
        <span className="text-[10px] text-gray-400 font-mono">{display ? display(value) : value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 h-1.5"
      />
    </div>
  );
}
