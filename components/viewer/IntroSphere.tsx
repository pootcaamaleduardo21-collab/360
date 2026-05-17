'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Tour } from '@/types/tour.types';

interface IntroSphereProps {
  tour: Tour;
  /** When true, triggers the dissolve-out animation */
  dissolve: boolean;
  /** Called after the dissolve animation finishes (~700ms after dissolve=true) */
  onDone: () => void;
}

export function IntroSphere({ tour, dissolve, onDone }: IntroSphereProps) {
  const brandColor = tour.brandColor ?? '#1d4ed8';

  useEffect(() => {
    if (!dissolve) return;
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [dissolve, onDone]);

  return (
    <div
      className={cn(
        'absolute inset-0 z-[60] flex flex-col items-center justify-center bg-gray-950',
        'transition-opacity duration-[650ms] ease-in-out',
        dissolve ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
    >
      {/* CSS 3-D sphere */}
      <div className="relative mb-10" style={{ width: 88, height: 88 }}>
        {/* Ambient glow behind the sphere */}
        <div
          className="absolute rounded-full blur-2xl opacity-25"
          style={{ inset: -20, background: brandColor }}
        />

        {/* Sphere body — radial highlight gives the illusion of depth */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 38% 38%, rgba(255,255,255,0.22) 0%, transparent 55%), ${brandColor}`,
            boxShadow: `inset -6px -6px 18px rgba(0,0,0,0.4), 0 0 28px ${brandColor}55`,
            animation: 'intro-sphere-pulse 2.8s ease-in-out infinite',
          }}
        />

        {/* Equatorial orbit ring */}
        <div
          className="absolute"
          style={{
            inset: -11,
            border: '1.5px solid rgba(255,255,255,0.28)',
            borderRadius: '50%',
            animation: 'intro-orbit-a 3.2s linear infinite',
          }}
        />

        {/* Tilted orbit ring */}
        <div
          className="absolute"
          style={{
            inset: -7,
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: '50%',
            animation: 'intro-orbit-b 5s linear infinite reverse',
          }}
        />

        {/* 360° badge in sphere center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black tracking-[0.12em] text-white/75 select-none">
            360°
          </span>
        </div>
      </div>

      {/* Brand identity */}
      {tour.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tour.logoUrl}
          alt=""
          className="h-10 max-w-[200px] object-contain mb-3 opacity-90"
        />
      ) : (
        <p className="text-white text-base font-black mb-2 tracking-wide truncate max-w-[240px] text-center px-4">
          {tour.brandName ?? tour.title}
        </p>
      )}

      <p className="text-white/35 text-[10px] tracking-[0.18em] uppercase">
        Cargando experiencia 360°
      </p>

      {/* Staggered loading dots */}
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-white/25"
            style={{ animation: `intro-sphere-pulse 1.4s ease-in-out ${i * 0.22}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
