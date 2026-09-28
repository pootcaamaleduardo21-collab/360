import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { getServiceRoleClient } from '@/lib/teamInviteServer';
import { resolveTeamContext } from '@/lib/teamAccess';
import { hasAdminPermission } from '@/lib/teamPermissions';

const BUCKET = 'advisor-portal-assets';
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase no está configurado para subir imágenes.' }, { status: 503 });
    }

    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const team = await resolveTeamContext(sb, user);
    const canManage = !team.isTeamMember || (
      team.memberRole === 'admin' && hasAdminPermission(user, 'manage_sales_hub')
    );
    if (!canManage) {
      return NextResponse.json({ error: 'No tienes permiso para subir imágenes.' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const slot = String(form.get('slot') ?? 'image').replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Selecciona una imagen.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Usa una imagen JPG, PNG, WebP o AVIF.' }, { status: 400 });
    }
    if (file.size > 8_388_608) {
      return NextResponse.json({ error: 'La imagen no puede superar 8 MB.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${team.ownerUserId}/${slot}-${crypto.randomUUID()}.${ext}`;
    const svc = getServiceRoleClient();
    const { error } = await svc.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data } = svc.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/toolbox/assets]', error);
    return NextResponse.json({ error: 'No se pudo subir la imagen.' }, { status: 500 });
  }
}
