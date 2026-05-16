import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

const VALID_STATUSES = ['pending', 'documents_needed', 'in_review', 'approved', 'rejected', 'cancelled'];

export async function GET() {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const { data: membership, error: membershipError } = await sb
      .from('team_members')
      .select('owner_user_id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    let isTeamMember = !!membership?.owner_user_id;
    if (membershipError) {
      const { data: advisorInvite } = await sb
        .from('team_invites')
        .select('admin_id')
        .eq('advisor_user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();
      isTeamMember = !!advisorInvite?.admin_id;
    }

    const query = sb
      .from('reservation_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (isTeamMember) {
      query.eq('advisor_user_id', user.id);
    } else {
      query.eq('admin_id', user.id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const body = await req.json();
    const tourId = String(body.tourId ?? '');
    const unitId = String(body.unitId ?? '');
    if (!tourId || !unitId) {
      return NextResponse.json({ error: 'Tour y unidad son requeridos.' }, { status: 400 });
    }

    const { data: tourRow, error: tourError } = await sb
      .from('tours')
      .select('id, user_id, data')
      .eq('id', tourId)
      .single();

    if (tourError || !tourRow) return NextResponse.json({ error: 'Tour no encontrado.' }, { status: 404 });

    const { data: membership, error: membershipError } = await sb
      .from('team_members')
      .select('owner_user_id')
      .eq('owner_user_id', tourRow.user_id)
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    let hasTeamAccess = !!membership;
    if (membershipError) {
      const { data: invite } = await sb
        .from('team_invites')
        .select('admin_id')
        .eq('admin_id', tourRow.user_id)
        .eq('advisor_user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();
      hasTeamAccess = !!invite;
    }

    if (!hasTeamAccess && tourRow.user_id !== user.id) {
      return NextResponse.json({ error: 'No tienes acceso a este tour.' }, { status: 403 });
    }

    const unit = (tourRow.data?.units ?? []).find((item: any) => item.id === unitId);
    if (!unit) return NextResponse.json({ error: 'Unidad no encontrada.' }, { status: 404 });

    const { data, error } = await sb
      .from('reservation_requests')
      .insert({
        admin_id: tourRow.user_id,
        tour_id: tourRow.id,
        unit_id: unit.id,
        unit_label: unit.label ?? null,
        prototype_id: unit.prototypeId ?? null,
        advisor_user_id: user.id,
        client_name: String(body.clientName ?? '').trim() || null,
        client_phone: String(body.clientPhone ?? '').trim() || null,
        client_email: String(body.clientEmail ?? '').trim() || null,
        notes: String(body.notes ?? '').trim() || null,
        metadata: { source: 'advisor_panel' },
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const body = await req.json();
    const id = String(body.id ?? '');
    const status = String(body.status ?? '');
    if (!id || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Solicitud o estado inválido.' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('reservation_requests')
      .update({
        status,
        internal_notes: body.internalNotes ? String(body.internalNotes) : undefined,
        missing_documents: Array.isArray(body.missingDocuments) ? body.missingDocuments : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
