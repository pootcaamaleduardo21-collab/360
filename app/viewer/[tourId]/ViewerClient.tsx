'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useTourStore, selectCurrentScene } from '@/store/tourStore';
import { getTourById, getTourBySlug } from '@/lib/db';
import { trackEvent } from '@/lib/analytics';
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase';
import type { Tour, PropertyUnit, PointOfInterest } from '@/types/tour.types';
import { useViewerLang } from '@/hooks/useViewerLang';
import { Loader2, AlertTriangle, Columns2, Share2, MessageCircle, Copy, Check, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';

const InventoryOverlay  = dynamic(() => import('@/components/viewer/InventoryOverlay').then(m => m.InventoryOverlay),  { ssr: false });
const CartPanel         = dynamic(() => import('@/components/viewer/CartPanel').then(m => m.CartPanel),                { ssr: false });
const UnitDetailModal   = dynamic(() => import('@/components/viewer/UnitDetailModal').then(m => m.UnitDetailModal),    { ssr: false });
const SalesPanel        = dynamic(() => import('@/components/viewer/SalesPanel').then(m => m.SalesPanel),              { ssr: false });
const PasswordGate      = dynamic(() => import('@/components/viewer/PasswordGate').then(m => m.PasswordGate),          { ssr: false });
const BookingModal      = dynamic(() => import('@/components/viewer/BookingModal').then(m => m.BookingModal),           { ssr: false });
const LeadCaptureModal  = dynamic(() => import('@/components/viewer/LeadCaptureModal').then(m => m.LeadCaptureModal),  { ssr: false });
const ComparisonViewer  = dynamic(() => import('@/components/viewer/ComparisonViewer').then(m => m.ComparisonViewer),  { ssr: false });
const MediaGallery      = dynamic(() => import('@/components/viewer/MediaGallery').then(m => m.MediaGallery),          { ssr: false });
const AIAssistant       = dynamic(() => import('@/components/viewer/AIAssistant').then(m => m.AIAssistant),            { ssr: false });
const LangSwitcher      = dynamic(() => import('@/components/viewer/LangSwitcher').then(m => m.LangSwitcher),          { ssr: false });
const POIPanel          = dynamic(() => import('@/components/viewer/POIPanel').then(m => m.POIPanel),                  { ssr: false });
const POIRouteCard      = dynamic(() => import('@/components/viewer/POIRouteCard').then(m => m.POIRouteCard),          { ssr: false });

const Viewer360 = dynamic(
  () => import('@/components/viewer/Viewer360').then((m) => m.Viewer360),
  { ssr: false }
);

export function ViewerClient({ tourId, initialTour }: { tourId: string; initialTour: Tour | null }) {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
    }>
      <ViewerInner tourId={tourId} initialTour={initialTour} />
    </Suspense>
  );
}

