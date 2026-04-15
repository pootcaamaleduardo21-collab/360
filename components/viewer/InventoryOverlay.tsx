'use client';

import { PropertyUnit, PropertyStatus } from '@/types/tour.types';
import { cn, formatCurrency } from '@/lib/utils';
import { Home, X } from 'lucide-react';
import { useState } from 'react';

const STATUS_COLORS: Record<PropertyStatus, { dot: string; badge: string; label: string }> = {
  available: { dot: 'bg-green-400',  badge: 'bg-green-500/20 border-green-500/40 text-green-300',  label: 'Disponible' },
  sold:      { dot: 'bg-red-400',    badge: 'bg-red-500/20 border-red-500/40 text-red-300',         label: 'Vendido'    },
  reserved:  { dot: 'bg-amber-400',  badge: 'bg-amber-500/20 border-amber-500/40 text-amber-300',   label: 'Reservado'  },
};

interface InventoryOverlayProps {
  units: PropertyUnit[];
  currentSceneId: string;
  onNavigate: (sceneId: string) => void;
}

export function InventoryOverlay({ units, currentSceneId, onNavigate }: InventoryOverlayProps) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [selected, setSelected] = useState<PropertyUnit | null>(null);

  if (units.length === 0) return null;

  const summary = {
    available: units.filter((u) => u.status === 'available').length,
    sold:      units.filter((u) => u.status === 'sold').length,
    reserved:  units.filter((u) => u.status === 'reserved').length,
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-xl border border-white/10 text-white text-sm font-medium transition-colors shadow"
      >
        <Home className="w-4 h-4" />
        <span>{units.length} unidades</span>
        {/* Status dots */}
        <div className="flex gap-1">
          {summary.available > 0 && <span className="w-2 h-2 rounded-full bg-green-400" />}
          {summary.reserved  > 0 && <span className="w-2 h-2 rounded-full bg-amber-400" />}
          {summary.sold      > 0 && <span className="w-2 h-2 rounded-full bg-red-400"   />}
        </div>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute top-16 left-4 z-20 w-72 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-100">Inventario</h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="text-green-400">{summary.available} disp.</span>
              <span className="text-amber-400">{summary.reserved} res.</span>
              <span className="text-red-400">{summary.sold} vend.</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Unit list */}
          <ul className="max-h-72 overflow-y-auto divide-y divide-gray-800">
            {units.map((unit) => {
              const cfg       = STATUS_COLORS[unit.status];
              const isCurrent = unit.sceneId === currentSceneId;

              return (
                <li key={unit.id}>
                  <button
                    onClick={() => {
                      setSelected(selected?.id === unit.id ? null : unit);
                      if (unit.sceneId && !isCurrent) onNavigate(unit.sceneId);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      isCurrent ? 'bg-blue-600/10' : 'hover:bg-gray-800'
                    )}
                  >
                    {/* Status dot */}
                    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', cfg.dot)} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{unit.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn('text-xs border rounded-full px-1.5 py-px', cfg.badge)}>
                          {cfg.label}
                        </span>
                        {unit.area && (
                          <span className="text-xs text-gray-500">{unit.area} m²</span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    {unit.price !== undefined && (
                      <span className="text-sm font-semibold text-gray-200 flex-shrink-0">
                        {formatCurrency(unit.price)}
                      </span>
                    )}
                  </button>

                  {/* Expanded detail */}
                  {selected?.id === unit.id && (
                    <div className="px-4 pb-3 space-y-1 bg-gray-800/50">
                      {unit.sceneId && (
                        <p className="text-xs text-blue-400">
                          {isCurrent ? '● Estás aquí' : '→ Ver escena vinculada'}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
