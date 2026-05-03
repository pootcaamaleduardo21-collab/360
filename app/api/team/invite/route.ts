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

    // 3. Check if already invited (idempotent)
    const { data: existing } = await adminClient
      .from('team_invites')
      .select('id, status')
      .eq('admin_id', user.id)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Este correo ya fue invitado.' }, { status: 409 });
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
      // If the user already exists in Auth, the invite email fails — that's OK,
      // the invite record is still created and we return a soft warning.
      if (inviteError.message.includes('already registered')) {
        return NextResponse.json({ warning: 'El usuario ya tiene cuenta. Se registró la invitación.' });
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
    await adminClient.from('team_invites').delete()
      .eq('admin_id', user.id)
      .eq('email', email.toLowerCase());

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
