'use client';

import { useState, useRef, useCallback } from 'react';
import { Tour, FloorPlanMarker, RoomType } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { uploadAsset } from '@/lib/storage';
import { ROOM_CONFIG, RoomConfig } from '@/lib/roomTypes';
import {
  MapPin, Upload, Trash2, Loader2, Plus, X,
  Check, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  tour: Tour;
}

type FormMode = 'closed' | 'add' | { edit: string };

export function FloorPlanEditor({ tour }: Props) {
  const updateTour  = useTourStore((s) => s.updateTour);
  const addMarker   = useTourStore((s) => s.addFloorPlanMarker);
  const updateMarker = useTourStore((s) => s.updateFloorPlanMarker);
  const removeMarker = useTourStore((s) => s.removeFloorPlanMarker);

  const [uploading,       setUploading]       = useState(false);
  const [formMode,        setFormMode]        = useState<FormMode>('closed');
  const [draggingSceneId, setDraggingSceneId] = useState<string | null>(null);
  const [dragOffset,      setDragOffset]      = useState({ x: 0, y: 0 });

  // Form fields
  const [formSceneId,  setFormSceneId]  = useState('');
  const [formRoomType, setFormRoomType] = useState<RoomType>('otro');
  const [formLabel,    setFormLabel]    = useState('');

  const fileInputRef      = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const markers = tour.floorPlanMarkers ?? [];

  // ── Open form helpers ──────────────────────────────────────────────────────

  const openAddForm = () => {
    const firstUnlinked = tour.scenes.find((s) => !markers.some((m) => m.sceneId === s.id));
    setFormSceneId(firstUnlinked?.id ?? tour.scenes[0]?.id ?? '');
    setFormRoomType('otro');
    setFormLabel('');
    setFormMode('add');
  };

  const openEditForm = (marker: FloorPlanMarker) => {
    setFormSceneId(marker.sceneId);
    setFormRoomType(marker.roomType ?? 'otro');
    setFormLabel(marker.label ?? '');
    setFormMode({ edit: marker.sceneId });
  };

  // ── Submit form ────────────────────────────────────────────────────────────

  const submitForm = () => {
    if (!formSceneId) return;

    if (formMode === 'add') {
      const existing = markers.find((m) => m.sceneId === formSceneId);
      if (existing) {
        updateMarker(formSceneId, { roomType: formRoomType, label: formLabel || undefined });
      } else {
        addMarker({ sceneId: formSceneId, x: 50, y: 50, roomType: formRoomType, label: formLabel || undefined });
      }
    } else if (typeof formMode === 'object') {
      const originalSceneId = formMode.edit;
      if (originalSceneId !== formSceneId) {
        const old = markers.find((m) => m.sceneId === originalSceneId);
        removeMarker(originalSceneId);
        addMarker({
          sceneId:  formSceneId,
          x:        old?.x ?? 50,
          y:        old?.y ?? 50,
          roomType: formRoomType,
          label:    formLabel || undefined,
        });
      } else {
        updateMarker(formSceneId, { roomType: formRoomType, label: formLabel || undefined });
      }
    }

    setFormMode('closed');
  };

  // ── Floor plan upload ──────────────────────────────────────────────────────

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadAsset(tour.id, file);
      updateTour({ floorPlanUrl: result.url });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Drag markers to reposition ─────────────────────────────────────────────

  const handleMarkerPointerDown = useCallback((e: React.PointerEvent, sceneId: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const marker = markers.find((m) => m.sceneId === sceneId);
    if (!marker) return;
    const markerPx = {
      x: rect.left + (marker.x / 100) * rect.width,
      y: rect.top  + (marker.y / 100) * rect.height,
    };
    setDragOffset({ x: e.clientX - markerPx.x, y: e.clientY - markerPx.y });
    setDraggingSceneId(sceneId);
  }, [markers]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingSceneId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(98, Math.max(2, ((e.clientX - dragOffset.x - rect.left) / rect.width) * 100));
    const y = Math.min(98, Math.max(2, ((e.clientY - dragOffset.y - rect.top) / rect.height) * 100));
    updateMarker(draggingSceneId, {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    });
  }, [draggingSceneId, dragOffset, updateMarker]);

  const stopDrag = useCallback(() => setDraggingSceneId(null), []);

  // ─────────────────────────────────────────────────────────────────────────

  if (tour.scenes.length === 0) {
    return (
      <div className="p-4 text-center">
        <MapPin className="w-8 h-8 text-gray-700 mx-auto mb-2" />
        <p className="text-xs text-gray-600">
          Agrega escenas primero para poder colocar marcadores en el plano.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Plano interactivo
        </h3>
        {tour.floorPlanUrl && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cambiar imagen
          </button>
        )}
      </div>

      {/* ── No floor plan → upload CTA ────────────────────────────────────── */}
      {!tour.floorPlanUrl ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-6 text-center transition-colors group"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-2" />
          ) : (
            <Upload className="w-6 h-6 text-gray-600 group-hover:text-gray-400 mx-auto mb-2 transition-colors" />
          )}
          <p className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">
            {uploading ? 'Subiendo…' : 'Subir imagen del plano'}
          </p>
          <p className="text-[10px] text-gray-700 mt-1">PNG, JPG, SVG · Planta arquitectónica</p>
        </button>
      ) : (
        /* ── Floor plan image with draggable pins ─────────────────────── */
        <div
          ref={imageContainerRef}
          className="relative select-none rounded-lg overflow-hidden border border-gray-700/50 bg-gray-800/50"
          style={{ cursor: draggingSceneId ? 'grabbing' : 'default' }}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrag}
          onPointerLeave={stopDrag}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tour.floorPlanUrl}
            alt="Plano de planta"
            className="w-full h-auto block"
            draggable={false}
          />

          {/* Pins */}
          {markers.map((marker) => {
            const scene  = tour.scenes.find((s) => s.id === marker.sceneId);
            const config = ROOM_CONFIG[marker.roomType ?? 'otro'];
            const isActive = typeof formMode === 'object' && formMode.edit === marker.sceneId;

            return (
              <div
                key={marker.sceneId}
                className="absolute -translate-x-1/2 -translate-y-full group/pin"
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
              >
                {/* Draggable pin head */}
                <div
                  onPointerDown={(e) => handleMarkerPointerDown(e, marker.sceneId)}
                  className={cn(
                    'flex flex-col items-center cursor-grab active:cursor-grabbing transition-transform duration-150',
                    isActive && 'scale-125'
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center text-sm leading-none"
                    style={{ background: config.color }}
                    title={`${config.label}${marker.label ? ` · ${marker.label}` : ''}${scene ? ` (${scene.name})` : ''}`}
                  >
                    {config.emoji}
                  </div>
                  <div className="w-0.5 h-2 rounded-full opacity-80" style={{ background: config.color }} />
                </div>

                {/* Hover tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/pin:flex flex-col items-center pointer-events-none z-10">
                  <div className="bg-gray-900/95 border border-gray-700 rounded-lg px-2 py-1 shadow-xl whitespace-nowrap">
                    <p className="text-[10px] font-semibold text-white">{marker.label || config.label}</p>
                    {scene && <p className="text-[9px] text-gray-500">{scene.name}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add marker form ────────────────────────────────────────────────── */}
      {formMode !== 'closed' && (
        <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-300">
              {formMode === 'add' ? 'Nuevo marcador' : 'Editar marcador'}
            </p>
            <button onClick={() => setFormMode('closed')} className="text-gray-600 hover:text-gray-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scene selector */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Escena vinculada</p>
            <select
              value={formSceneId}
              onChange={(e) => setFormSceneId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {tour.scenes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Room type grid */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1.5">Tipo de espacio</p>
            <div className="grid grid-cols-5 gap-1">
              {(Object.entries(ROOM_CONFIG) as [RoomType, RoomConfig][]).map(([rt, cfg]) => (
                <button
                  key={rt}
                  onClick={() => setFormRoomType(rt)}
                  title={cfg.label}
                  className={cn(
                    'py-1.5 flex flex-col items-center gap-0.5 rounded-lg text-[9px] font-medium transition-all border',
                    formRoomType === rt
                      ? 'text-white border-transparent scale-105'
                      : 'text-gray-500 border-gray-700 hover:text-gray-300'
                  )}
                  style={formRoomType === rt ? { background: cfg.color, borderColor: cfg.color } : {}}
                >
                  <span className="text-sm leading-none">{cfg.emoji}</span>
                  <span>{cfg.label.slice(0, 5)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Label input */}
          <div>
            <p className="text-[10px] text-gray-500 mb-1">Etiqueta (opcional)</p>
            <input
              type="text"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitForm()}
              placeholder={ROOM_CONFIG[formRoomType].label}
              className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 placeholder:text-gray-700"
            />
          </div>

          <button
            onClick={submitForm}
            disabled={!formSceneId}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            {formMode === 'add' ? 'Agregar al plano' : 'Guardar cambios'}
          </button>

          {formMode === 'add' && (
            <p className="text-[10px] text-gray-600 text-center">
              El marcador aparece al centro — arrástralo para reposicionar.
            </p>
          )}
        </div>
      )}

      {/* ── Add button ────────────────────────────────────────────────────── */}
      {formMode === 'closed' && tour.floorPlanUrl && (
        <button
          onClick={openAddForm}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-700 hover:border-blue-600 text-gray-500 hover:text-blue-400 text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar marcador
        </button>
      )}

      {/* ── Markers list ──────────────────────────────────────────────────── */}
      {markers.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">
            {markers.length} marcador{markers.length !== 1 ? 'es' : ''} en plano
          </p>
          {markers.map((marker) => {
            const scene  = tour.scenes.find((s) => s.id === marker.sceneId);
            const config = ROOM_CONFIG[marker.roomType ?? 'otro'];
            return (
              <div
                key={marker.sceneId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800/40 group/row"
              >
                <span className="text-sm leading-none flex-shrink-0">{config.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{marker.label || config.label}</p>
                  <p className="text-[10px] text-gray-600 truncate">{scene?.name ?? '—'}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditForm(marker)}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-300 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeMarker(marker.sceneId)}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
