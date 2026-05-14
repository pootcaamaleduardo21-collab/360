import { NextRequest, NextResponse } from 'next/server';

const KEY = process.env.GOOGLE_MAPS_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

/**
 * GET /api/places?q=<query>&sessiontoken=<token>
 * Proxies Google Places Autocomplete API — keeps the key server-side.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const sessiontoken = req.nextUrl.searchParams.get('sessiontoken') ?? '';

  if (!q || q.length < 2) return NextResponse.json([]);
  if (!KEY) return NextResponse.json({ error: 'Google Maps key not configured.' }, { status: 500 });

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', q);
  url.searchParams.set('key', KEY);
  url.searchParams.set('language', 'es');
  if (sessiontoken) url.searchParams.set('sessiontoken', sessiontoken);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return NextResponse.json({ error: data.error_message ?? data.status }, { status: 502 });
  }

  const predictions = (data.predictions ?? []).map((p: {
    place_id: string;
    description: string;
    structured_formatting: { main_text: string; secondary_text: string };
  }) => ({
    placeId:     p.place_id,
    description: p.description,
    mainText:    p.structured_formatting?.main_text ?? p.description,
    secondaryText: p.structured_formatting?.secondary_text ?? '',
  }));

  return NextResponse.json(predictions);
}
