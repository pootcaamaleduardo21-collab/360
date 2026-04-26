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
import { PropertyUnit } from '@/types/tour.types';
import { Loader2, AlertTriangle } from 'lucide-react';

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
  const navigateTo     = useTourStore((s) => s.navigateTo);
  const loadTour       = useTourStore((s) => s.loadTour);
  const isCartOpen     = useTourStore((s) => s.isCartOpen);

  const [isLoading,      setIsLoading]      = useState(true);
  const [notFound,       setNotFound]       = useState(false);
  const [unlocked,       setUnlocked]       = useState(false);
  const [activeUnit,     setActiveUnit]     = useState<PropertyUnit | null>(null);
  const [salesPanelOpen, setSalesPanelOpen] = useState(false);
  const [bookingOpen,    setBookingOpen]    = useState(false);

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

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
      <Viewer360
        tour={tour}
        currentScene={currentScene}
        config={viewerConfig}
        onNavigate={navigateTo}
        onOpenSalesPanel={units.length > 0 || tour.gallery?.length ? () => setSalesPanelOpen(true) : undefined}
        onOpenBooking={tour.bookingEnabled && tour.bookingConfig ? () => setBookingOpen(true) : undefined}
      />

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

      {/* Shopping cart panel */}
      {isCartOpen && <CartPanel />}
    </div>
  );
}
