import { NextRequest, NextResponse } from 'next/server';

const KEY = process.env.GOOGLE_MAPS_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

/**
 * GET /api/places/route?origin=lat,lng&destination=lat,lng&mode=walking|driving
 * Returns a Google Routes API summary for editor-side POI distance/time saving.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get('origin')?.trim();
  const destination = req.nextUrl.searchParams.get('destination')?.trim();
  const mode = req.nextUrl.searchParams.get('mode')?.trim() || 'walking';

  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin and destination are required.' }, { status: 400 });
  }
  if (!KEY) return NextResponse.json({ error: 'Google Maps key not configured.' }, { status: 500 });

  const originPoint = parseLatLng(origin);
  const destinationPoint = parseLatLng(destination);
  if (!originPoint || !destinationPoint) {
    return NextResponse.json({ error: 'origin and destination must be lat,lng pairs.' }, { status: 400 });
  }

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
    },
    body: JSON.stringify({
      origin: { location: { latLng: originPoint } },
      destination: { location: { latLng: destinationPoint } },
      travelMode: mode === 'driving' ? 'DRIVE' : 'WALK',
      languageCode: 'es',
      units: 'METRIC',
    }),
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message ?? 'Routes API request failed.' }, { status: 502 });
  }

  const route = data.routes?.[0];
  if (!route) {
    return NextResponse.json({ error: 'NO_ROUTE' }, { status: 502 });
  }

  const distanceMeters = route.distanceMeters ?? null;
  const durationSeconds = parseDurationSeconds(route.duration);
  const distanceText = typeof distanceMeters === 'number' ? formatDistance(distanceMeters) : '';
  const durationText = typeof durationSeconds === 'number' ? formatDuration(durationSeconds, mode) : '';

  return NextResponse.json({
    distanceText,
    durationText,
    distanceMeters,
    durationSeconds,
    summary: [durationText, distanceText].filter(Boolean).join(' · '),
  });
}

function parseLatLng(value: string) {
  const [latRaw, lngRaw] = value.split(',');
  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function parseDurationSeconds(duration?: string) {
  if (!duration) return null;
  const seconds = Number(duration.replace(/s$/, ''));
  return Number.isFinite(seconds) ? seconds : null;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number, mode: string) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const suffix = mode === 'driving' ? 'en auto' : 'caminando';
  if (minutes < 60) return `${minutes} min ${suffix}`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min ${suffix}`;
}
