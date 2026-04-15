'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Tour, PropertyUnit, PropertyStatus } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, Home, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<PropertyStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  available: {
    label: 'Disponible',
    color: 'text-green-400',
    bg:    'bg-green-500/20 border-green-500/40',
    icon:  <CheckCircle className="w-3.5 h-3.5" />,
  },
  sold: {
    label: 'Vendido',
    color: 'text-red-400',
    bg:    'bg-red-500/20 border-red-500/40',
    icon:  <XCircle className="w-3.5 h-3.5" />,
  },
  reserved: {
    label: 'Reservado',
    color: 'text-amber-400',
    bg:    'bg-amber-500/20 border-amber-500/40',
    icon:  <Clock className="w-3.5 h-3.5" />,
  },
};

interface InventoryPanelProps {
  tour: Tour;
}

export function InventoryPanel({ tour }: InventoryPanelProps) {
  const updateTour = useTourStore((s) => s.updateTour);
  const units      = tour.units ?? [];

  const [expanded, setExpanded] = useState<string | null>(null);

  const setUnits = (next: PropertyUnit[]) => updateTour({ units: next } as any);

  const addUnit = () => {
    const unit: PropertyUnit = {
      id:     uuidv4(),
      label:  `Unidad ${units.length + 1}`,
      status: 'available',
    };
    setUnits([...units, unit]);
    setExpanded(unit.id);
  };

  const updateUnit = (id: string, patch: Partial<PropertyUnit>) =>
    setUnits(units.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const removeUnit = (id: string) => {
    setUnits(units.filter((u) => u.id !== id));
    if (expanded === id) setExpanded(null);
  };

  // Summary stats
  const stats = {
    available: units.filter((u) => u.status === 'available').length,
    sold:      units.filter((u) => u.status === 'sold').length,
    reserved:  units.filter((u) => u.status === 'reserved').length,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Stats bar */}
      {units.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(stats) as [PropertyStatus, number][]).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <div
                key={status}
                className={cn('flex flex-col items-center py-2 rounded-xl border text-xs font-medium', cfg.bg, cfg.color)}
              >
                <span className="text-lg font-bold">{count}</span>
                <span className="opacity-80">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Unit list */}
      <div className="space-y-2">
        {units.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">
            Sin unidades. Agrega propiedades para gestionar su disponibilidad.
          </p>
        )}

        {units.map((unit) => {
          const cfg       = STATUS_CONFIG[unit.status];
          const isOpen    = expanded === unit.id;
          const linkedScene = tour.scenes.find((s) => s.id === unit.sceneId);

          return (
            <div key={unit.id} className="rounded-xl border border-gray-700 overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => setExpanded(isOpen ? null : unit.id)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 text-left hover:bg-gray-750 transition-colors"
              >
                <Home className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="flex-1 text-xs font-medium text-gray-200 truncate">{unit.label}</span>
                <span className={cn('flex items-center gap-1 text-xs border rounded-full px-2 py-0.5', cfg.bg, cfg.color)}>
                  {cfg.icon} {cfg.label}
                </span>
              </button>

              {/* Expanded form */}
              {isOpen && (
                <div className="px-3 py-3 bg-gray-900 space-y-3 border-t border-gray-700">
                  <Field label="Nombre / Identificador">
                    <input
                      type="text"
                      value={unit.label}
                      onChange={(e) => updateUnit(unit.id, { label: e.target.value })}
                      className="input-dark"
                      placeholder="Ej: Apto 3A, Casa 12…"
                    />
                  </Field>

                  <Field label="Estado">
                    <div className="grid grid-cols-3 gap-1.5">
                      {(Object.keys(STATUS_CONFIG) as PropertyStatus[]).map((status) => {
                        const c = STATUS_CONFIG[status];
                        return (
                          <button
                            key={status}
                            onClick={() => updateUnit(unit.id, { status })}
                            className={cn(
                              'flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs border transition-colors',
                              unit.status === status ? cn(c.bg, c.color) : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                            )}
                          >
                            {c.icon} {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Precio">
                      <input
                        type="number"
                        value={unit.price ?? ''}
                        onChange={(e) => updateUnit(unit.id, { price: e.target.value ? Number(e.target.value) : undefined })}
                        className="input-dark"
                        placeholder="0"
                        min={0}
                      />
                    </Field>
                    <Field label="Área (m²)">
                      <input
                        type="number"
                        value={unit.area ?? ''}
                        onChange={(e) => updateUnit(unit.id, { area: e.target.value ? Number(e.target.value) : undefined })}
                        className="input-dark"
                        placeholder="0"
                        min={0}
                      />
                    </Field>
                  </div>

                  <Field label="Escena vinculada">
                    <select
                      value={unit.sceneId ?? ''}
                      onChange={(e) => updateUnit(unit.id, { sceneId: e.target.value || undefined })}
                      className="input-dark"
                    >
                      <option value="">— Sin escena —</option>
                      {tour.scenes.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </Field>

                  <button
                    onClick={() => removeUnit(unit.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors pt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar unidad
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addUnit}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 text-xs font-medium transition-colors"
      >
        <Plus className="w-4 h-4" /> Agregar unidad
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}
