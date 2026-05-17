import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { acceptPendingInviteForUser, getServiceRoleClient } from '@/lib/teamInviteServer';

export async function GET() {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    // Resolve which admin's content to show: team_members is authoritative,
    // team_invites is the fallback for advisors whose team_members row may not
    // have been created yet (pre-fix edge case).
    const { data: membership } = await sb
      .from('team_members')
      .select('owner_user_id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    let targetAdminId = membership?.owner_user_id ?? null;

    if (!targetAdminId) {
      // Fallback 2: team_invites by advisor_user_id (accepted)
      const { data: invite } = await sb
        .from('team_invites')
        .select('admin_id')
        .eq('advisor_user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();
      targetAdminId = invite?.admin_id ?? null;
    }

    if (!targetAdminId && user.email) {
      // Fallback 3: team_invites by email — covers advisors invited before the
      // auto-accept fix whose invite is still 'pending' with no advisor_user_id.
      // Use service role to bypass RLS. Also auto-repairs the broken state.
      const admin = getServiceRoleClient();
      const { data: pendingInvite } = await admin
        .from('team_invites')
        .select('admin_id')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();

      if (pendingInvite?.admin_id) {
        targetAdminId = pendingInvite.admin_id;
        // Auto-repair: create team_members row and mark invite accepted
        acceptPendingInviteForUser(user).catch(() => {});
      }
    }

    targetAdminId = targetAdminId ?? user.id;

    const { data, error } = await sb
      .from('team_announcements')
      .select('*')
      .eq('admin_id', targetAdminId)
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

    // Only admins (non-advisors) can post
    const { data: membership, error: membershipError } = await sb
      .from('team_members')
      .select('id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    let isTeamMember = !!membership;
    if (membershipError) {
      const { data: invite } = await sb
        .from('team_invites')
        .select('id')
        .eq('advisor_user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();
      isTeamMember = !!invite;
    }

    if (isTeamMember) return NextResponse.json({ error: 'Solo administradores pueden publicar novedades.' }, { status: 403 });

    const body = await req.json();
    const { title, message, type, pinned } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Título y mensaje son requeridos.' }, { status: 400 });
    }

    const validTypes = ['announcement', 'news', 'motivation'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('team_announcements')
      .insert({ admin_id: user.id, title: title.trim(), message: message.trim(), type, pinned: !!pinned })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
