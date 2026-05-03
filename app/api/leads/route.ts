import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendLeadNotification } from '@/lib/email';
import type { Tour } from '@/types/tour.types';

/**
 * POST /api/leads
 *
 * 1. Inserts a lead into Supabase (same as submitLead in lib/leads.ts)
 * 2. Looks up the tour owner's email via service role
 * 3. Sends an email notification to the owner (and advisor if configured)
 *
 * Body: { tourId, sceneId?, name, phone?, email?, message? }
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tourId, sceneId, name, phone, email, message } = body as {
      tourId: string;
      sceneId?: string;
      name: string;
      phone?: string;
      email?: string;
      message?: string;
    };

    if (!tourId || !name?.trim()) {
      return NextResponse.json({ error: 'tourId y name son requeridos.' }, { status: 400 });
    }

    const sb = getServiceClient();

    // ── 1. Insert lead ──────────────────────────────────────────────────────
    await sb.from('leads').insert({
      tour_id:  tourId,
      scene_id: sceneId ?? null,
      name:     name.trim(),
      phone:    phone?.trim()   ?? null,
      email:    email?.trim()   ?? null,
      message:  message?.trim() ?? null,
    });

    // ── 2. Fetch tour data + owner user_id ──────────────────────────────────
    const { data: tourRow } = await sb
      .from('tours')
      .select('data, user_id, is_published, slug')
      .eq('id', tourId)
      .single();

    if (!tourRow) {
      // Lead was saved — just couldn't send email
      return NextResponse.json({ ok: true });
    }

    const tour      = tourRow.data as Tour;
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
    const viewerUrl = tourRow.is_published && (tourRow.slug || tourId)
      ? `${appUrl}/viewer/${tourRow.slug ?? tourId}`
      : undefined;

    // Resolve scene name for the email
    const sceneName = sceneId
      ? tour.scenes.find((s) => s.id === sceneId)?.name
      : undefined;

    // ── 3. Get owner email from Supabase auth ───────────────────────────────
    const { data: { user: owner } } = await sb.auth.admin.getUserById(tourRow.user_id);
    const ownerEmail = owner?.email;

    // ── 4. Send email notifications ─────────────────────────────────────────
    const leadData = { tourId, sceneId, name: name.trim(), phone, email, message, tourTitle: tour.title, sceneName, viewerUrl };

    const recipients = new Set<string>();
    if (ownerEmail) recipients.add(ownerEmail);

    // Also notify the tour's sales advisor if they have an email
    if (tour.salesAdvisor?.email) recipients.add(tour.salesAdvisor.email);

    await Promise.all(
      [...recipients].map((r) => sendLeadNotification(leadData, r))
    );

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[POST /api/leads]', err);
    // Return ok anyway — the lead UI should not break
    return NextResponse.json({ ok: true });
  }
}
