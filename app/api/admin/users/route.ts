import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isSuperAdmin(user: { email?: string; user_metadata?: Record<string, unknown> }): boolean {
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? '';
  if (superAdminEmail && user.email === superAdminEmail) return true;
  return user.user_metadata?.role === 'super_admin';
}

/** DELETE /api/admin/users?id=<userId> — super_admin only */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const anonClient  = createSupabaseServerClient(cookieStore);
    const { data: { user }, error: authError } = await anonClient.auth.getUser();

    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const targetId = new URL(request.url).searchParams.get('id');
    if (!targetId) return NextResponse.json({ error: 'Missing user id.' }, { status: 400 });

    // Prevent self-deletion
    if (targetId === user.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta.' }, { status: 400 });
    }

    const admin = getServiceRoleClient();
    const { error } = await admin.auth.admin.deleteUser(targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
