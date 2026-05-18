import { NextResponse, type NextRequest } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { resolveTeamContext, type TeamContext } from '@/lib/teamAccess';
import { hasAdminPermission } from '@/lib/teamPermissions';

const BUCKET = 'team-materials';

const CATEGORY_KEY_RE = /^[a-z0-9_]{1,48}$/;

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function canManageSalesHub(user: User, team: TeamContext) {
  return !team.isTeamMember || (team.memberRole === 'admin' && hasAdminPermission(user, 'manage_sales_hub'));
}

/**
 * GET /api/materials
 * Returns all materials visible to the current user:
 * - Owner/admin: their team's materials
 * - Advisor/limited admin: their owner's materials
 */
export async function GET() {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const team = await resolveTeamContext(sb, user);
    const adminClient = getServiceRoleClient();
    const { data, error } = await adminClient
      .from('team_materials')
      .select('id, name, description, category, file_name, file_size, file_type, created_at, admin_id')
      .eq('admin_id', team.ownerUserId)
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

    const team = await resolveTeamContext(sb, user);
    if (!canManageSalesHub(user, team)) {
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
    const filePath = `${team.ownerUserId}/${uuid}${ext}`;

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
        admin_id:    team.ownerUserId,
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
      await adminClient.storage.from(BUCKET).remove([filePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error('[POST /api/materials]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
