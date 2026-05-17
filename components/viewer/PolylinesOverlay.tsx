'use client';

import { PolylineOverlay } from '@/types/tour.types';

interface ProjectedOverlay {
  id: string;
  path: string;
  vertices: Array<{ x: number; y: number }>;
}

interface PolylinesOverlayProps {
  overlays: PolylineOverlay[];
  projectedOverlays: ProjectedOverlay[];
  selectedOverlayId?: string | null;
  onSelectOverlay?: (id: string) => void;
  isEditing?: boolean;
}

export function PolylinesOverlay({
  overlays,
  projectedOverlays,
  selectedOverlayId,
  onSelectOverlay,
  isEditing = false,
}: PolylinesOverlayProps) {
  if (overlays.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[15]"
      style={{ width: '100%', height: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {overlays
          .filter((o) => o.style.glow > 0)
          .map((o) => (
            <filter key={o.id} id={`poly-glow-${o.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={o.style.glow} result="blur" />
              <feFlood floodColor={o.style.glowColor} result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
      </defs>

      {overlays.map((overlay) => {
        const proj = projectedOverlays.find((p) => p.id === overlay.id);
        if (!proj || !proj.path) return null;

        const { style } = overlay;
        const d = proj.path;
        const isSelected = isEditing && selectedOverlayId === overlay.id;

        return (
          <g key={overlay.id}>
            {onSelectOverlay && (
              <path
                d={d}
                stroke="transparent"
                strokeWidth={Math.max(style.width + 12, 16)}
                fill="none"
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={() => onSelectOverlay(overlay.id)}
              />
            )}

            <path
              d={d}
              stroke={style.color}
              strokeWidth={style.width}
              strokeOpacity={style.opacity}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={style.dash || undefined}
              fill="none"
              filter={style.glow > 0 ? `url(#poly-glow-${overlay.id})` : undefined}
            />

            {isSelected && (
              <>
                <path
                  d={d}
                  stroke="white"
                  strokeWidth={style.width + 2}
                  strokeOpacity={0.35}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={style.dash || undefined}
                  fill="none"
                />
                {proj.vertices.map((v, i) => (
                  <circle
                    key={i}
                    cx={v.x}
                    cy={v.y}
                    r={5}
                    fill={style.color}
                    stroke="white"
                    strokeWidth={1.5}
                    opacity={style.opacity}
                  />
                ))}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
