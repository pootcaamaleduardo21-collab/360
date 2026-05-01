'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTourStore, selectCurrentScene } from '@/store/tourStore';
import { DEMO_TOUR } from '@/lib/demoTour';
import { InventoryOverlay } from '@/components/viewer/InventoryOverlay';
import { UnitDetailModal } from '@/components/viewer/UnitDetailModal';
import { SalesPanel } from '@/components/viewer/SalesPanel';
import { BookingModal } from '@/components/viewer/BookingModal';
import { PropertyUnit } from '@/types/tour.types';
import { Loader2, ArrowLeft, Sparkles, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Viewer360 = dynamic(
  () => import('@/components/viewer/Viewer360').then((m) => m.Viewer360),
  { ssr: false }
);

export default function DemoPage() {
  const loaded  = useRef(false);
  const loadTour = useTourStore((s) => s.loadTour);

  if (!loaded.current) {
    loadTour(DEMO_TOUR);
    loaded.current = true;
  }

  return <DemoInner />;
}

function DemoInner() {
  const tour           = useTourStore((s) => s.tour);
  const currentScene   = useTourStore(selectCurrentScene);
  const currentSceneId = useTourStore((s) => s.currentSceneId);
  const viewerConfig   = useTourStore((s) => s.viewerConfig);
  const navigateTo     = useTourStore((s) => s.navigateTo);

  const [activeUnit,     setActiveUnit]     = useState<PropertyUnit | null>(null);
  const [salesPanelOpen, setSalesPanelOpen] = useState(false);
  const [bookingOpen,    setBookingOpen]    = useState(false);
  const [showBanner,     setShowBanner]     = useState(true);

  const [, forceUpdate] = useState(0);
  useEffect(() => { forceUpdate(1); }, []);

  if (!tour || !currentScene) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
    );
  }

  const bannerH = showBanner ? 44 : 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">

      {/* ── Demo banner ────────────────────────────────────────────────── */}
      {showBanner && (
        <div className="absolute top-0 inset-x-0 z-40 flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-sm shadow-xl">
          {/* Back link lives inside the banner so it doesn't overlap viewer controls */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0 text-xs font-medium border border-white/20"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Inicio
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-blue-200" />
            <span className="font-medium truncate">
              Tour interactivo — navega libremente, haz clic en los hotspots y explora el inventario
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/auth/register"
              className="px-3 py-1 bg-white text-blue-700 font-bold rounded-lg text-xs hover:bg-blue-50 transition-colors whitespace-nowrap shadow"
            >
              Crear cuenta gratis
            </Link>
            <button
              onClick={() => setShowBanner(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Viewer + overlays in a shared positioned container ─────────── */}
      {/* InventoryOverlay is a sibling of Viewer360 — no pointer-event wrappers needed */}
      <div className="absolute inset-x-0 bottom-0" style={{ top: bannerH }}>
        <ErrorBoundary label="el visor 360°">
          <Viewer360
            tour={tour}
            currentScene={currentScene}
            config={{ ...viewerConfig, showTutorial: false }}
            onNavigate={navigateTo}
            onOpenSalesPanel={() => setSalesPanelOpen(true)}
            onOpenBooking={() => setBookingOpen(true)}
          />
        </ErrorBoundary>

        <InventoryOverlay
          tour={tour}
          units={tour.units ?? []}
          currentSceneId={currentSceneId ?? ''}
          onNavigate={navigateTo}
          onUnitClick={setActiveUnit}
        />
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {activeUnit && (
        <UnitDetailModal
          unit={activeUnit}
          tour={tour}
          onClose={() => setActiveUnit(null)}
          onNavigate={(id) => { navigateTo(id); setActiveUnit(null); }}
        />
      )}

      {salesPanelOpen && (
        <SalesPanel
          tour={tour}
          onClose={() => setSalesPanelOpen(false)}
          onUnitClick={(u) => { setActiveUnit(u); setSalesPanelOpen(false); }}
          onNavigate={(id) => { navigateTo(id); setSalesPanelOpen(false); }}
        />
      )}

      {bookingOpen && tour.bookingConfig && (
        <BookingModal
          tourTitle={tour.title}
          brandColor={tour.brandColor}
          logoUrl={tour.logoUrl}
          bookingConfig={tour.bookingConfig}
          onClose={() => setBookingOpen(false)}
        />
      )}

      {/* When banner is dismissed, show a compact back button floating on the viewer */}
      {!showBanner && (
        <Link
          href="/"
          className="absolute top-3 left-4 z-30 flex items-center gap-1.5 px-3 py-1.5 bg-black/65 hover:bg-black/85 backdrop-blur-sm text-white text-xs font-medium rounded-xl border border-white/10 transition-colors shadow"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
        </Link>
      )}
    </div>
  );
}
