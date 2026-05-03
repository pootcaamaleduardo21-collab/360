'use client';

import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useTourStore, selectCurrentScene } from '@/store/tourStore';
import { getTourById, getTourBySlug } from '@/lib/db';
import { trackEvent } from '@/lib/analytics';
import { isSupabaseConfigured } from '@/lib/supabase';
import { InventoryOverlay } from '@/components/viewer/InventoryOverlay';
import { CartPanel } from '@/components/viewer/CartPanel';
import { UnitDetailModal } from '@/components/viewer/UnitDetailModal';
import { SalesPanel } from '@/components/viewer/SalesPanel';
import { PasswordGate } from '@/components/viewer/PasswordGate';
import { BookingModal } from '@/components/viewer/BookingModal';
import { LeadCaptureModal } from '@/components/viewer/LeadCaptureModal';
import { ComparisonViewer } from '@/components/viewer/ComparisonViewer';
import { MediaGallery } from '@/components/viewer/MediaGallery';
import { PropertyUnit } from '@/types/tour.types';
import { Loader2, AlertTriangle, Columns2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Viewer360 = dynamic(
  () => import('@/components/viewer/Viewer360').then((m) => m.Viewer360),
  { ssr: false }
);

interface ViewerPageProps {
  params: { tourId: string };
}

export default function ViewerPage({ params }: ViewerPageProps) {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
    }>
      <ViewerInner tourId={params.tourId} />
    </Suspense>
  );
}

