'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTourStore, selectCurrentScene } from '@/store/tourStore';
import { Tour } from '@/types/tour.types';
import { Loader2 } from 'lucide-react';
import { CartPanel } from '@/components/viewer/CartPanel';

// Client-only — Three.js cannot run on the server
const Viewer360 = dynamic(
  () => import('@/components/viewer/Viewer360').then((m) => m.Viewer360),
  { ssr: false }
);

interface ViewerPageProps {
  params: { tourId: string };
}

export default function ViewerPage({ params }: ViewerPageProps) {
  const { tourId } = params;

  const tour           = useTourStore((s) => s.tour);
  const currentScene   = useTourStore(selectCurrentScene);
  const viewerConfig   = useTourStore((s) => s.viewerConfig);
  const navigateTo     = useTourStore((s) => s.navigateTo);
  const isCartOpen     = useTourStore((s) => s.isCartOpen);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // In production, you'd fetch the tour by ID from your database here.
    // For now, the store already holds the tour created in the editor.
    if (tour) setIsReady(true);
  }, [tour]);

  if (!isReady || !tour || !currentScene) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-white/50">Cargando tour…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
      <Viewer360
        tour={tour}
        currentScene={currentScene}
        config={viewerConfig}
        onNavigate={(sceneId) => navigateTo(sceneId)}
      />

      {/* Shopping cart slide-in panel */}
      {isCartOpen && <CartPanel />}
    </div>
  );
}
