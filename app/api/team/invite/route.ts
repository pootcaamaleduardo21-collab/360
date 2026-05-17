import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { buildInviteUrl, getServiceRoleClient, revokeTeamAccess } from '@/lib/teamInviteServer';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  normalizeAdminPermissions,
  hasAdminPermission,
  isSubscriptionOwner,
} from '@/lib/teamPermissions';

/**
 * POST /api/team/invite
 *
 * Invites a user by email as an advisor or limited admin for the current owner.
 *
 * Body: { email: string, role?: 'admin' | 'advisor', permissions?: string[] }
 *
 * Security:
 *   1. Verify the caller is authenticated and can manage team members
 *   2. Use service-role client to call auth.admin.inviteUserByEmail
 *   3. Record the invitation in the team_invites table
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role = 'advisor' } = body as {
      email: string;
      role?: 'admin' | 'advisor';
      permissions?: unknown;
    };
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

    // 2. Verify caller can manage teams. Only the subscription owner/super admin
    // can create other admins and assign their permissions.
    const callerRole = user.user_metadata?.role as string | undefined;
    if (callerRole === 'advisor') {
      return NextResponse.json({ error: 'Solo administradores pueden invitar equipo.' }, { status: 403 });
    }
    if (!hasAdminPermission(user, 'manage_team')) {
      return NextResponse.json({ error: 'No tienes permiso para gestionar el equipo.' }, { status: 403 });
    }

    const callerIsOwner = callerRole === 'super_admin' || isSubscriptionOwner(user);
    if (role === 'admin' && !callerIsOwner) {
      return NextResponse.json({ error: 'Solo el dueño de la suscripción puede crear administradores.' }, { status: 403 });
    }

    const adminClient = getServiceRoleClient();
    const requestedPermissions = normalizeAdminPermissions(body.permissions);
    const assignedPermissions = role === 'admin'
      ? requestedPermissions.length
        ? requestedPermissions
        : DEFAULT_ADMIN_PERMISSIONS
      : [];

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
    const { error: insertError } = await adminClient.from('team_invites').insert({
      admin_id: user.id,
      email:    email.toLowerCase(),
      role,
      permissions: assignedPermissions,
      status:   'pending',
    });
    if (insertError) {
      const msg = insertError.message.toLowerCase();
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return NextResponse.json({ error: 'Este correo ya está ligado a otra invitación.' }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 5. Send Supabase invite email
    const requestOrigin = request.nextUrl.origin;
    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    const appUrl = requestOrigin.includes('vercel.app') && configuredAppUrl
      ? configuredAppUrl
      : requestOrigin.replace(/\/$/, '');
    const inviteUrl = buildInviteUrl(appUrl, email);
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      data: {
        role,
        invited_by: user.id,
        team_permissions: assignedPermissions,
      },
    });

    if (inviteError) {
      // If the user already exists in Auth, the invite email fails — that's OK,
      // the invite record is still created and we return a soft warning.
      if (inviteError.message.includes('already registered')) {
        return NextResponse.json({
          warning: 'El usuario ya tiene cuenta. Se registró la invitación; pídele iniciar sesión para activar el acceso.',
          inviteUrl,
        });
      }
      const msg = inviteError.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('too many')) {
        return NextResponse.json({
          warning: 'La invitación quedó guardada, pero Supabase alcanzó el límite temporal de correos. Comparte el enlace manual o intenta reenviar más tarde.',
          inviteUrl,
        });
      }
      // Roll back invite record on other errors
      await adminClient.from('team_invites').delete().eq('admin_id', user.id).eq('email', email.toLowerCase());
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inviteUrl });
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

    await revokeTeamAccess(user.id, email);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * PATCH /api/team/invite
 *
 * Updates permissions for an admin invited by the subscription owner.
 * Body: { email: string, permissions: string[] }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string; permissions?: unknown };
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const anonClient  = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const callerRole = user.user_metadata?.role as string | undefined;
    const callerIsOwner = callerRole === 'super_admin' || isSubscriptionOwner(user);
    if (!callerIsOwner) {
      return NextResponse.json({ error: 'Solo el admin principal puede modificar permisos de administradores.' }, { status: 403 });
    }
    if (!hasAdminPermission(user, 'manage_team')) {
      return NextResponse.json({ error: 'No tienes permiso para gestionar el equipo.' }, { status: 403 });
    }

    const adminClient = getServiceRoleClient();
    const targetEmail = email.toLowerCase();
    const nextPermissions = normalizeAdminPermissions(body.permissions);

    const { data: invite, error: inviteError } = await adminClient
      .from('team_invites')
      .select('id, role, advisor_user_id')
      .eq('admin_id', user.id)
      .eq('email', targetEmail)
      .maybeSingle();

    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });
    if (!invite) return NextResponse.json({ error: 'No se encontró esa invitación.' }, { status: 404 });
    if (invite.role !== 'admin') {
      return NextResponse.json({ error: 'Los permisos solo aplican a administradores.' }, { status: 400 });
    }

    const { error: inviteUpdateError } = await adminClient
      .from('team_invites')
      .update({ permissions: nextPermissions })
      .eq('id', invite.id);
    if (inviteUpdateError) return NextResponse.json({ error: inviteUpdateError.message }, { status: 500 });

    const { error: memberUpdateError } = await adminClient
      .from('team_members')
      .update({ permissions: nextPermissions })
      .eq('owner_user_id', user.id)
      .eq('email', targetEmail);
    if (memberUpdateError && memberUpdateError.code !== '42P01') {
      return NextResponse.json({ error: memberUpdateError.message }, { status: 500 });
    }

    if (invite.advisor_user_id) {
      const { data: target } = await adminClient.auth.admin.getUserById(invite.advisor_user_id);
      if (target.user) {
        await adminClient.auth.admin.updateUserById(invite.advisor_user_id, {
          user_metadata: {
            ...(target.user.user_metadata ?? {}),
            role: 'admin',
            invited_by: user.id,
            team_permissions: nextPermissions,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, permissions: nextPermissions });
  } catch (err) {
    console.error('[PATCH /api/team/invite]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
