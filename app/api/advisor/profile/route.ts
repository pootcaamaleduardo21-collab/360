import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getServiceRoleClient } from '@/lib/teamInviteServer';

export async function GET() {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    return NextResponse.json({
      full_name: user.user_metadata?.full_name ?? '',
      phone:     user.user_metadata?.advisor_phone ?? '',
      title:     user.user_metadata?.advisor_title ?? '',
    });
  } catch (err) {
    console.error('[GET /api/advisor/profile]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const body = await request.json();
    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : undefined;
    const phone     = typeof body.phone     === 'string' ? body.phone.trim()     : undefined;
    const title     = typeof body.title     === 'string' ? body.title.trim()     : undefined;

    const admin = getServiceRoleClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        ...(full_name !== undefined && { full_name }),
        ...(phone     !== undefined && { advisor_phone: phone }),
        ...(title     !== undefined && { advisor_title: title }),
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/advisor/profile]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
