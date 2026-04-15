'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTourStore, selectCurrentScene } from '@/store/tourStore';
import { getTourById, getTourBySlug } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';
import { InventoryOverlay } from '@/components/viewer/InventoryOverlay';
import { CartPanel } from '@/components/viewer/CartPanel';
import { Loader2, AlertTriangle } from 'lucide-react';

const Viewer360 = dynamic(
  () => import('@/components/viewer/Viewer360').then((m) => m.Viewer360),
  { ssr: false }
);

interface ViewerPageProps {
  params: { tourId: string };
}

export default function ViewerPage({ params }: ViewerPageProps) {
  const { tourId } = params;

  const tour          = useTourStore((s) => s.tour);
  const currentScene  = useTourStore(selectCurrentScene);
  const currentSceneId = useTourStore((s) => s.currentSceneId);
  const viewerConfig  = useTourStore((s) => s.viewerConfig);
  const navigateTo    = useTourStore((s) => s.navigateTo);
  const loadTour      = useTourStore((s) => s.loadTour);
  const isCartOpen    = useTourStore((s) => s.isCartOpen);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  useEffect(() => {
    const load = async () => {
      // If Supabase is configured, fetch the tour from the DB.
      // Otherwise, fall back to whatever is already in the local store
      // (useful in local dev when working without a backend).
      if (isSupabaseConfigured()) {
        try {
          // Try by UUID first, then by slug
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
          // Network error — fall back to store if we have a matching tour
          if (!tour || tour.id !== tourId) setNotFound(true);
        }
      } else {
        // No Supabase — assume the tour is already in the local store
        if (!tour) setNotFound(true);
      }
      setIsLoading(false);
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

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
          <p className="text-sm text-gray-500">
            Este tour no existe o no está publicado.
          </p>
        </div>
      </div>
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
      />

      {/* Inventory overlay (Real Estate) */}
      {units.length > 0 && (
        <InventoryOverlay
          units={units}
          currentSceneId={currentSceneId ?? ''}
          onNavigate={navigateTo}
        />
      )}

      {/* Shopping cart panel */}
      {isCartOpen && <CartPanel />}
    </div>
  );
}
