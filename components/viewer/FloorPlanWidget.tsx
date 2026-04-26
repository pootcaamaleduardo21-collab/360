'use client';

import { useState } from 'react';
import { Tour } from '@/types/tour.types';
import { ROOM_CONFIG } from '@/lib/roomTypes';
import { cn } from '@/lib/utils';
import { Map, X } from 'lucide-react';

interface FloorPlanWidgetProps {
  tour: Tour;
  currentSceneId: string;
  onNavigate: (sceneId: string) => void;
}

export function FloorPlanWidget({ tour, currentSceneId, onNavigate }: FloorPlanWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  const markers = tour.floorPlanMarkers ?? [];
  if (!tour.floorPlanUrl || markers.length === 0) return null;

  const currentMarker = markers.find((m) => m.sceneId === currentSceneId);

  return (
    <div className="absolute bottom-14 left-4 z-20 select-none">
      {!expanded ? (
        // ── Collapsed thumbnail ───────────────────────────────────────────────
        <button
          onClick={() => setExpanded(true)}
          title="Ver plano interactivo"
          className="relative w-20 h-14 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl hover:border-blue-400/60 transition-all group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tour.floorPlanUrl}
            alt="Plano"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45 group-hover:bg-black/25 transition-colors" />

          {/* Current position dot */}
          {currentMarker && (
            <span
              className="absolute w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-white/80 shadow"
              style={{
                left: `${currentMarker.x}%`,
                top: `${currentMarker.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}

          <div className="absolute bottom-1 left-0 right-0 flex justify-center">
            <span className="text-[9px] text-white/90 font-medium bg-black/50 px-1.5 py-px rounded-full flex items-center gap-0.5">
              <Map className="w-2.5 h-2.5" /> Plano
            </span>
          </div>
        </button>
      ) : (
        // ── Expanded interactive floor plan ───────────────────────────────────
        <div className="w-64 bg-gray-900/95 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-blue-400" />
              Plano interactivo
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Floor plan image + markers */}
          <div className="p-2">
            <div className="relative rounded-lg overflow-hidden bg-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tour.floorPlanUrl}
                alt="Plano de planta"
                className="w-full max-h-52 object-contain"
                draggable={false}
              />

              {markers.map((marker) => {
                const cfg      = ROOM_CONFIG[marker.roomType ?? 'otro'];
                const isCurrent = marker.sceneId === currentSceneId;
                const scene    = tour.scenes.find((s) => s.id === marker.sceneId);
                const label    = marker.label ?? scene?.name ?? cfg.label;

                return (
                  <button
                    key={marker.sceneId}
                    onClick={() => { onNavigate(marker.sceneId); setExpanded(false); }}
                    title={label}
                    style={{
                      left: `${marker.x}%`,
                      top: `${marker.y}%`,
                      transform: 'translate(-50%, -50%)',
                      background: cfg.color,
                    }}
                    className={cn(
                      'absolute flex items-center justify-center rounded-full shadow-lg transition-all duration-200',
                      isCurrent
                        ? 'w-9 h-9 ring-2 ring-white/90 ring-offset-1 ring-offset-transparent z-10'
                        : 'w-7 h-7 hover:scale-110 hover:z-10 z-[1] opacity-90 hover:opacity-100'
                    )}
                  >
                    {/* Pulse ring on current scene */}
                    {isCurrent && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping opacity-50"
                        style={{ background: cfg.color }}
                      />
                    )}
                    <span className="relative text-sm leading-none pointer-events-none">
                      {cfg.emoji}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room legend / pill buttons */}
          <div className="px-3 pb-3 flex flex-wrap gap-1.5">
            {markers.map((marker) => {
              const cfg      = ROOM_CONFIG[marker.roomType ?? 'otro'];
              const isCurrent = marker.sceneId === currentSceneId;
              const scene    = tour.scenes.find((s) => s.id === marker.sceneId);
              const label    = marker.label ?? scene?.name ?? cfg.label;

              return (
                <button
                  key={marker.sceneId}
                  onClick={() => { onNavigate(marker.sceneId); setExpanded(false); }}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border',
                    isCurrent
                      ? 'text-white border-transparent'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                  )}
                  style={isCurrent ? { background: cfg.color, borderColor: cfg.color } : undefined}
                >
                  <span>{cfg.emoji}</span>
                  <span className="truncate max-w-[80px]">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
