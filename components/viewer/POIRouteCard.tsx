'use client';

import { PointOfInterest } from '@/types/tour.types';
import { POI_CONFIG } from '@/lib/poiTypes';
import { X, Navigation, MapPin, ExternalLink } from 'lucide-react';

interface POIRouteCardProps {
  poi: PointOfInterest;
  propertyLat?: number;
  propertyLng?: number;
  onClose: () => void;
}

// Maps Embed API (directions mode) — free with an API key, no per-load cost.
// Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to .env.local to enable inline route maps.
const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export function POIRouteCard({ poi, propertyLat, propertyLng, onClose }: POIRouteCardProps) {
  const cfg        = POI_CONFIG[poi.category];
  const hasOrigin  = propertyLat != null && propertyLng != null;
  const hasDest    = poi.lat != null && poi.lng != null;
  const hasKey     = !!GMAPS_KEY;
  const destination = hasDest
    ? `${poi.lat},${poi.lng}`
    : poi.address ?? poi.label;

  // Directions embed URL — shows route + drive time + distance inside the iframe
  const directionsSrc = hasKey && hasOrigin
    ? `https://www.google.com/maps/embed/v1/directions?key=${GMAPS_KEY}&origin=${propertyLat},${propertyLng}&destination=${encodeURIComponent(destination)}&mode=driving&language=es`
    : hasKey
    ? `https://www.google.com/maps/embed/v1/place?key=${GMAPS_KEY}&q=${encodeURIComponent(destination)}&language=es`
    : null;

  const directionsHref = hasOrigin
    ? `https://www.google.com/maps/dir/?api=1&origin=${propertyLat},${propertyLng}&destination=${encodeURIComponent(destination)}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

  return (
    // Floating card — bottom-left of viewer, above the floor plan widget
    <div className="absolute bottom-[72px] left-4 z-40 w-80 rounded-2xl overflow-hidden shadow-2xl border border-gray-700 bg-gray-950 animate-slide-up">

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-800">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-base leading-none flex-shrink-0"
          style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}
        >
          {cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{poi.label}</p>
          <p className="text-[10px] text-gray-500 truncate">{poi.address ?? cfg.label}</p>
        </div>
        {poi.distance && (
          <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-full">
            <Navigation className="w-2.5 h-2.5" />
            {poi.distance}
          </span>
        )}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Map section */}
      {directionsSrc ? (
        // Inline Google Maps Embed — shows route, drive time, distance
        <div className="relative w-full" style={{ height: 220 }}>
          <iframe
            key={poi.id}
            src={directionsSrc}
            title={`Ruta a ${poi.label}`}
            width="100%"
            height="100%"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        // No API key — show a clear explanation + info
        <div className="px-4 py-5 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
          {poi.description ? (
            <p className="text-xs text-gray-400 leading-relaxed">{poi.description}</p>
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed">
              Agrega <span className="font-mono text-gray-500">NEXT_PUBLIC_GOOGLE_MAPS_KEY</span> en tu{' '}
              <span className="font-mono text-gray-500">.env.local</span> para ver la ruta en el mapa.
            </p>
          )}
        </div>
      )}

      <a
        href={directionsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 px-3 py-2 border-t border-gray-800 text-[11px] font-semibold text-blue-300 hover:bg-gray-900 transition-colors"
      >
        Abrir ruta completa en Google Maps
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