function ViewerInner({ tourId, initialTour }: { tourId: string; initialTour: Tour | null }) {
  const searchParams = useSearchParams();
  const unitParam    = searchParams.get('unit');
  const waPhone      = searchParams.get('wa');
  const advisorParam = searchParams.get('advisor');
  const advisorTitle = searchParams.get('title');

  // If initialTour was provided by the server component, load it synchronously
  // before the first render so there's no loading flash.
  useState(() => {
    if (initialTour) {
      useTourStore.getState().loadTour(initialTour);
      // Increment view count for slug-based public access (fire-and-forget)
      const isUuid = /^[0-9a-f-]{36}$/i.test(tourId);
      if (!isUuid && isSupabaseConfigured()) {
        void getSupabase().rpc('increment_tour_views', { tour_id: initialTour.id });
      }
    }
  });

  const tour           = useTourStore((s) => s.tour);
  const currentScene   = useTourStore(selectCurrentScene);
  const currentSceneId = useTourStore((s) => s.currentSceneId);
  const viewerConfig   = useTourStore((s) => s.viewerConfig);
  const navigateTo          = useTourStore((s) => s.navigateTo);
  const loadTour            = useTourStore((s) => s.loadTour);
  const isCartOpen          = useTourStore((s) => s.isCartOpen);
  const comparisonSceneId   = useTourStore((s) => s.comparisonSceneId);
  const setComparisonScene  = useTourStore((s) => s.setComparisonScene);

  // No spinner when tour was server-side fetched
  const [isLoading,        setIsLoading]        = useState(initialTour === null);
  const [notFound,         setNotFound]         = useState(false);
  const [unlocked,         setUnlocked]         = useState(false);
  const [activeUnit,       setActiveUnit]       = useState<PropertyUnit | null>(null);
  const [salesPanelOpen,   setSalesPanelOpen]   = useState(false);
  const [bookingOpen,      setBookingOpen]      = useState(false);
  const [leadCaptureOpen,  setLeadCaptureOpen]  = useState(false);
  const [comparisonMode,   setComparisonMode]   = useState(false);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [poiPanelOpen,     setPoiPanelOpen]     = useState(false);
  const [selectedPOI,      setSelectedPOI]      = useState<PointOfInterest | null>(null);
  const [shareOpen,        setShareOpen]        = useState(false);
  const [linkCopied,       setLinkCopied]       = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const { lang, setLang, t } = useViewerLang();

  useEffect(() => {
    if (!shareOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareOpen]);

  // ── Load tour (only when server didn't provide it) ─────────────────────────
  useEffect(() => {
    if (initialTour) return; // already loaded server-side

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
            if (isUuid && !row.is_published) {
              const sb = getSupabase();
              const { data: { session } } = await sb.auth.getSession();
              const user = session?.user ?? null;
              if (!user || user.id !== row.user_id) {
                setNotFound(true);
                setIsLoading(false);
                return;
              }
            }
            if (row.data) {
              const firstImageUrl = row.data.scenes?.[0]?.imageUrl;
              if (firstImageUrl) {
                const preloadImg = new Image();
                preloadImg.src = firstImageUrl;
              }
              loadTour(row.data);
            } else {
              setNotFound(true);
            }
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

  useEffect(() => {
    if (!unitParam || !tour?.units) return;
    const unit = tour.units.find((u) => u.id === unitParam);
    if (unit) {
      setActiveUnit(unit);
      if (unit.sceneId) navigateTo(unit.sceneId);
    }
  }, [unitParam, tour, navigateTo]);

  useEffect(() => {
    if (!tour || !currentSceneId || !unlocked) return;
    trackEvent({ tourId: tour.id, event: 'scene_view', sceneId: currentSceneId });
  }, [currentSceneId, tour, unlocked]);

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

  const comparisonScene = tour.scenes.find((s) => s.id === comparisonSceneId)
    ?? tour.scenes.find((s) => s.id !== currentSceneId)
    ?? currentScene;

  const handleToggleComparison = () => {
    if (!comparisonMode) {
      if (!comparisonSceneId) {
        const defaultB = tour.scenes.find((s) => s.id !== currentSceneId);
        if (defaultB) setComparisonScene(defaultB.id);
      }
    }
    setComparisonMode((v) => !v);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">

      {tour.scenes.length >= 2 && (
        <button
          onClick={handleToggleComparison}
          className={`hidden md:flex absolute top-4 left-4 z-30 items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg transition-colors ${
            comparisonMode
              ? 'bg-blue-600 text-white'
              : 'bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/70'
          }`}
        >
          <Columns2 className="w-4 h-4" />
          {comparisonMode ? t('exitCompare') : t('compare')}
        </button>
      )}

      <LangSwitcher lang={lang} onChangeLang={setLang} className="bottom-20 left-4" />

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
            onOpenPOIPanel={(tour.pointsOfInterest?.length ?? 0) > 0 ? () => setPoiPanelOpen(true) : undefined}
          />
        )}
      </ErrorBoundary>

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

      {activeUnit && (
        <UnitDetailModal
          unit={activeUnit}
          tour={tour}
          onClose={() => setActiveUnit(null)}
          onNavigate={(sceneId) => { navigateTo(sceneId); setActiveUnit(null); }}
          onOpenBooking={tour.bookingEnabled && tour.bookingConfig ? () => { setActiveUnit(null); setBookingOpen(true); } : undefined}
        />
      )}

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

      {bookingOpen && tour.bookingConfig && (
        <BookingModal
          tourId={tour.id}
          tourTitle={tour.title}
          brandColor={tour.brandColor}
          logoUrl={tour.logoUrl}
          bookingConfig={tour.bookingConfig}
          onClose={() => setBookingOpen(false)}
          onBooked={() => trackEvent({ tourId: tour.id, event: 'booking_request' })}
        />
      )}

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

      {poiPanelOpen && (
        <POIPanel
          tour={tour}
          selectedPOIId={selectedPOI?.id ?? null}
          onSelectPOI={setSelectedPOI}
          onClose={() => { setPoiPanelOpen(false); setSelectedPOI(null); }}
        />
      )}

      {selectedPOI && (
        <POIRouteCard
          poi={selectedPOI}
          propertyLat={tour.propertyLat}
          propertyLng={tour.propertyLng}
          onClose={() => setSelectedPOI(null)}
        />
      )}

      {mediaGalleryOpen && (
        <MediaGallery
          items={tour.gallery ?? []}
          brochureUrl={tour.brochureUrl}
          brochureFilename={tour.brochureFilename}
          brandColor={tour.brandColor}
          onClose={() => setMediaGalleryOpen(false)}
        />
      )}

      {isCartOpen && <CartPanel />}

      {(tour.aiChatEnabled || tour.elevenLabsEnabled) && (
        <AIAssistant
          tourId={tour.id}
          tourTitle={tour.title}
          brandColor={tour.brandColor}
          welcomeMessage={tour.aiChatWelcome}
          textEnabled={tour.aiChatEnabled}
          voiceEnabled={tour.elevenLabsEnabled}
        />
      )}

      {(() => {
        const advisorPhone = waPhone ?? tour.salesAdvisor?.phone ?? null;
        const advisorName  = advisorParam ?? tour.salesAdvisor?.name ?? 'Asesor';
        const advisorRole  = advisorTitle ?? tour.salesAdvisor?.title ?? 'Asesor inmobiliario';

        return (
          <div ref={shareRef} className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
            <button
              onClick={() => setShareOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white/80 hover:text-white text-xs font-medium border border-white/10 transition-all shadow-lg"
              title={t('share')}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('share')}</span>
            </button>

            {shareOpen && (
              <div className="bg-gray-950/95 border border-gray-700 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden w-60 animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <span className="text-xs font-semibold text-white">{t('share')}</span>
                  <button onClick={() => setShareOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {advisorPhone && (
                  <div className="px-3 pt-3 pb-1">
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#25D366]/20 border border-[#25D366]/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#25D366]">
                        {advisorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{advisorName}</p>
                        <p className="text-[10px] text-gray-400 truncate">{advisorRole}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const url  = window.location.href;
                        const text = `Hola ${advisorName}! Vi el tour 360° de *${tour.title}* y me interesa conocer más información. 😊\n\n${url}`;
                        window.open(`https://wa.me/${advisorPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                        trackEvent({ tourId: tour.id, event: 'share_click', metadata: { channel: 'whatsapp_advisor' } });
                        setShareOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-[#25D366] text-xs font-semibold transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Escribir al asesor
                    </button>
                  </div>
                )}

                <div className="p-3 space-y-2">
                  <button
                    onClick={() => {
                      const url  = window.location.href;
                      const text = `🏠 *${tour.title}*\n\nExplora el recorrido virtual 360° aquí:\n${url}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      trackEvent({ tourId: tour.id, event: 'share_click', metadata: { channel: 'whatsapp' } });
                      setShareOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('sendWhatsapp')}
                  </button>

                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(window.location.href);
                      setLinkCopied(true);
                      trackEvent({ tourId: tour.id, event: 'share_click', metadata: { channel: 'copy_link' } });
                      setTimeout(() => { setLinkCopied(false); setShareOpen(false); }, 1800);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors',
                      linkCopied
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    )}
                  >
                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {linkCopied ? t('linkCopied') : t('copyLink')}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
