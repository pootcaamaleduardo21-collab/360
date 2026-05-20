import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendBookingNotification } from '@/lib/email';
import type { Tour } from '@/types/tour.types';
// advisorId is the advisor's Supabase user_id (passed via ?aid= URL param)

/**
 * POST /api/bookings
 *
 * Sends a booking notification email for tours with method === 'email'.
 * (WhatsApp and Calendly methods are handled entirely client-side.)
 *
 * Body: {
 *   tourId, visitorName, visitorPhone?, visitorEmail?,
 *   preferredDate?, preferredTime?, notes?
 * }
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tourId, advisorId, visitorName, visitorPhone, visitorEmail,
      preferredDate, preferredTime, notes,
    } = body as {
      tourId: string;
      advisorId?: string;
      visitorName: string;
      visitorPhone?: string;
      visitorEmail?: string;
      preferredDate?: string;
      preferredTime?: string;
      notes?: string;
    };

    if (!tourId || !visitorName?.trim()) {
      return NextResponse.json({ error: 'tourId y visitorName son requeridos.' }, { status: 400 });
    }

    const sb = getServiceClient();

    // Fetch tour
    const { data: tourRow } = await sb
      .from('tours')
      .select('data, user_id, is_published, share_slug')
      .eq('id', tourId)
      .single();

    if (!tourRow) {
      return NextResponse.json({ error: 'Tour no encontrado.' }, { status: 404 });
    }

    const tour = tourRow.data as Tour;

    // Only send email for 'email' booking method
    const recipientEmail = tour.bookingConfig?.email;
    if (!recipientEmail) {
      return NextResponse.json({ ok: true, note: 'No email recipient configured.' });
    }

    const appUrl    = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
    const viewerUrl = tourRow.is_published && (tourRow.share_slug || tourId)
      ? `${appUrl}/viewer/${tourRow.share_slug ?? tourId}`
      : undefined;

    await sendBookingNotification(
      {
        tourTitle:     tour.title,
        brandColor:    tour.brandColor,
        visitorName:   visitorName.trim(),
        visitorPhone,
        visitorEmail,
        preferredDate,
        preferredTime,
        notes,
        viewerUrl,
      },
      recipientEmail
    );

    const bookingData = { tourTitle: tour.title, brandColor: tour.brandColor, visitorName: visitorName.trim(), visitorPhone, visitorEmail, preferredDate, preferredTime, notes, viewerUrl };

    // Also notify the tour owner if different from bookingConfig.email
    const { data: { user: owner } } = await sb.auth.admin.getUserById(tourRow.user_id);
    if (owner?.email && owner.email !== recipientEmail) {
      await sendBookingNotification(bookingData, owner.email);
    }

    // Notify the advisor whose link brought the visitor (fire-and-forget)
    if (advisorId) {
      const { data: { user: advisor } } = await sb.auth.admin.getUserById(advisorId);
      if (advisor?.email && advisor.email !== recipientEmail && advisor.email !== owner?.email) {
        sendBookingNotification(bookingData, advisor.email).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[POST /api/bookings]', err);
    return NextResponse.json({ ok: true }); // silent failure
  }
}
