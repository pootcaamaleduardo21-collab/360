'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Scene, Hotspot, Tour, ViewerConfig, HotspotType } from '@/types/tour.types';
import { useViewer360 } from '@/hooks/useViewer360';
import { useColorFilter } from '@/hooks/useColorFilter';
import { HotspotMarker } from './HotspotMarker';
import { HotspotModal } from './HotspotModal';
import { MapHotspotRouteCard } from './MapHotspotRouteCard';
import { MinimapWidget } from './MinimapWidget';
import { FloorPlanWidget } from './FloorPlanWidget';
import { TutorialOverlay } from './TutorialOverlay';
import { AudioGuide } from './AudioGuide';
import { MeasurementsOverlay } from './MeasurementsOverlay';
import { MediaGallery, MediaGalleryButton } from './MediaGallery';
import { NavigationPanel } from './NavigationPanel';
import { IntroSphere } from './IntroSphere';
import { PolylinesOverlay } from './PolylinesOverlay';
import { AnnotationsOverlay } from './AnnotationsOverlay';
import { useTourStore } from '@/store/tourStore';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import {
  ZoomIn,
  ZoomOut,
  Pause,
  Play,
  RotateCcw,
  Maximize2,
  ShoppingCart,
  LayoutList,
  Calendar,
  Plus,
  Loader2,
  AlertTriangle,
  MapPin,
  Map,
  Crosshair,
  Box,
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
  onOpenSalesPanel?: () => void;
  onOpenBooking?: () => void;
  onOpenLeadCapture?: () => void;
  onOpenPOIPanel?: () => void;
  onOpenModel3D?: () => void;
  /** When true, hides CTAs that don't belong in split-screen panels */
  isComparisonPanel?: boolean;
  /** Show media gallery button + overlay */
  onOpenMediaGallery?: () => void;
  /** Editor only: called with current yaw+pitch so the scene's starting view can be saved */
  onSetStartView?: (yaw: number, pitch: number) => void;
  /** Preload all other scene panoramas after mount. Disable in editor to avoid loading dozens of full 360s at once. */
  preloadAdjacentScenes?: boolean;
  /** Editor: ID of the overlay currently being edited (shows vertex dots + selection highlight) */
  selectedOverlayId?: string | null;
  /** Editor: called when user clicks on a polyline in the viewer */
  onSelectOverlay?: (id: string) => void;
  /** Editor: when set, clicks place a new vertex on this overlay instead of adding a hotspot */
  addingVertexToOverlayId?: string | null;
  /** Editor: called when a vertex is placed in addingVertexToOverlayId mode */
  onVertexAdded?: (sceneId: string, overlayId: string, yaw: number, pitch: number) => void;
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
  onOpenSalesPanel,
  onOpenBooking,
  onOpenLeadCapture,
  onOpenPOIPanel,
  onOpenModel3D,
  isComparisonPanel = false,
  onOpenMediaGallery,
  onSetStartView,
  preloadAdjacentScenes = true,
  selectedOverlayId,
  onSelectOverlay,
  addingVertexToOverlayId,
  onVertexAdded,
}: Viewer360Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeHotspot,      setActiveHotspot]      = useState<Hotspot | null>(null);
  const [showTutorial,       setShowTutorial]       = useState(config.showTutorial);
  const [isFullscreen,       setIsFullscreen]       = useState(false);
  const [draggingHotspotId,  setDraggingHotspotId]  = useState<string | null>(null);
  const [sceneTransition,    setSceneTransition]    = useState(false);
  const [showIntro,          setShowIntro]          = useState(!isEditing && !isComparisonPanel);
  const [dissolveIntro,      setDissolveIntro]      = useState(false);
  const prevSceneIdRef       = useRef(currentScene.id);
  const sceneTransitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutorialDismissed    = useTourStore((s) => s.tutorialDismissed);
  const dismissTutorial      = useTourStore((s) => s.dismissTutorial);
  const cartItemCount        = useTourStore((s) => s.items.reduce((a, i) => a + i.quantity, 0));
  const toggleCart           = useTourStore((s) => s.toggleCart);
  const updateHotspot        = useTourStore((s) => s.updateHotspot);
  const hasBottomMinimap     = config.showMinimap && !isEditing && tour.scenes.length > 1;

  // Track time spent per scene
  const sceneEnteredAt = useRef<number>(Date.now());
  const prevSceneId    = useRef<string>(currentScene.id);

  // Hide tutorial if user has already dismissed it globally
  useEffect(() => {
    if (tutorialDismissed) setShowTutorial(false);
  }, [tutorialDismissed]);

  // Silently preload nearby scene images after 2 s so navigation feels instant
  // without pulling every heavy panorama at once.
  // The editor disables this to avoid competing with the active panorama load.
  useEffect(() => {
    if (!preloadAdjacentScenes) return;
    if (tour.scenes.length <= 1) return;
    const timer = setTimeout(() => {
      const currentIndex = tour.scenes.findIndex((s) => s.id === currentScene.id);
      const nearbyScenes = tour.scenes.filter((_, index) => {
        if (index === currentIndex) return false;
        return Math.abs(index - currentIndex) <= 2;
      });

      nearbyScenes.forEach((s) => {
        if (s.imageUrl && s.imageUrl !== currentScene.imageUrl) {
          const img = new Image();
          img.src = s.imageUrl;
        }
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [preloadAdjacentScenes, tour.scenes, currentScene.id, currentScene.imageUrl]);

  // Scene transition overlay — instant black on scene change, guaranteed 400ms, then fade out
  useEffect(() => {
    if (currentScene.id !== prevSceneIdRef.current) {
      prevSceneIdRef.current = currentScene.id;
      if (sceneTransitionTimer.current) clearTimeout(sceneTransitionTimer.current);
      setSceneTransition(true);
      sceneTransitionTimer.current = setTimeout(() => setSceneTransition(false), 400);
    }
    return () => {
      if (sceneTransitionTimer.current) clearTimeout(sceneTransitionTimer.current);
    };
  }, [currentScene.id]);

  // Scene duration tracking — fires scene_exit on navigation
  useEffect(() => {
    if (!isEditing && currentScene.id !== prevSceneId.current) {
      const durationMs = Date.now() - sceneEnteredAt.current;
      trackEvent({
        tourId: tour.id,
        event: 'scene_exit',
        sceneId: prevSceneId.current,
        metadata: { durationMs },
      });
      prevSceneId.current    = currentScene.id;
      sceneEnteredAt.current = Date.now();
    }
  }, [currentScene.id, isEditing, tour.id]);

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
      // Track hotspot click
      trackEvent({
        tourId: tour.id,
        event: 'hotspot_click',
        sceneId: currentScene.id,
        hotspotId: hotspot.id,
      });
      // Navigation hotspots go immediately
      if (hotspot.type === 'navigation' && hotspot.targetSceneId) {
        onNavigate(hotspot.targetSceneId);
        return;
      }
      setActiveHotspot(hotspot);
    },
    [isEditing, onHotspotSelected, onNavigate, tour.id, currentScene.id]
  );

  // Apply CSS color filters to the Three.js canvas
  useColorFilter(containerRef, currentScene.colorAdjustments);

  const handleFirstLoad = useCallback(() => setDissolveIntro(true), []);

  const {
    isLoading, error, hotspotPositions, overlayPositions, annotationPositions,
    lookAt, getAngles, screenToSpherical,
  } = useViewer360({
    containerRef,
    scene: currentScene,
    config,
    isEditing: isEditing && (!!addHotspotType || !!addingVertexToOverlayId),
    onAddHotspot: addingVertexToOverlayId
      ? (yaw, pitch) => onVertexAdded?.(currentScene.id, addingVertexToOverlayId, yaw, pitch)
      : handleAddHotspot,
    onFirstLoad: showIntro ? handleFirstLoad : undefined,
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
  const toggleAutoRotate = () =>
    updateViewerConfig({ autoRotate: !config.autoRotate });

  // ── Hotspot drag ─────────────────────────────────────────────────────────
  const handleHotspotDragStart = useCallback(
    (hotspotId: string, _e: React.PointerEvent) => {
      if (!isEditing) return;
      setDraggingHotspotId(hotspotId);
      onHotspotSelected?.(hotspotId);
    },
    [isEditing, onHotspotSelected]
  );

  const handleWrapperPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingHotspotId || !screenToSpherical) return;
      const result = screenToSpherical(e.clientX, e.clientY);
      if (!result) return;
      updateHotspot(currentScene.id, draggingHotspotId, { yaw: result.yaw, pitch: result.pitch });
    },
    [draggingHotspotId, screenToSpherical, updateHotspot, currentScene.id]
  );

  const handleWrapperPointerUp = useCallback(() => {
    setDraggingHotspotId(null);
  }, []);

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
        draggingHotspotId ? 'cursor-grabbing' :
        (isEditing && (addHotspotType || addingVertexToOverlayId)) ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      )}
      onPointerMove={handleWrapperPointerMove}
      onPointerUp={handleWrapperPointerUp}
    >
      {/* Thumbnail backdrop — shows instantly while the 360° texture loads */}
      {currentScene.thumbnailUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${currentScene.thumbnailUrl})`, filter: 'blur(12px)', transform: 'scale(1.05)' }}
        />
      )}

      {/* Scene transition overlay — instant black on navigate, slow fade-out after 400ms */}
      <div
        className={cn(
          'absolute inset-0 z-[55] bg-black pointer-events-none',
          sceneTransition ? 'opacity-100' : 'opacity-0 transition-opacity duration-500'
        )}
      />

      {/* Intro sphere — shown on first load, dissolves when panorama is ready */}
      {showIntro && (
        <IntroSphere
          tour={tour}
          dissolve={dissolveIntro}
          onDone={() => setShowIntro(false)}
        />
      )}

      {/* Three.js canvas mount point — touch-none prevents browser gesture interception */}
      <div ref={containerRef} className="absolute inset-0 touch-none" />

      {/* Polyline / boundary-line overlays */}
      {(currentScene.overlays?.length ?? 0) > 0 && (
        <PolylinesOverlay
          overlays={(currentScene.overlays ?? []).filter((o) => o.type === 'polyline') as import('@/types/tour.types').PolylineOverlay[]}
          projectedOverlays={overlayPositions}
          selectedOverlayId={selectedOverlayId}
          onSelectOverlay={isEditing ? onSelectOverlay : undefined}
          isEditing={isEditing}
        />
      )}

      {/* Text/image annotations — fixed to the 360 sphere without hotspot points */}
      {(currentScene.overlays?.some((o) => o.type === 'annotation')) && (
        <AnnotationsOverlay
          annotations={(currentScene.overlays ?? []).filter((o) => o.type === 'annotation') as import('@/types/tour.types').AnnotationOverlay[]}
          projectedAnnotations={annotationPositions}
          selectedOverlayId={selectedOverlayId}
          onSelectOverlay={isEditing ? onSelectOverlay : undefined}
          isEditing={isEditing}
        />
      )}

      {/* Side navigation panel — visible in both viewer and editor for live preview */}
      <NavigationPanel
        tour={tour}
        currentSceneId={currentScene.id}
        onNavigate={onNavigate}
      />

      {/* Vignette overlay */}
      {(currentScene.colorAdjustments?.vignette ?? 0) > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{
            background: `radial-gradient(ellipse at center, transparent ${
              Math.round(100 - (currentScene.colorAdjustments!.vignette! * 0.55))
            }%, rgba(0,0,0,${((currentScene.colorAdjustments!.vignette! / 100) * 0.82).toFixed(2)}) 100%)`,
          }}
        />
      )}

      {/* Nadir patch is baked into the equirectangular image — no extra overlay needed */}

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
        const unitStatus = hotspot.type === 'unit' && hotspot.unitId
          ? tour.units?.find((u) => u.id === hotspot.unitId)?.status
          : undefined;
        const unitLabel = hotspot.type === 'unit' && hotspot.unitId
          ? tour.units?.find((u) => u.id === hotspot.unitId)?.label
          : undefined;
        const targetSceneName = hotspot.type === 'navigation' && hotspot.targetSceneId
          ? tour.scenes.find((s) => s.id === hotspot.targetSceneId)?.name
          : undefined;
        return (
          <HotspotMarker
            key={id}
            hotspot={hotspot}
            x={x}
            y={y}
            isSelected={selectedHotspotId === id}
            isEditing={isEditing}
            onClick={handleHotspotClick}
            unitStatus={unitStatus}
            unitLabel={unitLabel}
            targetSceneName={targetSceneName}
            onDragStart={isEditing ? handleHotspotDragStart : undefined}
          />
        );
      })}

      {/* Active hotspot modal / route card */}
      {activeHotspot?.type === 'map' && (
        <MapHotspotRouteCard
          hotspot={activeHotspot}
          tour={tour}
          onClose={() => setActiveHotspot(null)}
        />
      )}

      {activeHotspot && activeHotspot.type !== 'map' && (
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

      {/* Floor plan widget — hidden when the minimap already owns that corner */}
      {!isEditing && !config.showMinimap && (
        <FloorPlanWidget
          tour={tour}
          currentSceneId={currentScene.id}
          onNavigate={onNavigate}
        />
      )}

      {/* Controls toolbar — zoom hidden on mobile (use pinch), only reset + fullscreen shown */}
      {config.showControls && (
        <div className="absolute top-[96px] right-4 z-20 flex flex-col gap-2">
          <div className="hidden md:flex flex-col gap-2">
            <ControlButton onClick={zoomIn}  title="Acercar" icon={<ZoomIn  className="w-4 h-4" />} />
            <ControlButton onClick={zoomOut} title="Alejar"  icon={<ZoomOut className="w-4 h-4" />} />
          </div>
          {!isEditing && (
            <ControlButton
              onClick={toggleAutoRotate}
              title={config.autoRotate ? 'Pausar paneo lento' : 'Activar paneo lento'}
              icon={config.autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              highlight={config.autoRotate}
            />
          )}
          <ControlButton onClick={resetView} title="Vista inicial" icon={<RotateCcw className="w-4 h-4" />} />
          <ControlButton onClick={toggleFullscreen} title="Pantalla completa" icon={<Maximize2 className="w-4 h-4" />} />
          {isEditing && onSetStartView && (
            <ControlButton
              onClick={() => { const a = getAngles(); onSetStartView(a.yaw, a.pitch); }}
              title="Fijar vista inicial (guardar ángulo actual)"
              icon={<Crosshair className="w-4 h-4" />}
              highlight
            />
          )}
        </div>
      )}

      {/* Audio guide — auto-plays when scene has audio, resets on scene change */}
      {!isEditing && (currentScene.audioGuideUrl || currentScene.audioGuideUrls) && (
        <AudioGuide
          key={currentScene.id}
          audioUrl={currentScene.audioGuideUrl ?? Object.values(currentScene.audioGuideUrls ?? {})[0] ?? ''}
          audioUrls={currentScene.audioGuideUrls}
          sceneLabel={currentScene.name}
        />
      )}

      {/* Measurements overlay — bottom-left, above lead-capture */}
      {!isEditing && currentScene.measurements && (
        <div className="absolute bottom-16 left-4 z-20 pointer-events-none">
          <MeasurementsOverlay measurements={currentScene.measurements} />
        </div>
      )}

      {/* Top-left buttons: media gallery + POI + 3D model — shift right on desktop when nav panel is active */}
      {!isEditing && !isComparisonPanel && (onOpenMediaGallery || onOpenPOIPanel || onOpenModel3D) && (
        <div className={cn('absolute top-4 z-20 flex flex-col gap-2', tour.navPanel?.enabled ? 'left-4 md:left-[290px]' : 'left-4')}>
          {onOpenModel3D && (
            <button
              onClick={onOpenModel3D}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white/80 hover:text-white text-xs font-medium border border-white/10 backdrop-blur-sm transition-colors shadow"
              title="Ver plano 3D"
            >
              <Box className="w-3.5 h-3.5 text-cyan-300" />
              <span>Plano 3D</span>
            </button>
          )}
          {onOpenMediaGallery && (
            <MediaGalleryButton
              itemCount={tour.gallery?.length ?? 0}
              hasBrochure={!!tour.brochureUrl}
              brandColor={tour.brandColor}
              onClick={onOpenMediaGallery}
            />
          )}
          {onOpenPOIPanel && (
            <button
              onClick={onOpenPOIPanel}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white/80 hover:text-white text-xs font-medium border border-white/10 backdrop-blur-sm transition-colors shadow"
              title="Lugares cercanos"
            >
              <Map className="w-3.5 h-3.5 text-blue-300" />
              <span>Lugares</span>
            </button>
          )}
        </div>
      )}

      {/* Property location button — bottom-left, raised when the minimap is visible */}
      {!isEditing && !isComparisonPanel && tour.propertyLat != null && tour.propertyLng != null && (
        <a
          href={`https://www.google.com/maps?q=${tour.propertyLat},${tour.propertyLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'absolute left-4 z-20 flex items-center gap-2 px-3.5 py-2 text-white font-medium rounded-xl shadow-lg transition-opacity hover:opacity-90 backdrop-blur-sm border border-white/15',
            hasBottomMinimap ? 'bottom-[300px] sm:bottom-[190px]' : 'bottom-4'
          )}
          style={{ background: 'rgba(0,0,0,0.62)' }}
        >
          <MapPin className="w-4 h-4 text-blue-300" />
          <span className="text-sm">Ver ubicación</span>
        </a>
      )}

      {/* Bottom-right actions — real stack so labels and mobile wrapping never overlap */}
      {!isEditing && !isComparisonPanel && (cartItemCount > 0 || onOpenLeadCapture || onOpenBooking || onOpenSalesPanel) && (
        <div className={cn(
          'absolute right-4 z-20 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:max-w-sm',
          hasBottomMinimap ? 'bottom-[150px] sm:bottom-4' : 'bottom-4'
        )}>
          {cartItemCount > 0 && (
            <button
              onClick={toggleCart}
              className="flex max-w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-white font-medium shadow-lg transition-colors hover:bg-rose-500"
            >
              <ShoppingCart className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{cartItemCount}</span>
            </button>
          )}

          {onOpenLeadCapture && (
            <button
              onClick={onOpenLeadCapture}
              className="flex max-w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-white font-semibold leading-snug shadow-lg transition-opacity hover:opacity-90"
              style={{ background: tour.brandColor ? `${tour.brandColor}cc` : '#0f766e' }}
            >
              <Plus className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{tour.leadCaptureLabel ?? 'Solicitar información'}</span>
            </button>
          )}

          {onOpenBooking && (
            <button
              onClick={onOpenBooking}
              className="flex max-w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-white font-semibold leading-snug shadow-lg transition-opacity hover:opacity-90"
              style={{ background: tour.brandColor ? `${tour.brandColor}dd` : '#059669' }}
            >
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{tour.bookingConfig?.ctaLabel ?? 'Agendar visita'}</span>
            </button>
          )}

          {onOpenSalesPanel && (
            <button
              onClick={onOpenSalesPanel}
              className="flex max-w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-white font-semibold leading-snug shadow-lg transition-opacity hover:opacity-90"
              style={{ background: tour.brandColor ?? '#1e40af' }}
            >
              <LayoutList className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                {(tour.units?.length ?? 0) > 0
                  ? 'Ver inventario'
                  : (tour.gallery?.length ?? 0) > 0 || tour.brochureUrl
                    ? 'Ver material'
                    : tour.brandName ?? 'Explorar'}
              </span>
            </button>
          )}
        </div>
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
  highlight = false,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'w-9 h-9 flex items-center justify-center rounded-xl backdrop-blur-sm border transition-colors shadow',
        highlight
          ? 'bg-blue-600/80 hover:bg-blue-500 text-white border-blue-400/40'
          : 'bg-black/60 hover:bg-black/80 text-white border-white/10'
      )}
    >
      {icon}
    </button>
  );
}
