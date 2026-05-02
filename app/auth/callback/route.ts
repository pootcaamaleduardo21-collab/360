import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Supabase Auth callback — handles:
 * - Email confirmation links
 * - Password reset links
 * - Advisor invite acceptances (sets role + updates team_invites status)
 * - OAuth redirects (if added later)
 */

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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
      // ── Handle advisor invite acceptance ───────────────────────────────
      // If the user was invited (has invited_by metadata), mark the invite as accepted
      const invitedBy = data.user.user_metadata?.invited_by as string | undefined;
      if (invitedBy) {
        const adminClient = getServiceRoleClient();
        if (adminClient && data.user.email) {
          await adminClient
            .from('team_invites')
            .update({ status: 'accepted' })
            .eq('admin_id', invitedBy)
            .eq('email', data.user.email.toLowerCase());
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to error page or login if exchange fails
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
