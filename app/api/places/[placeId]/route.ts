import { NextRequest, NextResponse } from 'next/server';

const KEY = process.env.GOOGLE_MAPS_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

/**
 * GET /api/places/[placeId]?sessiontoken=<token>
 * Returns lat/lng + formatted address for a Google Place ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;
  const sessiontoken = req.nextUrl.searchParams.get('sessiontoken') ?? '';

  if (!KEY) return NextResponse.json({ error: 'Google Maps key not configured.' }, { status: 500 });

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'geometry,formatted_address,name');
  url.searchParams.set('key', KEY);
  url.searchParams.set('language', 'es');
  if (sessiontoken) url.searchParams.set('sessiontoken', sessiontoken);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== 'OK') {
    return NextResponse.json({ error: data.error_message ?? data.status }, { status: 502 });
  }

  const r = data.result;
  return NextResponse.json({
    lat:              r.geometry?.location?.lat ?? null,
    lng:              r.geometry?.location?.lng ?? null,
    formattedAddress: r.formatted_address ?? '',
    name:             r.name ?? '',
  });
}
