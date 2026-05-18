import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { resolveTeamContext, type TeamContext } from '@/lib/teamAccess';
import { hasAdminPermission } from '@/lib/teamPermissions';

const VALID_COLORS = ['blue', 'cyan', 'emerald', 'lime', 'amber', 'purple', 'rose', 'gray'];

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function canManageSalesHub(user: User, team: TeamContext) {
  return !team.isTeamMember || (team.memberRole === 'admin' && hasAdminPermission(user, 'manage_sales_hub'));
}

export async function GET() {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const team = await resolveTeamContext(sb, user);
    const { data, error } = await sb
      .from('team_material_categories')
      .select('id, key, name, color, sort_order, is_system, admin_id')
      .or(`admin_id.is.null,admin_id.eq.${team.ownerUserId}`)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sb = createSupabaseServerClient(cookies());
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const team = await resolveTeamContext(sb, user);
    if (!canManageSalesHub(user, team)) {
      return NextResponse.json({ error: 'Solo administradores pueden crear categorías.' }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const key = slugify(String(body.key ?? name));
    const color = VALID_COLORS.includes(body.color) ? body.color : 'gray';

    if (!name || !key) return NextResponse.json({ error: 'Nombre requerido.' }, { status: 400 });

    const { data, error } = await sb
      .from('team_material_categories')
      .insert({
        admin_id: team.ownerUserId,
        key,
        name,
        color,
        sort_order: 100,
        is_system: false,
      })
      .select('id, key, name, color, sort_order, is_system')
      .single();

    if (error) {
      const msg = error.code === '23505' ? 'Ya existe una categoría con ese nombre.' : error.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
