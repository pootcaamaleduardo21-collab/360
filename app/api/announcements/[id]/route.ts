import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { resolveTeamContext, type TeamContext } from '@/lib/teamAccess';
import { getServiceRoleClient } from '@/lib/teamInviteServer';
import { hasAdminPermission } from '@/lib/teamPermissions';

function canManageSalesHub(user: User, team: TeamContext) {
  return !team.isTeamMember || (team.memberRole === 'admin' && hasAdminPermission(user, 'manage_sales_hub'));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const team = await resolveTeamContext(sb, user);
    if (!canManageSalesHub(user, team)) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar novedades.' }, { status: 403 });
    }

    const adminClient = getServiceRoleClient();
    const { error } = await adminClient
      .from('team_announcements')
      .delete()
      .eq('id', id)
      .eq('admin_id', team.ownerUserId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const team = await resolveTeamContext(sb, user);
    if (!canManageSalesHub(user, team)) {
      return NextResponse.json({ error: 'No tienes permiso para modificar novedades.' }, { status: 403 });
    }

    const { pinned } = await req.json();

    const adminClient = getServiceRoleClient();
    const { data, error } = await adminClient
      .from('team_announcements')
      .update({ pinned: !!pinned })
      .eq('id', id)
      .eq('admin_id', team.ownerUserId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
