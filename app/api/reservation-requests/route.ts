import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getServiceRoleClient } from '@/lib/teamInviteServer';
import { sendReservationRequestToAdmin, sendReservationStatusToAdvisor } from '@/lib/email';

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

    const advisorName = (user.user_metadata?.full_name as string | undefined)?.trim() || user.email || 'Asesor';
    const clientName  = String(body.clientName  ?? '').trim() || null;
    const clientPhone = String(body.clientPhone ?? '').trim() || null;
    const clientEmail = String(body.clientEmail ?? '').trim() || null;
    const notes       = String(body.notes       ?? '').trim() || null;

    const { data, error } = await sb
      .from('reservation_requests')
      .insert({
        admin_id:        tourRow.user_id,
        tour_id:         tourRow.id,
        unit_id:         unit.id,
        unit_label:      unit.label ?? null,
        prototype_id:    unit.prototypeId ?? null,
        advisor_user_id: user.id,
        client_name:     clientName,
        client_phone:    clientPhone,
        client_email:    clientEmail,
        notes,
        metadata: { source: 'advisor_panel', advisor_name: advisorName },
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify admin by email (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
    const admin  = getServiceRoleClient();
    admin.auth.admin.getUserById(tourRow.user_id).then(({ data: { user: owner } }) => {
      if (owner?.email) {
        sendReservationRequestToAdmin(
          {
            tourTitle:    tourRow.data?.title ?? 'Tour',
            unitLabel:    unit.label ?? unit.id,
            advisorName,
            clientName:   clientName ?? 'Sin nombre',
            clientPhone:  clientPhone ?? undefined,
            clientEmail:  clientEmail ?? undefined,
            notes:        notes ?? undefined,
            dashboardUrl: `${appUrl}/dashboard`,
          },
          owner.email
        );
      }
    }).catch(() => {});

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

    const internalNotes     = body.internalNotes ? String(body.internalNotes) : undefined;
    const missingDocuments  = Array.isArray(body.missingDocuments) ? body.missingDocuments : undefined;

    const { data, error } = await sb
      .from('reservation_requests')
      .update({
        status,
        internal_notes:    internalNotes,
        missing_documents: missingDocuments,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify advisor by email when status changes (fire-and-forget)
    if (data?.advisor_user_id) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
      const admin  = getServiceRoleClient();
      admin.auth.admin.getUserById(data.advisor_user_id).then(({ data: { user: advisor } }) => {
        if (advisor?.email) {
          sendReservationStatusToAdvisor(
            {
              tourTitle:        data.metadata?.tour_title ?? 'Tour',
              unitLabel:        data.unit_label ?? data.unit_id,
              status,
              clientName:       data.client_name ?? 'Cliente',
              internalNotes,
              missingDocuments,
              dashboardUrl:     `${appUrl}/dashboard`,
            },
            advisor.email
          );
        }
      }).catch(() => {});
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
