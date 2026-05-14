import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { Loader2 } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase';
import type { Tour } from '@/types/tour.types';
import { ViewerClient } from './ViewerClient';

interface Props { params: { tourId: string } }

const TOUR_PREFETCH_TIMEOUT_MS = 2500;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export default async function ViewerPage({ params }: Props) {
  const { tourId } = params;
  let initialTour: Tour | null = null;
  let firstImageUrl: string | null = null;

  try {
    const sb = createSupabaseServerClient(cookies());
    const isUuid = /^[0-9a-f-]{36}$/i.test(tourId);

    if (!isUuid) {
      // Public slug — fetch server-side so the HTML already contains tour data
      const result = await withTimeout(
        sb
          .from('tours')
          .select('data')
          .eq('share_slug', tourId)
          .eq('is_published', true)
          .single(),
        TOUR_PREFETCH_TIMEOUT_MS
      );
      const data = result?.data;
      initialTour = (data?.data as Tour) ?? null;
    } else {
      // UUID — only pre-load if published; unpublished tours require client-side auth check
      const result = await withTimeout(
        sb
          .from('tours')
          .select('data, is_published')
          .eq('id', tourId)
          .single(),
        TOUR_PREFETCH_TIMEOUT_MS
      );
      const data = result?.data;
      if (data?.is_published) {
        initialTour = (data.data as Tour) ?? null;
      }
    }

    if (initialTour) {
      firstImageUrl = initialTour.scenes?.[0]?.imageUrl ?? null;
    }
  } catch {
    // Network error — client will fall back to its own fetch
  }

  return (
    <>
      {/* Tell the browser to start downloading the first 360° image immediately,
          in parallel with the JS bundle. On slow connections this saves 1-3 seconds. */}
      {firstImageUrl && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="preload" as="image" href={firstImageUrl} fetchPriority="high" />
      )}
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-gray-950">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        </div>
      }>
        <ViewerClient tourId={tourId} initialTour={initialTour} />
      </Suspense>
    </>
  );
}
