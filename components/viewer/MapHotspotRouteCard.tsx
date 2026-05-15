'use client';

import { useState } from 'react';
import { Hotspot, Tour } from '@/types/tour.types';
import { X, Navigation, MapPin, ExternalLink, Minimize2, Maximize2 } from 'lucide-react';

interface MapHotspotRouteCardProps {
  hotspot: Hotspot;
  tour: Tour;
  onClose: () => void;
}

const GMAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export function MapHotspotRouteCard({ hotspot, tour, onClose }: MapHotspotRouteCardProps) {
  const [minimized, setMinimized] = useState(false);
  const originLat = hotspot.mapOriginLat ?? tour.propertyLat;
  const originLng = hotspot.mapOriginLng ?? tour.propertyLng;
  const hasOrigin = originLat != null && originLng != null;
  const hasDest   = hotspot.mapLat != null && hotspot.mapLng != null;
  const travelMode = hotspot.mapTravelMode ?? 'walking';
  const destination = hasDest
    ? `${hotspot.mapLat},${hotspot.mapLng}`
    : hotspot.mapAddress ?? hotspot.label;

  const mapSrc = GMAPS_KEY
    ? hasOrigin
      ? `https://www.google.com/maps/embed/v1/directions?key=${GMAPS_KEY}&origin=${originLat},${originLng}&destination=${encodeURIComponent(destination)}&mode=${travelMode}&language=es`
      : `https://www.google.com/maps/embed/v1/place?key=${GMAPS_KEY}&q=${encodeURIComponent(destination)}&language=es`
    : null;

  const mapsHref = hasOrigin
    ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${encodeURIComponent(destination)}&travelmode=${travelMode}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

  if (minimized) {
    return (
      <div className="absolute left-4 right-4 bottom-[88px] z-40 md:left-[304px] md:right-auto md:bottom-6">
        <button
          onClick={() => setMinimized(false)}
          className="flex max-w-full items-center gap-2 rounded-2xl border border-gray-700 bg-gray-950/95 px-3 py-2 text-left shadow-2xl backdrop-blur-md transition-colors hover:bg-gray-900 md:w-[360px]"
          title="Mostrar ruta"
        >
          <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-red-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{hotspot.label}</p>
            <p className="truncate text-[10px] text-amber-300">{hotspot.mapDistance ?? 'Ruta activa'}</p>
          </div>
          <Maximize2 className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-4 right-4 bottom-[88px] z-40 overflow-hidden rounded-2xl border border-gray-700 bg-gray-950 shadow-2xl animate-slide-up md:left-[304px] md:right-auto md:bottom-6 md:w-[420px]">
      <div className="flex items-start gap-2.5 px-3 py-2.5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-red-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{hotspot.label}</p>
          {hotspot.mapOriginAddress && (
            <p className="text-[10px] text-gray-500 truncate">Desde: {hotspot.mapOriginAddress}</p>
          )}
          <p className="text-[10px] text-gray-400 truncate">{hotspot.mapAddress ?? 'Destino seleccionado'}</p>
        </div>
        {hotspot.mapDistance && (
          <span className="hidden sm:flex flex-shrink-0 items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-full">
            <Navigation className="w-2.5 h-2.5" />
            {hotspot.mapDistance}
          </span>
        )}
        <button
          onClick={() => setMinimized(true)}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors ml-1"
          aria-label="Minimizar ruta"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
          aria-label="Cerrar ruta"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {mapSrc ? (
        <div className="relative w-full h-[260px] md:h-[300px]">
          <iframe
            key={`${hotspot.id}-${originLat}-${originLng}-${destination}-${travelMode}`}
            src={mapSrc}
            title={`Ruta a ${hotspot.label}`}
            width="100%"
            height="100%"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="px-4 py-5 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Agrega <span className="font-mono text-gray-500">NEXT_PUBLIC_GOOGLE_MAPS_KEY</span> para ver la ruta dentro del tour.
          </p>
        </div>
      )}

      <a
        href={mapsHref}
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
