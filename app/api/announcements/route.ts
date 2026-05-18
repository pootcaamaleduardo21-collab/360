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

export async function GET() {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const team = await resolveTeamContext(sb, user);
    const svc = getServiceRoleClient();
    const { data, error } = await svc
      .from('team_announcements')
      .select('*')
      .eq('admin_id', team.ownerUserId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

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

    const team = await resolveTeamContext(sb, user);
    if (!canManageSalesHub(user, team)) {
      return NextResponse.json({ error: 'Solo administradores pueden publicar novedades.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type, pinned } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Título y mensaje son requeridos.' }, { status: 400 });
    }

    const validTypes = ['announcement', 'news', 'motivation'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
    }

    const svc = getServiceRoleClient();
    const { data, error } = await svc
      .from('team_announcements')
      .insert({ admin_id: team.ownerUserId, title: title.trim(), message: message.trim(), type, pinned: !!pinned })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
