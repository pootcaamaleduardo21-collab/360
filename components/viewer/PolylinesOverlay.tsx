'use client';

import { PolylineOverlay } from '@/types/tour.types';

interface ProjectedOverlay {
  id: string;
  points: Array<{ x: number; y: number; visible: boolean }>;
}

interface PolylinesOverlayProps {
  overlays: PolylineOverlay[];
  projectedOverlays: ProjectedOverlay[];
  /** Editor: which overlay is currently selected */
  selectedOverlayId?: string | null;
  /** Editor: called when a polyline path is clicked */
  onSelectOverlay?: (id: string) => void;
  /** Editor: show vertex dots for the selected overlay */
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
            <filter
              key={o.id}
              id={`poly-glow-${o.id}`}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
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
        if (!proj || proj.points.length < 2) return null;

        const { style } = overlay;
        const pts = proj.points;
        const isSelected = isEditing && selectedOverlayId === overlay.id;

        // Build visible segments: only draw between consecutive visible vertices
        const segments: string[] = [];
        for (let i = 0; i < pts.length - 1; i++) {
          if (pts[i].visible && pts[i + 1].visible) {
            segments.push(`M ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} L ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`);
          }
        }
        // Close polygon
        if (style.closed && pts.length >= 2) {
          const first = pts[0];
          const last  = pts[pts.length - 1];
          if (first.visible && last.visible) {
            segments.push(`M ${last.x.toFixed(1)} ${last.y.toFixed(1)} L ${first.x.toFixed(1)} ${first.y.toFixed(1)}`);
          }
        }

        const d = segments.join(' ');
        if (!d) return null;

        return (
          <g key={overlay.id}>
            {/* Invisible wider hit area for easier clicking */}
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

            {/* Main line */}
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

            {/* Selected overlay: highlight + vertex dots */}
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
                {pts.filter((p) => p.visible).map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
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