function ViewerInner({ tourId }: { tourId: string }) {
  const searchParams = useSearchParams();
  const unitParam    = searchParams.get('unit');

  const tour           = useTourStore((s) => s.tour);
  const currentScene   = useTourStore(selectCurrentScene);
  const currentSceneId = useTourStore((s) => s.currentSceneId);
  const viewerConfig   = useTourStore((s) => s.viewerConfig);
  const navigateTo          = useTourStore((s) => s.navigateTo);
  const loadTour            = useTourStore((s) => s.loadTour);
  const isCartOpen          = useTourStore((s) => s.isCartOpen);
  const comparisonSceneId   = useTourStore((s) => s.comparisonSceneId);
  const setComparisonScene  = useTourStore((s) => s.setComparisonScene);

  const [isLoading,        setIsLoading]        = useState(true);
  const [notFound,         setNotFound]         = useState(false);
  const [unlocked,         setUnlocked]         = useState(false);
  const [activeUnit,       setActiveUnit]       = useState<PropertyUnit | null>(null);
  const [salesPanelOpen,   setSalesPanelOpen]   = useState(false);
  const [bookingOpen,      setBookingOpen]      = useState(false);
  const [leadCaptureOpen,  setLeadCaptureOpen]  = useState(false);
  const [comparisonMode,   setComparisonMode]   = useState(false);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);

  // ── Load tour ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (isSupabaseConfigured()) {
        try {
          const isUuid = /^[0-9a-f-]{36}$/i.test(tourId);
          const row = isUuid
            ? await getTourById(tourId)
            : await getTourBySlug(tourId);

          if (!row) {
            setNotFound(true);
          } else {
            // ── SECURITY: UUID access to unpublished tours requires ownership
            // getTourBySlug already enforces is_published=true.
            // For raw UUID access, block if draft unless the viewer IS the owner.
            if (isUuid && !row.is_published) {
              const sb = (await import('@/lib/supabase')).getSupabase();
              const { data: { user } } = await sb.auth.getUser();
              if (!user || user.id !== row.user_id) {
                setNotFound(true);
                setIsLoading(false);
                return;
              }
            }
            loadTour(row.data);
          }
        } catch {
          if (!tour || tour.id !== tourId) setNotFound(true);
        }
      } else {
        if (!tour) setNotFound(true);
      }
      setIsLoading(false);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  // ── Auto-open unit from ?unit= deep-link ─────────────────────────────────
  useEffect(() => {
    if (!unitParam || !tour?.units) return;
    const unit = tour.units.find((u) => u.id === unitParam);
    if (unit) {
      setActiveUnit(unit);
      if (unit.sceneId) navigateTo(unit.sceneId);
    }
  }, [unitParam, tour, navigateTo]);

  // ── Track scene views (fire-and-forget) ──────────────────────────────────
  useEffect(() => {
    if (!tour || !currentSceneId || !unlocked) return;
    trackEvent({ tourId: tour.id, event: 'scene_view', sceneId: currentSceneId });
  }, [currentSceneId, tour, unlocked]);

  // ── Loading / not-found states ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !tour || !currentScene) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-200 mb-2">Tour no encontrado</h1>
          <p className="text-sm text-gray-500">Este tour no existe o no está publicado.</p>
        </div>
      </div>
    );
  }

  // ── Password gate ─────────────────────────────────────────────────────────
  if (tour.passwordEnabled && tour.passwordHash && !unlocked) {
    return (
      <PasswordGate
        tourTitle={tour.title}
        logoUrl={tour.logoUrl}
        brandColor={tour.brandColor}
        passwordHash={tour.passwordHash}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  const units = tour.units ?? [];

  // Resolve comparison scene (default to 2nd scene if available)
  const comparisonScene = tour.scenes.find((s) => s.id === comparisonSceneId)
    ?? tour.scenes.find((s) => s.id !== currentSceneId)
    ?? currentScene;

  const handleToggleComparison = () => {
    if (!comparisonMode) {
      // Set default comparison scene on first open
      if (!comparisonSceneId) {
        const defaultB = tour.scenes.find((s) => s.id !== currentSceneId);
        if (defaultB) setComparisonScene(defaultB.id);
      }
    }
    setComparisonMode((v) => !v);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">

      {/* Comparison mode toggle button (top-left) */}
      {tour.scenes.length >= 2 && (
        <button
          onClick={handleToggleComparison}
          className={`absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-colors ${
            comparisonMode
              ? 'bg-blue-600 text-white'
              : 'bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/70'
          }`}
        >
          <Columns2 className="w-4 h-4" />
          {comparisonMode ? 'Salir comparación' : 'Comparar'}
        </button>
      )}

      <ErrorBoundary label="el visor 360°">
        {comparisonMode ? (
          <ComparisonViewer
            tour={tour}
            sceneA={currentScene}
            sceneB={comparisonScene}
            config={viewerConfig}
            onNavigateA={navigateTo}
            onNavigateB={(sceneId) => setComparisonScene(sceneId)}
          />
        ) : (
          <Viewer360
            tour={tour}
            currentScene={currentScene}
            config={viewerConfig}
            onNavigate={navigateTo}
            onOpenSalesPanel={units.length > 0 || tour.gallery?.length ? () => setSalesPanelOpen(true) : undefined}
            onOpenBooking={tour.bookingEnabled && tour.bookingConfig ? () => setBookingOpen(true) : undefined}
            onOpenLeadCapture={tour.leadCaptureEnabled ? () => { setLeadCaptureOpen(true); trackEvent({ tourId: tour.id, event: 'cta_click', sceneId: currentSceneId ?? undefined }); } : undefined}
            onOpenMediaGallery={(tour.gallery?.length || tour.brochureUrl) ? () => setMediaGalleryOpen(true) : undefined}
          />
        )}
      </ErrorBoundary>

      {/* Inventory overlay (Real Estate) */}
      {units.length > 0 && (
        <InventoryOverlay
          tour={tour}
          units={units}
          currentSceneId={currentSceneId ?? ''}
          onNavigate={navigateTo}
          onUnitClick={(unit) => {
            setActiveUnit(unit);
            trackEvent({ tourId: tour.id, event: 'unit_click', unitId: unit.id });
          }}
        />
      )}

      {/* Unit detail modal */}
      {activeUnit && (
        <UnitDetailModal
          unit={activeUnit}
          tour={tour}
          onClose={() => setActiveUnit(null)}
          onNavigate={(sceneId) => { navigateTo(sceneId); setActiveUnit(null); }}
        />
      )}

      {/* Sales panel */}
      {salesPanelOpen && (
        <SalesPanel
          tour={tour}
          onClose={() => setSalesPanelOpen(false)}
          onUnitClick={(unit) => {
            setActiveUnit(unit);
            setSalesPanelOpen(false);
            trackEvent({ tourId: tour.id, event: 'unit_click', unitId: unit.id });
          }}
          onNavigate={(sceneId) => { navigateTo(sceneId); setSalesPanelOpen(false); }}
        />
      )}

      {/* Booking modal */}
      {bookingOpen && tour.bookingConfig && (
        <BookingModal
          tourTitle={tour.title}
          brandColor={tour.brandColor}
          logoUrl={tour.logoUrl}
          bookingConfig={tour.bookingConfig}
          onClose={() => setBookingOpen(false)}
          onBooked={() => trackEvent({ tourId: tour.id, event: 'booking_request' })}
        />
      )}

      {/* Lead capture modal */}
      {leadCaptureOpen && (
        <LeadCaptureModal
          tourId={tour.id}
          sceneId={currentSceneId ?? undefined}
          brandColor={tour.brandColor}
          logoUrl={tour.logoUrl}
          tourTitle={tour.title}
          ctaLabel={tour.leadCaptureLabel}
          onClose={() => setLeadCaptureOpen(false)}
        />
      )}

      {/* Media gallery modal */}
      {mediaGalleryOpen && (
        <MediaGallery
          items={tour.gallery ?? []}
          brochureUrl={tour.brochureUrl}
          brochureFilename={tour.brochureFilename}
          brandColor={tour.brandColor}
          onClose={() => setMediaGalleryOpen(false)}
        />
      )}

      {/* Shopping cart panel */}
      {isCartOpen && <CartPanel />}
    </div>
  );
}
