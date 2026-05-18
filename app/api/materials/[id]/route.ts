import { NextResponse, type NextRequest } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { resolveTeamContext, type TeamContext } from '@/lib/teamAccess';
import { hasAdminPermission } from '@/lib/teamPermissions';

const BUCKET = 'team-materials';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function canManageSalesHub(user: User, team: TeamContext) {
  return !team.isTeamMember || (team.memberRole === 'admin' && hasAdminPermission(user, 'manage_sales_hub'));
}

/**
 * GET /api/materials/[id]
 * Returns a short-lived signed URL (1 hour) for downloading the file.
 * Accessible by the owning admin and their accepted team members.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const team = await resolveTeamContext(sb, user);
    const adminClient = getServiceRoleClient();

    const { data: material, error } = await adminClient
      .from('team_materials')
      .select('file_path, file_name, admin_id')
      .eq('id', params.id)
      .eq('admin_id', team.ownerUserId)
      .single();

    if (error || !material) {
      return NextResponse.json({ error: 'Material no encontrado o sin acceso.' }, { status: 404 });
    }

    const { data: signed, error: signError } = await adminClient.storage
      .from(BUCKET)
      .createSignedUrl(material.file_path, 3600, {
        download: material.file_name,
      });

    if (signError || !signed) {
      return NextResponse.json({ error: 'No se pudo generar el link de descarga.' }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/materials/[id]
 * Removes the file from storage and the DB record.
 * Admin only — only users with sales hub management can delete materials.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const team = await resolveTeamContext(sb, user);
    if (!canManageSalesHub(user, team)) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar materiales.' }, { status: 403 });
    }

    const adminClient = getServiceRoleClient();

    const { data: material } = await adminClient
      .from('team_materials')
      .select('file_path, admin_id')
      .eq('id', params.id)
      .eq('admin_id', team.ownerUserId)
      .maybeSingle();

    if (!material) {
      return NextResponse.json({ error: 'Material no encontrado.' }, { status: 404 });
    }

    await adminClient.storage.from(BUCKET).remove([material.file_path]);
    await adminClient.from('team_materials').delete().eq('id', params.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
