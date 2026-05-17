import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

const BUCKET = 'team-materials';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
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

    const adminClient = getServiceRoleClient();

    // Resolve which admin this user belongs to (same fallback chain as GET /api/materials)
    const { data: membership } = await sb
      .from('team_members')
      .select('owner_user_id')
      .eq('member_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    let resolvedAdminId = membership?.owner_user_id ?? user.id;

    if (!membership?.owner_user_id) {
      const { data: invite } = await sb
        .from('team_invites').select('admin_id')
        .eq('advisor_user_id', user.id).eq('status', 'accepted').maybeSingle();
      if (invite?.admin_id) {
        resolvedAdminId = invite.admin_id;
      } else if (user.email) {
        const { data: pending } = await adminClient
          .from('team_invites').select('admin_id')
          .eq('email', user.email.toLowerCase()).maybeSingle();
        if (pending?.admin_id) resolvedAdminId = pending.admin_id;
      }
    }

    // Use service role to fetch file_path — access verified by admin_id check below
    const { data: material, error } = await adminClient
      .from('team_materials')
      .select('file_path, file_name, admin_id')
      .eq('id', params.id)
      .single();

    if (error || !material) {
      return NextResponse.json({ error: 'Material no encontrado.' }, { status: 404 });
    }
    if (material.admin_id !== resolvedAdminId) {
      return NextResponse.json({ error: 'Sin acceso a este material.' }, { status: 403 });
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
 * Admin only — only the owner can delete their materials.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const adminClient = getServiceRoleClient();

    // Fetch to get file_path, verifying ownership via admin_id
    const { data: material } = await adminClient
      .from('team_materials')
      .select('file_path, admin_id')
      .eq('id', params.id)
      .eq('admin_id', user.id)   // ownership check
      .maybeSingle();

    if (!material) {
      return NextResponse.json({ error: 'Material no encontrado.' }, { status: 404 });
    }

    // Remove from storage first
    await adminClient.storage.from(BUCKET).remove([material.file_path]);

    // Delete DB record
    await adminClient.from('team_materials').delete().eq('id', params.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
