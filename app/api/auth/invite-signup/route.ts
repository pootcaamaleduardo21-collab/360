import { NextResponse, type NextRequest } from 'next/server';
import { acceptPendingInviteForUser, findAuthUserByEmail, getServiceRoleClient } from '@/lib/teamInviteServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña requeridos.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
    }

    const adminClient = getServiceRoleClient();
    const { data: invite, error: inviteError } = await adminClient
      .from('team_invites')
      .select('id, admin_id, role, status')
      .eq('email', email)
      .maybeSingle();

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }
    if (!invite) {
      return NextResponse.json({ error: 'No hay invitación pendiente para este correo.' }, { status: 404 });
    }
    if (invite.status === 'accepted') {
      return NextResponse.json({ error: 'Esta invitación ya fue aceptada. Inicia sesión.' }, { status: 409 });
    }

    const role = invite.role === 'admin' ? 'admin' : 'advisor';
    const metadata = {
      full_name: fullName || undefined,
      role,
      invited_by: invite.admin_id,
    };

    const existingUser = await findAuthUserByEmail(email);
    let user = existingUser;

    if (existingUser) {
      if (existingUser.email_confirmed_at) {
        return NextResponse.json({
          error: 'Ya existe una cuenta con ese correo. Inicia sesión para activar la invitación.',
        }, { status: 409 });
      }

      const { data, error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata ?? {}),
          ...metadata,
        },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      user = data.user;
    } else {
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      user = data.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'No se pudo crear la cuenta.' }, { status: 500 });
    }

    await acceptPendingInviteForUser(user);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/invite-signup]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
