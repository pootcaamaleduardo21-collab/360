import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

const BUCKET = 'team-materials';

const CATEGORY_KEY_RE = /^[a-z0-9_]{1,48}$/;

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * GET /api/materials
 * Returns all materials the current user is allowed to see.
 * - Admin / super_admin: their own materials
 * - Advisor: their admin's materials (team_members is authoritative,
 *   team_invites is the fallback for advisors whose team_members row may
 *   not have been created yet — pre-fix edge case)
 */
export async function GET() {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    // Resolve the admin_id whose materials to return
    const { data: membership } = await sb
      .from('team_members')
      .select('owner_user_id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    let adminId = membership?.owner_user_id ?? null;

    if (!adminId) {
      // Fallback: check team_invites (covers advisors with accepted invites but
      // no team_members row yet)
      const { data: invite } = await sb
        .from('team_invites')
        .select('admin_id')
        .eq('advisor_user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();
      adminId = invite?.admin_id ?? user.id;
    }

    // Use service-role client so the query is not blocked by RLS when the
    // advisor's team_members row is missing
    const admin = getServiceRoleClient();
    const { data, error } = await admin
      .from('team_materials')
      .select('id, name, description, category, file_name, file_size, file_type, created_at, admin_id')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * POST /api/materials
 * Uploads a file and creates a team_materials record.
 * Admin only. FormData: { file, name, description?, category? }
 */
export async function POST(request: NextRequest) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const role = user.user_metadata?.role as string | undefined;
    if (role === 'advisor') {
      return NextResponse.json({ error: 'Solo administradores pueden subir materiales.' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file') as File | null;
    const name = (form.get('name') as string | null)?.trim();
    const description = (form.get('description') as string | null)?.trim() || null;
    const category = (form.get('category') as string | null) ?? 'general';

    if (!file || !name) {
      return NextResponse.json({ error: 'Archivo y nombre son requeridos.' }, { status: 400 });
    }
    if (!CATEGORY_KEY_RE.test(category)) {
      return NextResponse.json({ error: 'Categoría inválida.' }, { status: 400 });
    }
    if (file.size > 52_428_800) {
      return NextResponse.json({ error: 'El archivo no puede superar 50 MB.' }, { status: 400 });
    }

    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
    const uuid = crypto.randomUUID();
    const filePath = `${user.id}/${uuid}${ext}`;

    const adminClient = getServiceRoleClient();

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: record, error: dbError } = await adminClient
      .from('team_materials')
      .insert({
        admin_id:    user.id,
        name,
        description,
        category,
        file_path:   filePath,
        file_name:   file.name,
        file_size:   file.size,
        file_type:   file.type,
      })
      .select()
      .single();

    if (dbError) {
      // Roll back uploaded file on DB error
      await adminClient.storage.from(BUCKET).remove([filePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error('[POST /api/materials]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
