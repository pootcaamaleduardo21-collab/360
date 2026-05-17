import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getServiceRoleClient } from '@/lib/teamInviteServer';

export async function GET(req: NextRequest) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const tourId = req.nextUrl.searchParams.get('tourId');
    if (!tourId) return NextResponse.json({ error: 'tourId requerido.' }, { status: 400 });

    const svc = getServiceRoleClient();

    // Verify advisor has access to this tour via team membership
    const { data: tourRow } = await svc
      .from('tours')
      .select('id, user_id, data')
      .eq('id', tourId)
      .single();

    if (!tourRow) return NextResponse.json({ error: 'Tour no encontrado.' }, { status: 404 });

    const isOwner = tourRow.user_id === user.id;
    let hasAccess = isOwner;

    if (!hasAccess) {
      const { data: membership } = await svc
        .from('team_members')
        .select('id')
        .eq('owner_user_id', tourRow.user_id)
        .eq('member_user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      hasAccess = !!membership;
    }

    if (!hasAccess) return NextResponse.json({ error: 'Sin acceso.' }, { status: 403 });

    const units: { id: string; label: string; prototypeId?: string }[] =
      (tourRow.data?.units ?? []).map((u: { id: string; label?: string; prototypeId?: string }) => ({
        id:          u.id,
        label:       u.label ?? u.id,
        prototypeId: u.prototypeId,
      }));

    return NextResponse.json({ tourId, tourTitle: tourRow.data?.title ?? 'Tour', units });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
