import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

/**
 * GET /api/admin/stats
 *
 * Returns platform-wide stats for super_admin users only.
 *
 * Security model:
 *   1. Verify the caller has an authenticated Supabase session (anon client + cookies)
 *   2. Check that user_metadata.role === 'super_admin' OR email === SUPER_ADMIN_EMAIL
 *   3. Only then use the service-role client (which bypasses RLS) to fetch real stats
 *
 * NEVER expose the service-role key to the browser — it lives only in this route.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isSuperAdmin(user: { email?: string; user_metadata?: Record<string, unknown> }): boolean {
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? '';
  if (superAdminEmail && user.email === superAdminEmail) return true;
  return user.user_metadata?.role === 'super_admin';
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── 1. Authenticate caller ────────────────────────────────────────────────
  try {
    const cookieStore = cookies();
    const anonClient  = createSupabaseServerClient(cookieStore);
    const { data: { user }, error: authError } = await anonClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── 2. Authorization: super_admin only ──────────────────────────────────
    if (!isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── 3. Fetch stats with service-role (bypasses RLS) ─────────────────────
    const admin = getServiceRoleClient();

    // Platform tour stats
    const { data: tourRows, error: tourError } = await admin
      .from('tours')
      .select('is_published, view_count, user_id, created_at');

    if (tourError) throw tourError;

    const totalTours     = tourRows?.length ?? 0;
    const publishedTours = tourRows?.filter((t) => t.is_published).length ?? 0;
    const totalViews     = tourRows?.reduce((acc, t) => acc + (t.view_count ?? 0), 0) ?? 0;

    // All users via admin API
    const { data: { users: authUsers }, error: usersError } = await admin.auth.admin.listUsers({ perPage: 500 });
    if (usersError) throw usersError;

    const users = (authUsers ?? []).map((u) => ({
      id:         u.id,
      email:      u.email ?? '',
      full_name:  (u.user_metadata as Record<string, string>)?.full_name ?? '',
      role:       (u.user_metadata as Record<string, string>)?.role ?? 'admin',
      created_at: u.created_at,
      tour_count: tourRows?.filter((t) => t.user_id === u.id).length ?? 0,
    }));

    return NextResponse.json({
      stats: { totalTours, publishedTours, totalViews, totalUsers: users.length },
      users,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[/api/admin/stats]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
