'use client';

import { SceneMeasurements } from '@/types/tour.types';
import { Ruler } from 'lucide-react';

interface MeasurementsOverlayProps {
  measurements: SceneMeasurements;
}

/**
 * Compact overlay shown in the bottom-left of the viewer when the current scene
 * has measurements configured. Shows area, dimensions and ceiling height.
 */
export function MeasurementsOverlay({ measurements: m }: MeasurementsOverlayProps) {
  const hasDims = m.width && m.length;
  const area    = m.area ?? (hasDims ? parseFloat((m.width! * m.length!).toFixed(2)) : null);

  if (!area && !m.width && !m.length && !m.height && !m.label) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10 max-w-xs">
      <Ruler className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <div className="min-w-0">
        {m.label && (
          <p className="text-[11px] font-semibold text-white leading-tight truncate">
            {m.label}
          </p>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
          {hasDims && (
            <span className="text-[11px] text-gray-300">
              {m.width}m × {m.length}m
            </span>
          )}
          {area && (
            <span className="text-[11px] text-gray-300 font-medium">
              {area} m²
            </span>
          )}
          {m.height && (
            <span className="text-[11px] text-gray-400">
              techo {m.height}m
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
