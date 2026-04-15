'use client';

import { Tour, Scene } from '@/types/tour.types';
import { MapPin } from 'lucide-react';
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
    <div className="absolute bottom-4 left-4 z-20 rounded-xl overflow-hidden shadow-2xl border border-white/20">
      <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-white/80">Mapa</span>
      </div>

      {hasFloorPlan ? (
        /* Floor plan image with markers */
        <div className="relative w-48 h-36 bg-gray-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tour.floorPlanUrl!}
            alt="Plano de planta"
            className="w-full h-full object-contain opacity-80"
          />
          {markers.map((marker) => {
            const isCurrent = marker.sceneId === currentSceneId;
            return (
              <button
                key={marker.sceneId}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 transition-all',
                  isCurrent
                    ? 'text-blue-400 scale-125'
                    : 'text-white/60 hover:text-white hover:scale-110'
                )}
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                onClick={() => onNavigate(marker.sceneId)}
                title={marker.label}
              >
                <MapPin className="w-4 h-4 fill-current" />
              </button>
            );
          })}
        </div>
      ) : (
        /* Fallback: scene list */
        <div className="w-48 bg-black/70 max-h-36 overflow-y-auto">
          {tour.scenes.map((scene) => {
            const isCurrent = scene.id === currentSceneId;
            return (
              <button
                key={scene.id}
                onClick={() => onNavigate(scene.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs truncate">{scene.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
