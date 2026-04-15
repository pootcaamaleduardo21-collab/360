'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Scene, Hotspot, Tour, ViewerConfig, HotspotType } from '@/types/tour.types';
import { useViewer360 } from '@/hooks/useViewer360';
import { useColorFilter } from '@/hooks/useColorFilter';
import { HotspotMarker } from './HotspotMarker';
import { HotspotModal } from './HotspotModal';
import { MinimapWidget } from './MinimapWidget';
import { TutorialOverlay } from './TutorialOverlay';
import { useTourStore } from '@/store/tourStore';
import { cn } from '@/lib/utils';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  ShoppingCart,
  Pencil,
  Plus,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Viewer360Props {
  tour: Tour;
  currentScene: Scene;
  config: ViewerConfig;

  /** Show hotspot editor controls (add/remove) */
  isEditing?: boolean;
  /** Type to add when clicking in edit mode */
  addHotspotType?: HotspotType;

  onNavigate: (sceneId: string) => void;
  onHotspotAdded?: (sceneId: string, yaw: number, pitch: number) => void;
  onHotspotSelected?: (hotspotId: string | null) => void;
  selectedHotspotId?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Viewer360({
  tour,
  currentScene,
  config,
  isEditing = false,
  addHotspotType,
  onNavigate,
  onHotspotAdded,
  onHotspotSelected,
  selectedHotspotId,
}: Viewer360Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeHotspot,      setActiveHotspot]      = useState<Hotspot | null>(null);
  const [showTutorial,       setShowTutorial]       = useState(config.showTutorial);
  const [isFullscreen,       setIsFullscreen]       = useState(false);
  const tutorialDismissed    = useTourStore((s) => s.tutorialDismissed);
  const dismissTutorial      = useTourStore((s) => s.dismissTutorial);
  const cartItemCount        = useTourStore((s) => s.items.reduce((a, i) => a + i.quantity, 0));
  const toggleCart           = useTourStore((s) => s.toggleCart);

  // Hide tutorial if user has already dismissed it globally
  useEffect(() => {
    if (tutorialDismissed) setShowTutorial(false);
  }, [tutorialDismissed]);

  const handleAddHotspot = useCallback(
    (yaw: number, pitch: number) => {
      onHotspotAdded?.(currentScene.id, yaw, pitch);
    },
    [currentScene.id, onHotspotAdded]
  );

  const handleHotspotClick = useCallback(
    (hotspot: Hotspot) => {
      if (isEditing) {
        onHotspotSelected?.(hotspot.id);
        return;
      }
      // Navigation hotspots go immediately
      if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
        onNavigate(hotspot.targetSceneId);
        return;
      }
      setActiveHotspot(hotspot);
    },
    [isEditing, onHotspotSelected, onNavigate]
  );

  // Apply CSS color filters to the Three.js canvas
  useColorFilter(containerRef, currentScene.colorAdjustments);

  const { isLoading, error, hotspotPositions, lookAt } = useViewer360({
    containerRef,
    scene: currentScene,
    config,
    isEditing: isEditing && !!addHotspotType,
    onAddHotspot: handleAddHotspot,
  });

  // ── Zoom helpers ─────────────────────────────────────────────────────────
  const updateViewerConfig = useTourStore((s) => s.updateViewerConfig);

  const zoomIn = () =>
    updateViewerConfig({ fov: Math.max(config.minFov, config.fov - 10) });
  const zoomOut = () =>
    updateViewerConfig({ fov: Math.min(config.maxFov, config.fov + 10) });
  const resetView = () => {
    updateViewerConfig({ fov: 75 });
    lookAt(currentScene.initialYaw ?? 0, currentScene.initialPitch ?? 0);
  };

  // ── Fullscreen ───────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'relative w-full h-full bg-gray-950 overflow-hidden select-none',
        isEditing && addHotspotType ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      )}
    >
      {/* Three.js canvas mount point */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Nadir patch (logo over tripod) */}
      {currentScene.nadirEnabled && currentScene.nadirLogoUrl && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentScene.nadirLogoUrl}
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-950">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/60">Cargando imagen 360°…</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-950 p-6">
          <div className="text-center max-w-xs">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">Error al cargar</p>
            <p className="text-sm text-white/50">{error}</p>
          </div>
        </div>
      )}

      {/* Hotspot markers — rendered as DOM overlays positioned via screen-space projection */}
      {!isLoading && !error && hotspotPositions.map(({ id, x, y, visible }) => {
        if (!visible) return null;
        const hotspot = currentScene.hotspots.find((h) => h.id === id);
        if (!hotspot) return null;
        return (
          <HotspotMarker
            key={id}
            hotspot={hotspot}
            x={x}
            y={y}
            isSelected={selectedHotspotId === id}
            isEditing={isEditing}
            onClick={handleHotspotClick}
          />
        );
      })}

      {/* Active hotspot modal */}
      {activeHotspot && (
        <HotspotModal
          hotspot={activeHotspot}
          currentSceneId={currentScene.id}
          onClose={() => setActiveHotspot(null)}
          onNavigate={(sceneId) => {
            onNavigate(sceneId);
            setActiveHotspot(null);
          }}
        />
      )}

      {/* Tutorial overlay */}
      {showTutorial && !isEditing && (
        <TutorialOverlay
          onDismiss={() => {
            setShowTutorial(false);
            dismissTutorial();
          }}
        />
      )}

      {/* Minimap */}
      {config.showMinimap && !isEditing && tour.scenes.length > 1 && (
        <MinimapWidget
          tour={tour}
          currentSceneId={currentScene.id}
          onNavigate={onNavigate}
        />
      )}

      {/* Controls toolbar */}
      {config.showControls && (
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <ControlButton onClick={zoomIn}    title="Acercar"     icon={<ZoomIn   className="w-4 h-4" />} />
          <ControlButton onClick={zoomOut}   title="Alejar"      icon={<ZoomOut  className="w-4 h-4" />} />
          <ControlButton onClick={resetView} title="Vista inicial" icon={<RotateCcw className="w-4 h-4" />} />
          <ControlButton onClick={toggleFullscreen} title="Pantalla completa" icon={<Maximize2 className="w-4 h-4" />} />
        </div>
      )}

      {/* Cart button (bottom-right) */}
      {!isEditing && cartItemCount > 0 && (
        <button
          onClick={toggleCart}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl shadow-lg transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="text-sm">{cartItemCount}</span>
        </button>
      )}

      {/* Edit mode indicator */}
      {isEditing && addHotspotType && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-blue-600/90 backdrop-blur-sm text-white text-sm font-medium rounded-full shadow-lg">
          <Plus className="w-4 h-4" />
          Haz clic en la imagen para agregar hotspot
        </div>
      )}

      {/* Scene name badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white/80 text-xs font-medium rounded-full">
          {currentScene.name}
        </span>
      </div>
    </div>
  );
}

// ─── Helper sub-component ─────────────────────────────────────────────────────

function ControlButton({
  onClick,
  title,
  icon,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm border border-white/10 transition-colors shadow"
    >
      {icon}
    </button>
  );
}
