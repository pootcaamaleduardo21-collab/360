import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { acceptPendingInviteForUser } from '@/lib/teamInviteServer';

/**
 * Supabase Auth callback — handles:
 * - Email confirmation links
 * - Password reset links
 * - Advisor invite acceptances (sets role + updates team_invites status)
 * - OAuth redirects (if added later)
 */

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { (cookieStore as any).set(name, value, options); } catch {}
          });
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      await acceptPendingInviteForUser(data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to error page or login if exchange fails
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
