'use client';

import { PolylineOverlay } from '@/types/tour.types';

interface ProjectedPoint {
  x: number; y: number; visible: boolean;
  ndcX: number; ndcY: number; ndcZ: number;
}

interface ProjectedOverlay {
  id: string;
  w: number;
  h: number;
  points: ProjectedPoint[];
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

// Compute the point where segment (visible → hidden) crosses the NDC horizon (ndcZ=1)
// and convert back to screen space.
function clipToHorizon(
  vis: ProjectedPoint, hid: ProjectedPoint, w: number, h: number,
): { x: number; y: number } | null {
  const dz = hid.ndcZ - vis.ndcZ;
  if (dz === 0) return null;
  const t = (1 - vis.ndcZ) / dz;
  if (t < 0 || t > 1) return null;
  const cx = vis.ndcX + t * (hid.ndcX - vis.ndcX);
  const cy = vis.ndcY + t * (hid.ndcY - vis.ndcY);
  return { x: (cx * 0.5 + 0.5) * w, y: (-cy * 0.5 + 0.5) * h };
}

function buildSegments(pts: ProjectedPoint[], closed: boolean, w: number, h: number): string {
  const segs: string[] = [];

  const addSeg = (ax: number, ay: number, bx: number, by: number) =>
    segs.push(`M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${bx.toFixed(1)} ${by.toFixed(1)}`);

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (a.visible && b.visible) {
      addSeg(a.x, a.y, b.x, b.y);
    } else if (a.visible && !b.visible) {
      const c = clipToHorizon(a, b, w, h);
      if (c) addSeg(a.x, a.y, c.x, c.y);
    } else if (!a.visible && b.visible) {
      const c = clipToHorizon(b, a, w, h);
      if (c) addSeg(c.x, c.y, b.x, b.y);
    }
  }

  if (closed && pts.length >= 2) {
    const first = pts[0];
    const last  = pts[pts.length - 1];
    if (last.visible && first.visible) {
      addSeg(last.x, last.y, first.x, first.y);
    } else if (last.visible && !first.visible) {
      const c = clipToHorizon(last, first, w, h);
      if (c) addSeg(last.x, last.y, c.x, c.y);
    } else if (!last.visible && first.visible) {
      const c = clipToHorizon(first, last, w, h);
      if (c) addSeg(c.x, c.y, first.x, first.y);
    }
  }

  return segs.join(' ');
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
        if (!proj || proj.points.length < 2) return null;

        const { style } = overlay;
        const { points: pts, w, h } = proj;
        const isSelected = isEditing && selectedOverlayId === overlay.id;

        const d = buildSegments(pts, style.closed, w, h);
        if (!d) return null;

        return (
          <g key={overlay.id}>
            {/* Invisible wider hit area */}
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

            {/* Selected: highlight + vertex dots */}
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
                  <circle key={i} cx={p.x} cy={p.y} r={5}
                    fill={style.color} stroke="white" strokeWidth={1.5} opacity={style.opacity}
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
