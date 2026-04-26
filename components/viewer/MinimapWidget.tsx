'use client';

import { Tour } from '@/types/tour.types';
import { ROOM_CONFIG } from '@/lib/roomTypes';
import { cn } from '@/lib/utils';

interface MinimapWidgetProps {
  tour: Tour;
  currentSceneId: string;
  onNavigate: (sceneId: string) => void;
}

export function MinimapWidget({ tour, currentSceneId, onNavigate }: MinimapWidgetProps) {
  const hasFloorPlan = !!tour.floorPlanUrl;
  const markers      = tour.floorPlanMarkers ?? [];

  return (
    <div className="absolute bottom-4 left-4 z-20 rounded-xl overflow-hidden shadow-2xl border border-white/15">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-md px-3 py-1.5">
        <span className="text-xs font-semibold text-white/70 tracking-wide">Mapa</span>
      </div>

      {hasFloorPlan ? (
        /* Floor plan image with colored room markers */
        <div className="relative w-52 bg-gray-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tour.floorPlanUrl!}
            alt="Plano de planta"
            className="w-full h-auto block opacity-75"
          />

          {markers.map((marker) => {
            const isCurrent = marker.sceneId === currentSceneId;
            const color = ROOM_CONFIG[marker.roomType ?? 'otro'].color;
            const scene = tour.scenes.find((s) => s.id === marker.sceneId);

            return (
              <button
                key={marker.sceneId}
                className="absolute -translate-x-1/2 -translate-y-1/2 group/pin transition-transform hover:scale-125"
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                onClick={() => onNavigate(marker.sceneId)}
                title={marker.label ?? scene?.name}
              >
                {/* Pulse ring for current scene */}
                {isCurrent && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-60"
                    style={{ background: color }}
                  />
                )}
                {/* Pin dot */}
                <span
                  className={cn(
                    'relative block rounded-full border-2 border-white/80 shadow-lg transition-all',
                    isCurrent ? 'w-4 h-4' : 'w-3 h-3 opacity-70 hover:opacity-100'
                  )}
                  style={{ background: color }}
                />

                {/* Hover label */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/pin:block pointer-events-none z-10">
                  <span className="block bg-gray-900/95 border border-gray-700 text-white text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap shadow-xl">
                    {marker.label ?? scene?.name ?? '—'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Fallback: scene list */
        <div className="w-52 bg-black/70 max-h-40 overflow-y-auto">
          {tour.scenes.map((scene) => {
            const isCurrent = scene.id === currentSceneId;
            return (
              <button
                key={scene.id}
                onClick={() => onNavigate(scene.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    isCurrent ? 'bg-white' : 'bg-white/40'
                  )}
                />
                <span className="text-xs truncate">{scene.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
