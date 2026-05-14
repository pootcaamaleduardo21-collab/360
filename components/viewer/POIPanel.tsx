'use client';

import { useState, useMemo } from 'react';
import { Tour, PointOfInterest, POICategory } from '@/types/tour.types';
import { POI_CONFIG } from '@/lib/poiTypes';
import { cn } from '@/lib/utils';
import { X, MapPin, Navigation, Route } from 'lucide-react';

interface POIPanelProps {
  tour: Tour;
  selectedPOIId?: string | null;
  onSelectPOI: (poi: PointOfInterest | null) => void;
  onClose: () => void;
}

const ALL_FILTER = '__all__';

export function POIPanel({ tour, selectedPOIId, onSelectPOI, onClose }: POIPanelProps) {
  const pois = tour.pointsOfInterest ?? [];

  const presentCategories = useMemo<POICategory[]>(() => {
    const seen = new Set<POICategory>();
    pois.forEach((p) => seen.add(p.category));
    return Array.from(seen);
  }, [pois]);

  const [activeCategory, setActiveCategory] = useState<POICategory | typeof ALL_FILTER>(ALL_FILTER);

  const filtered = activeCategory === ALL_FILTER
    ? pois
    : pois.filter((p) => p.category === activeCategory);

  const handleCardClick = (poi: PointOfInterest) => {
    // Toggle: clicking the selected POI deselects it
    onSelectPOI(selectedPOIId === poi.id ? null : poi);
  };

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex items-stretch">
      {/* Panel */}
      <div className="w-80 bg-gray-900/97 backdrop-blur-md border-l border-gray-800 flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Lugares cercanos</span>
            <span className="text-xs text-gray-500 font-medium">({pois.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Route active hint */}
        {selectedPOIId && (
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600/15 border-b border-blue-500/20">
            <Route className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <p className="text-[11px] text-blue-300 font-medium">
              Ruta activa — ve el mapa en el visor
            </p>
          </div>
        )}

        {/* Category filter */}
        {presentCategories.length > 1 && (
          <div className="flex-shrink-0 px-3 py-2.5 border-b border-gray-800 flex gap-1.5 overflow-x-auto scrollbar-none">
            <CategoryPill
              label="Todos"
              active={activeCategory === ALL_FILTER}
              count={pois.length}
              onClick={() => setActiveCategory(ALL_FILTER)}
            />
            {presentCategories.map((cat) => {
              const cfg   = POI_CONFIG[cat];
              const count = pois.filter((p) => p.category === cat).length;
              return (
                <CategoryPill
                  key={cat}
                  label={cfg.emoji}
                  active={activeCategory === cat}
                  count={count}
                  color={cfg.color}
                  title={cfg.label}
                  onClick={() => setActiveCategory(cat === activeCategory ? ALL_FILTER : cat)}
                />
              );
            })}
          </div>
        )}

        {/* POI list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1 px-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="w-8 h-8 text-gray-700 mb-3" />
              <p className="text-sm text-gray-600">Sin lugares en esta categoría</p>
            </div>
          ) : (
            filtered.map((poi) => (
              <POICard
                key={poi.id}
                poi={poi}
                isSelected={selectedPOIId === poi.id}
                onClick={() => handleCardClick(poi)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-800">
          <p className="text-[10px] text-gray-600 text-center">
            Toca un lugar para ver la ruta en el visor
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Category pill ────────────────────────────────────────────────────────────

function CategoryPill({
  label, active, count, color, title, onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  color?: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap',
        active
          ? 'text-white border-transparent'
          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
      )}
      style={active && color ? { background: color, borderColor: color } : active ? { background: '#2563eb' } : undefined}
    >
      <span>{label}</span>
      <span className={cn(
        'text-[9px] font-bold px-1 rounded-full leading-none py-px',
        active ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-500'
      )}>
        {count}
      </span>
    </button>
  );
}

// ─── POI card ─────────────────────────────────────────────────────────────────

function POICard({
  poi,
  isSelected,
  onClick,
}: {
  poi: PointOfInterest;
  isSelected: boolean;
  onClick: () => void;
}) {
  const cfg = POI_CONFIG[poi.category];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-3 rounded-xl border transition-all text-left',
        isSelected
          ? 'bg-blue-600/15 border-blue-500/50 ring-1 ring-blue-500/30'
          : 'bg-gray-800/50 border-gray-700/40 hover:border-gray-600/60 hover:bg-gray-800/80'
      )}
    >
      {/* Category icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg leading-none shadow-sm"
        style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}
      >
        {cfg.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-xs font-semibold leading-snug truncate',
            isSelected ? 'text-blue-200' : 'text-gray-200'
          )}>
            {poi.label}
          </p>
          {poi.distance && (
            <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-px rounded-full whitespace-nowrap">
              <Navigation className="w-2.5 h-2.5" />
              {poi.distance}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{poi.address ?? cfg.label}</p>
        {poi.description && (
          <p className="text-[11px] text-gray-400 mt-1 leading-snug line-clamp-2">{poi.description}</p>
        )}
      </div>

      {/* Route indicator */}
      <div className={cn(
        'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors mt-0.5',
        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-700/50 text-gray-600'
      )}>
        <Route className="w-3 h-3" />
      </div>
    </button>
  );
}
