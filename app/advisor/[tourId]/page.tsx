import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase';
import type { Tour } from '@/types/tour.types';
import { AdvisorClient } from './AdvisorClient';

interface Props { params: { tourId: string } }

export default async function AdvisorPage({ params }: Props) {
  const { tourId } = params;
  const sb = createSupabaseServerClient(cookies());

  const { data: { session } } = await sb.auth.getSession();
  if (!session) redirect(`/login?next=/advisor/${tourId}`);

  const { data } = await sb
    .from('tours')
    .select('data, is_published, share_slug, user_id')
    .eq('id', tourId)
    .single();

  if (!data) redirect('/dashboard');

  // Unpublished tours — only the owner can access the advisor panel
  if (!data.is_published && data.user_id !== session.user.id) redirect('/dashboard');

  const tour      = data.data as Tour;
  const shareSlug = data.share_slug as string | null;

  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
    }>
      <AdvisorClient tour={tour} tourId={tourId} shareSlug={shareSlug} />
    </Suspense>
  );
}
