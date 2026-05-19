'use client';

import { useState, useMemo } from 'react';
import { Tour } from '@/types/tour.types';
import { cn } from '@/lib/utils';
import { Map, X } from 'lucide-react';

interface FloorPlanWidgetProps {
  tour: Tour;
  currentSceneId: string;
  onNavigate: (sceneId: string) => void;
}

// Camera SVG icon — used instead of room-type emojis for a cleaner viewer look
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0 8a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm6.5-13H16l-1.41-1.59A1.99 1.99 0 0 0 13.09 2H10.9c-.55 0-1.06.22-1.5.59L8 4H5.5C4.12 4 3 5.12 3 6.5v11C3 18.88 4.12 20 5.5 20h13c1.38 0 2.5-1.12 2.5-2.5v-11C21 5.12 19.88 4 18.5 4z" />
    </svg>
  );
}

export function FloorPlanWidget({ tour, currentSceneId, onNavigate }: FloorPlanWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const markers = useMemo(() => tour.floorPlanMarkers ?? [], [tour.floorPlanMarkers]);

  // Navigation edges: pairs of marker positions connected by navigation hotspots
  const navEdges = useMemo(() => {
    const markerSet = new Set(markers.map((m) => m.sceneId));
    const edges: Array<{ from: string; to: string }> = [];
    const seen = new Set<string>();

    for (const scene of tour.scenes) {
      if (!markerSet.has(scene.id)) continue;
      for (const hs of scene.hotspots) {
        if (hs.type !== 'navigation' || !hs.targetSceneId) continue;
        if (!markerSet.has(hs.targetSceneId)) continue;
        const key = [scene.id, hs.targetSceneId].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from: scene.id, to: hs.targetSceneId });
      }
    }
    return edges;
  }, [markers, tour.scenes]);

  if (!tour.floorPlanUrl || markers.length === 0) return null;

  const currentMarker = markers.find((m) => m.sceneId === currentSceneId);
  const currentScene  = tour.scenes.find((s) => s.id === currentSceneId);

  return (
    <div className="absolute bottom-14 left-4 z-20 select-none">
      {!expanded ? (
        // ── Collapsed thumbnail ─────────────────────────────────────────────
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
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

          {/* Current position dot */}
          {currentMarker && (
            <span
              className="absolute w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-white/80 shadow"
              style={{
                left: `${currentMarker.x}%`,
                top:  `${currentMarker.y}%`,
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
        // ── Expanded interactive floor plan ─────────────────────────────────
        <div className="w-96 bg-gray-900/95 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
            <div className="flex items-center gap-2 min-w-0">
              <Map className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-300">Plano interactivo</span>
              {currentScene && (
                <>
                  <span className="text-gray-700 flex-shrink-0">·</span>
                  <span className="text-xs text-blue-400 font-medium truncate">
                    {currentScene.name}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="ml-2 flex-shrink-0 p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Floor plan + SVG overlay */}
          <div className="p-2">
            <div className="relative rounded-lg overflow-hidden bg-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tour.floorPlanUrl}
                alt="Plano de planta"
                className="w-full h-auto block"
                draggable={false}
              />

              {/* SVG connection lines between navigable scenes */}
              {navEdges.length > 0 && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {navEdges.map(({ from, to }) => {
                    const a = markers.find((m) => m.sceneId === from);
                    const b = markers.find((m) => m.sceneId === to);
                    if (!a || !b) return null;
                    const isActive = from === currentSceneId || to === currentSceneId;
                    return (
                      <line
                        key={`${from}-${to}`}
                        x1={a.x} y1={a.y}
                        x2={b.x} y2={b.y}
                        stroke={isActive ? 'rgba(96,165,250,0.75)' : 'rgba(255,255,255,0.18)'}
                        strokeWidth={isActive ? '0.8' : '0.45'}
                        strokeDasharray={isActive ? undefined : '2 1.5'}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>
              )}

              {/* Scene markers */}
              {markers.map((marker) => {
                const scene        = tour.scenes.find((s) => s.id === marker.sceneId);
                const isCurrent    = marker.sceneId === currentSceneId;
                const isHovered    = hoveredId === marker.sceneId;
                const hotspotCount = scene?.hotspots.length ?? 0;
                const label        = marker.label ?? scene?.name ?? '—';

                return (
                  <button
                    key={marker.sceneId}
                    onClick={() => { onNavigate(marker.sceneId); setExpanded(false); }}
                    onMouseEnter={() => setHoveredId(marker.sceneId)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: 'translate(-50%, -50%)' }}
                    className={cn(
                      'absolute flex items-center justify-center rounded-full transition-all duration-200 z-10',
                      isCurrent
                        ? 'w-10 h-10 bg-blue-500 ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900 shadow-lg shadow-blue-500/40'
                        : 'w-7 h-7 bg-gray-800/90 border border-white/30 hover:border-white/70 hover:scale-110 hover:bg-gray-700'
                    )}
                  >
                    {/* Pulse ring for current scene */}
                    {isCurrent && (
                      <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-35" />
                    )}

                    <CameraIcon
                      className={cn(
                        'relative pointer-events-none',
                        isCurrent ? 'w-5 h-5 text-white' : 'w-3.5 h-3.5 text-white/65'
                      )}
                    />

                    {/* Hotspot count badge */}
                    {hotspotCount > 0 && !isCurrent && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center leading-none shadow-md pointer-events-none">
                        {hotspotCount > 9 ? '9+' : hotspotCount}
                      </span>
                    )}

                    {/* Tooltip — shown on hover or when current */}
                    {(isHovered || isCurrent) && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none z-20">
                        <div className="bg-gray-950/95 border border-gray-700 rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap text-center">
                          <p className={cn('font-semibold text-white', isCurrent ? 'text-[11px]' : 'text-[10px]')}>
                            {label}
                          </p>
                          {hotspotCount > 0 && (
                            <p className="text-[9px] text-amber-400/80 mt-0.5">
                              {hotspotCount} hotspot{hotspotCount !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <div className="w-2 h-2 bg-gray-950/95 border-r border-b border-gray-700 rotate-45 mx-auto -mt-1" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scene pill list */}
          <div className="px-3 pb-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1.5 font-semibold">
              {markers.length} escena{markers.length !== 1 ? 's' : ''} en plano
            </p>
            <div className="flex flex-wrap gap-1">
              {markers.map((marker) => {
                const scene     = tour.scenes.find((s) => s.id === marker.sceneId);
                const isCurrent = marker.sceneId === currentSceneId;
                const label     = marker.label ?? scene?.name ?? '—';

                return (
                  <button
                    key={marker.sceneId}
                    onClick={() => { onNavigate(marker.sceneId); setExpanded(false); }}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors border',
                      isCurrent
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                    )}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: isCurrent ? '#fff' : '#4b5563' }}
                    />
                    <span className="truncate max-w-[100px]">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
