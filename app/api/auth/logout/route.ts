import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST() {
  const cookieStore = cookies();
  const response = NextResponse.json({ ok: true });

  try {
    const supabase = createSupabaseServerClient(cookieStore);
    await supabase.auth.signOut();
  } catch {
    // Even if Supabase is temporarily unavailable, clear local auth cookies.
  }

  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
      });
    }
  }

  return response;
}
