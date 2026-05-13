import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/leads/export?tourId=xxx
 * Returns leads for a tour as a UTF-8 CSV file.
 * Requires the caller to be authenticated as the tour owner.
 */

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function escapeCSV(val: string | null | undefined): string {
  if (val == null || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tourId = searchParams.get('tourId');
  if (!tourId) return NextResponse.json({ error: 'tourId requerido.' }, { status: 400 });

  // Verify auth via bearer token from the request cookie
  const authHeader = request.headers.get('authorization') ?? '';
  const token      = authHeader.replace('Bearer ', '').trim();
  const sb         = getServiceClient();

  // Resolve the user from the session token
  const { data: { user } } = token
    ? await sb.auth.getUser(token)
    : { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  // Verify the tour belongs to this user
  const { data: tourRow } = await sb
    .from('tours')
    .select('id, user_id')
    .eq('id', tourId)
    .single();

  if (!tourRow || tourRow.user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
  }

  // Fetch leads
  const { data: leads, error } = await sb
    .from('leads')
    .select('*')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Error al obtener leads.' }, { status: 500 });

  const rows = leads ?? [];

  const headers = ['Fecha', 'Nombre', 'Teléfono', 'Email', 'Mensaje', 'Escena', 'Fuente', 'Medio', 'Campaña', 'Contenido', 'Término'];
  const csvRows = [
    headers.join(','),
    ...rows.map((r) => [
      escapeCSV(r.created_at ? new Date(r.created_at).toLocaleString('es-MX') : ''),
      escapeCSV(r.name),
      escapeCSV(r.phone),
      escapeCSV(r.email),
      escapeCSV(r.message),
      escapeCSV(r.scene_id),
      escapeCSV(r.utm_source),
      escapeCSV(r.utm_medium),
      escapeCSV(r.utm_campaign),
      escapeCSV(r.utm_content),
      escapeCSV(r.utm_term),
    ].join(',')),
  ];

  const csv = csvRows.join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leads-${tourId.slice(0, 8)}.csv"`,
    },
  });
}
