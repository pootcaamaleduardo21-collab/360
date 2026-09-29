import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { getServiceRoleClient } from '@/lib/teamInviteServer';
import { resolveTeamContext } from '@/lib/teamAccess';
import { hasAdminPermission } from '@/lib/teamPermissions';
import { getPublicToolboxContent } from '@/lib/toolboxServer';
import { TOOLBOX_SLUG, sanitizeToolboxContent } from '@/lib/toolbox';

export async function GET() {
  const content = await getPublicToolboxContent();
  return NextResponse.json(
    { content },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase no está configurado para guardar cambios.' }, { status: 503 });
    }

    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const team = await resolveTeamContext(sb, user);
    const canManage = !team.isTeamMember || (
      team.memberRole === 'admin' && hasAdminPermission(user, 'manage_sales_hub')
    );
    if (!canManage) {
      return NextResponse.json({ error: 'No tienes permiso para editar el portal.' }, { status: 403 });
    }

    const payload = await request.json();
    const content = sanitizeToolboxContent(payload?.content);
    const svc = getServiceRoleClient();
    const { data: current } = await svc
      .from('advisor_portals')
      .select('owner_user_id')
      .eq('slug', TOOLBOX_SLUG)
      .maybeSingle();

    if (current && current.owner_user_id !== team.ownerUserId) {
      return NextResponse.json({ error: 'Este portal pertenece a otra organización.' }, { status: 403 });
    }

    const { error } = await svc.from('advisor_portals').upsert({
      slug: TOOLBOX_SLUG,
      owner_user_id: team.ownerUserId,
      content,
      published: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/toolbox');
    return NextResponse.json({ content });
  } catch (error) {
    console.error('[PATCH /api/toolbox]', error);
    return NextResponse.json({ error: 'No se pudieron guardar los cambios.' }, { status: 500 });
  }
}
