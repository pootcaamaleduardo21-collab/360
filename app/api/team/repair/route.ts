import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { acceptPendingInviteForUser, findAuthUserByEmail, getServiceRoleClient } from '@/lib/teamInviteServer';
import { isSubscriptionOwner } from '@/lib/teamPermissions';

/**
 * POST /api/team/repair
 *
 * Backfills team_members rows for any pending team_invites where the invited
 * user already has a confirmed auth account (the "already registered" edge case
 * where acceptPendingInviteForUser was never called).
 *
 * Only callable by the subscription owner / super_admin.
 */
export async function POST() {
  try {
    const cookieStore = cookies();
    const anonClient = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const callerRole = user.user_metadata?.role as string | undefined;
    if (callerRole !== 'super_admin' && !isSubscriptionOwner(user)) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const adminClient = getServiceRoleClient();

    // Find all pending invites for this admin where team_members row may be missing
    const { data: invites, error } = await adminClient
      .from('team_invites')
      .select('id, email, admin_id, role, status, advisor_user_id')
      .eq('admin_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!invites?.length) return NextResponse.json({ repaired: 0 });

    let repaired = 0;
    for (const invite of invites) {
      // Check if a team_members row already exists
      const { data: existing } = await adminClient
        .from('team_members')
        .select('id')
        .eq('owner_user_id', invite.admin_id)
        .eq('email', invite.email.toLowerCase())
        .maybeSingle();

      if (existing) continue;

      // Try to find the auth user and accept the invite
      const authUser = await findAuthUserByEmail(invite.email);
      if (!authUser) continue;

      await acceptPendingInviteForUser(authUser);
      repaired += 1;
    }

    return NextResponse.json({ repaired });
  } catch (err) {
    console.error('[POST /api/team/repair]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
