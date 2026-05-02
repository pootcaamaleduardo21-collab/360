'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Tour, Scene, ViewerConfig } from '@/types/tour.types';
import { Viewer360 } from './Viewer360';
import { ComparisonScenePicker } from './ComparisonScenePicker';
import { ChevronDown, GripVertical } from 'lucide-react';

interface ComparisonViewerProps {
  tour: Tour;
  sceneA: Scene;
  sceneB: Scene;
  config: ViewerConfig;
  onNavigateA: (sceneId: string) => void;
  onNavigateB: (sceneId: string) => void;
}

export function ComparisonViewer({
  tour,
  sceneA,
  sceneB,
  config,
  onNavigateA,
  onNavigateB,
}: ComparisonViewerProps) {
  // Split ratio: 0–1, default 50/50
  const [splitRatio,  setSplitRatio]  = useState(0.5);
  const [dragging,    setDragging]    = useState(false);
  const [pickerPanel, setPickerPanel] = useState<'A' | 'B' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Disable auto-rotate in comparison mode
  const comparisonConfig: ViewerConfig = { ...config, autoRotate: false, showTutorial: false };

  // ── Divider drag ───────────────────────────────────────────────────────────
  const handleDividerMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const move = (e: MouseEvent | TouchEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const ratio = Math.min(0.8, Math.max(0.2, (clientX - rect.left) / rect.width));
      setSplitRatio(ratio);
    };
    const up = () => setDragging(false);

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragging]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex select-none overflow-hidden">

      {/* ── Panel A ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ width: `${splitRatio * 100}%` }}>
        {/* Scene label + picker trigger */}
        <button
          onClick={() => setPickerPanel('A')}
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold rounded-xl hover:bg-black/80 transition-colors shadow"
        >
          {sceneA.name}
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        {/* Panel A label badge */}
        <div className="absolute top-3 right-3 z-20 px-2 py-0.5 bg-blue-600/80 text-white text-[10px] font-bold rounded-full">
          A
        </div>

        <Viewer360
          tour={tour}
          currentScene={sceneA}
          config={comparisonConfig}
          onNavigate={onNavigateA}
          isComparisonPanel
        />

        {/* Scene picker overlay for A */}
        {pickerPanel === 'A' && (
          <ComparisonScenePicker
            scenes={tour.scenes}
            currentSceneId={sceneA.id}
            label="Panel A"
            onSelect={onNavigateA}
            onClose={() => setPickerPanel(null)}
          />
        )}
      </div>

      {/* ── Drag divider ───────────────────────────────────────────────────── */}
      <div
        className="relative z-30 flex-shrink-0 flex items-center justify-center w-1 bg-gray-700 hover:bg-blue-500 transition-colors cursor-col-resize"
        style={{ cursor: dragging ? 'col-resize' : 'col-resize' }}
        onMouseDown={handleDividerMouseDown}
        onTouchStart={handleDividerMouseDown}
      >
        <div className="w-5 h-10 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center shadow-lg">
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
      </div>

      {/* ── Panel B ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden flex-1">
        {/* Scene label + picker trigger */}
        <button
          onClick={() => setPickerPanel('B')}
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold rounded-xl hover:bg-black/80 transition-colors shadow"
        >
          {sceneB.name}
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        {/* Panel B label badge */}
        <div className="absolute top-3 right-3 z-20 px-2 py-0.5 bg-emerald-600/80 text-white text-[10px] font-bold rounded-full">
          B
        </div>

        <Viewer360
          tour={tour}
          currentScene={sceneB}
          config={comparisonConfig}
          onNavigate={onNavigateB}
          isComparisonPanel
        />

        {/* Scene picker overlay for B */}
        {pickerPanel === 'B' && (
          <ComparisonScenePicker
            scenes={tour.scenes}
            currentSceneId={sceneB.id}
            label="Panel B"
            onSelect={onNavigateB}
            onClose={() => setPickerPanel(null)}
          />
        )}
      </div>
    </div>
  );
}
