'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Tour } from '@/types/tour.types';
import { cn } from '@/lib/utils';
import { Play, Pause, SkipForward, X, Map } from 'lucide-react';

interface GuidedTourOverlayProps {
  tour: Tour;
  currentSceneId: string;
  onNavigate: (sceneId: string) => void;
  onClose: () => void;
}

export function GuidedTourOverlay({ tour, currentSceneId, onNavigate, onClose }: GuidedTourOverlayProps) {
  const intervalSec = tour.guidedTourAutoAdvanceSec ?? 8;

  // Ordered scene list for the guided tour
  const sceneOrder = (() => {
    const customOrder = tour.guidedTourSceneOrder ?? [];
    if (customOrder.length > 0) {
      return customOrder
        .map((id) => tour.scenes.find((s) => s.id === id))
        .filter(Boolean) as Tour['scenes'];
    }
    // Default: featured scenes first, then rest in order
    const featured = tour.scenes.filter((s) => s.featured);
    const rest     = tour.scenes.filter((s) => !s.featured);
    return featured.length > 0 ? [...featured, ...rest] : tour.scenes;
  })();

  const currentIndex = sceneOrder.findIndex((s) => s.id === currentSceneId);
  const safeIndex    = currentIndex >= 0 ? currentIndex : 0;

  const [playing,  setPlaying]  = useState(true);
  const [progress, setProgress] = useState(0); // 0-100

  const progressRef  = useRef(0);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    const target = sceneOrder[idx];
    if (target) onNavigate(target.id);
    progressRef.current = 0;
    setProgress(0);
  }, [sceneOrder, onNavigate]);

  const advance = useCallback(() => {
    const nextIdx = (safeIndex + 1) % sceneOrder.length;
    goTo(nextIdx);
  }, [safeIndex, sceneOrder.length, goTo]);

  // Tick every 100 ms to update progress bar, auto-advance when full
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const tickMs    = 100;
    const totalTicks = (intervalSec * 1000) / tickMs;

    timerRef.current = setInterval(() => {
      progressRef.current += 1;
      setProgress(Math.min((progressRef.current / totalTicks) * 100, 100));

      if (progressRef.current >= totalTicks) {
        progressRef.current = 0;
        setProgress(0);
        advance();
      }
    }, tickMs);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, advance, intervalSec]);

  // Reset progress when scene changes externally
  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
  }, [currentSceneId]);

  const currentScene = sceneOrder[safeIndex];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-[340px] sm:w-[420px]">
      <div className="bg-gray-950/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">

        {/* Progress bar */}
        <div className="h-0.5 bg-gray-800">
          <div
            className="h-full bg-blue-500 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Scene info */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Map className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentScene?.name ?? 'Escena'}</p>
              <p className="text-[10px] text-gray-500">
                {safeIndex + 1} / {sceneOrder.length} · Recorrido guiado
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setPlaying((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title={playing ? 'Pausar' : 'Reanudar'}
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={advance}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title="Siguiente escena"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
              title="Salir del recorrido"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scene dots */}
        {sceneOrder.length > 1 && sceneOrder.length <= 20 && (
          <div className="flex items-center justify-center gap-1 pb-2.5 px-4">
            {sceneOrder.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                className={cn(
                  'h-1 rounded-full transition-all',
                  i === safeIndex ? 'w-4 bg-blue-400' : 'w-1 bg-gray-700 hover:bg-gray-500'
                )}
                title={s.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
