'use client';

import { useEffect } from 'react';
import { ColorAdjustments } from '@/types/tour.types';

/**
 * Applies CSS `filter` to the Three.js renderer canvas.
 * Converts the store's -100…+100 scale to CSS filter values.
 * Temperature is approximated via sepia + hue-rotate.
 * Vignette is a separate DOM overlay handled in Viewer360.
 */
export function useColorFilter(
  containerRef: React.RefObject<HTMLDivElement>,
  adjustments: ColorAdjustments | undefined
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    if (!adjustments) {
      canvas.style.filter = '';
      return;
    }

    const { brightness, contrast, saturation, temperature = 0 } = adjustments;

    const b = 1 + brightness / 100;
    const c = 1 + contrast / 100;
    const s = 1 + saturation / 100;

    const filters: string[] = [
      `brightness(${Math.max(0, b).toFixed(2)})`,
      `contrast(${Math.max(0, c).toFixed(2)})`,
      `saturate(${Math.max(0, s).toFixed(2)})`,
    ];

    if (temperature !== 0) {
      const t = temperature / 100; // -1 (cool) to +1 (warm)
      if (t > 0) {
        // Warm: sepia adds amber/golden tones; slight negative hue-rotate keeps it amber
        filters.push(`sepia(${(t * 0.4).toFixed(2)})`);
        filters.push(`hue-rotate(${(-t * 12).toFixed(1)}deg)`);
      } else {
        // Cool: positive hue-rotate shifts spectrum toward blue-cyan
        const at = Math.abs(t);
        filters.push(`hue-rotate(${(at * 30).toFixed(1)}deg)`);
        filters.push(`saturate(${(1 + at * 0.2).toFixed(2)})`);
      }
    }

    canvas.style.filter = filters.join(' ');
  }, [containerRef, adjustments]);
}
