'use client';

import { useEffect } from 'react';
import { ColorAdjustments } from '@/types/tour.types';

/**
 * Applies CSS `filter` to the Three.js renderer canvas to simulate
 * brightness, contrast, and saturation adjustments.
 *
 * The values mirror CSS filter semantics:
 *   brightness: 0 = black, 1 = original, 2 = double
 *   contrast:   0 = grey, 1 = original, 2 = double
 *   saturate:   0 = greyscale, 1 = original, 2 = double
 *
 * Our store uses a -100 to +100 scale for UX. This hook converts.
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

    const { brightness, contrast, saturation } = adjustments;

    // Convert -100…+100 to CSS filter values
    // brightness: 0 → 0.0, 0 → 1.0 (original), +100 → 2.0
    const b = 1 + brightness / 100;
    // contrast: -100 → 0.0, 0 → 1.0, +100 → 2.0
    const c = 1 + contrast / 100;
    // saturate: -100 → 0.0, 0 → 1.0, +100 → 2.0
    const s = 1 + saturation / 100;

    canvas.style.filter = [
      `brightness(${Math.max(0, b).toFixed(2)})`,
      `contrast(${Math.max(0, c).toFixed(2)})`,
      `saturate(${Math.max(0, s).toFixed(2)})`,
    ].join(' ');
  }, [containerRef, adjustments]);
}
