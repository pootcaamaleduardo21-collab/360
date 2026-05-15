import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { acceptPendingInviteForUser } from '@/lib/teamInviteServer';

export async function POST() {
  try {
    const cookieStore = cookies();
    const sb = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await sb.auth.getUser();

    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const result = await acceptPendingInviteForUser(user);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[POST /api/auth/accept-invite]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
