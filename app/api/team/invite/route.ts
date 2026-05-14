import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

/**
 * POST /api/team/invite
 *
 * Invites a user by email as an advisor for the current admin.
 *
 * Body: { email: string }
 *
 * Security:
 *   1. Verify the caller is authenticated and is an admin (not advisor)
 *   2. Use service-role client to call auth.admin.inviteUserByEmail
 *   3. Record the invitation in the team_invites table
 */

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role = 'advisor' } = body as { email: string; role?: 'admin' | 'advisor' };
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido.' }, { status: 400 });
    }
    if (!['admin', 'advisor'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 });
    }

    // 1. Verify caller is authenticated
    const cookieStore = cookies();
    const anonClient  = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Verify caller is admin (not advisor)
    const callerRole = user.user_metadata?.role as string | undefined;
    if (callerRole === 'advisor') {
      return NextResponse.json({ error: 'Solo administradores pueden invitar asesores.' }, { status: 403 });
    }

    const adminClient = getServiceRoleClient();

    // 3. Check for any existing invite — from this admin OR any other.
    //    One email can only belong to one team at a time to prevent account mixing.
    const { data: existing } = await adminClient
      .from('team_invites')
      .select('id, status, admin_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      if (existing.admin_id === user.id) {
        return NextResponse.json({ error: 'Este correo ya fue invitado a tu equipo.' }, { status: 409 });
      }
      // Belongs to a different admin's team — hard block to preserve isolation
      return NextResponse.json(
        { error: 'Este correo ya pertenece al equipo de otra cuenta. No puede pertenecer a dos equipos al mismo tiempo.' },
        { status: 409 }
      );
    }

    // 4. Record the invitation first (so it's visible even if email fails)
    await adminClient.from('team_invites').insert({
      admin_id: user.id,
      email:    email.toLowerCase(),
      role,
      status:   'pending',
    });

    // 5. Send Supabase invite email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      data: {
        role,
        invited_by: user.id,
      },
    });

    if (inviteError) {
      // If the user already exists in Auth, the invite email can't be re-sent but
      // we can still update their role metadata and link them to this admin directly.
      if (inviteError.message.includes('already registered')) {
        const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingUser = usersPage?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
          // Update the user's role to what the admin requested
          await adminClient.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              ...existingUser.user_metadata,
              role,
              invited_by: user.id,
            },
          });
          // Mark the invite as accepted immediately and store advisor_user_id
          // so the RLS policy grants them access to this admin's tours right away.
          await adminClient
            .from('team_invites')
            .update({ status: 'accepted', advisor_user_id: existingUser.id })
            .eq('admin_id', user.id)
            .eq('email', email.toLowerCase());
        }

        return NextResponse.json({ warning: 'El usuario ya tenía cuenta. Su rol fue actualizado y ya tiene acceso.' });
      }
      // Roll back invite record on other errors
      await adminClient.from('team_invites').delete().eq('admin_id', user.id).eq('email', email.toLowerCase());
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/team/invite]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * DELETE /api/team/invite
 *
 * Removes an invitation.
 * Body: { email: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { email } = await request.json();

    const cookieStore = cookies();
    const anonClient  = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const adminClient = getServiceRoleClient();

    // Fetch the invite before deleting to get advisor_user_id (if accepted)
    const { data: invite } = await adminClient
      .from('team_invites')
      .select('advisor_user_id, status, role')
      .eq('admin_id', user.id)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // Delete the invite record — this is enough to revoke tour access via RLS
    await adminClient.from('team_invites').delete()
      .eq('admin_id', user.id)
      .eq('email', email.toLowerCase());

    // If the invite was accepted, also clear the invited_by metadata from the user
    // so they know their relationship with this admin is severed.
    // We do NOT remove their role — that would be too destructive (they may be on
    // another admin's team). The RLS policy already prevents tour access without
    // an accepted team_invites record.
    if (invite?.status === 'accepted' && invite.advisor_user_id) {
      const { data: userData } = await adminClient.auth.admin.getUserById(invite.advisor_user_id);
      if (userData?.user) {
        const meta = { ...userData.user.user_metadata };
        delete meta.invited_by;
        await adminClient.auth.admin.updateUserById(invite.advisor_user_id, {
          user_metadata: meta,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
