'use client';

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Tour, PointOfInterest, POICategory } from '@/types/tour.types';
import { POI_CONFIG } from '@/lib/poiTypes';
import { useTourStore } from '@/store/tourStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Pencil, Check, X, MapPin, Navigation } from 'lucide-react';

interface POIEditorProps {
  tour: Tour;
}

const CATEGORIES = Object.keys(POI_CONFIG) as POICategory[];

// ─── Empty form state ─────────────────────────────────────────────────────────

interface FormState {
  label: string;
  category: POICategory;
  distance: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  label: '',
  category: 'other',
  distance: '',
  description: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function POIEditor({ tour }: POIEditorProps) {
  const updateTour = useTourStore((s) => s.updateTour);

  const pois = tour.pointsOfInterest ?? [];

  const [adding,    setAdding]    = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM);

  const patch = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const savePOIs = useCallback((updated: PointOfInterest[]) => {
    updateTour({ pointsOfInterest: updated });
  }, [updateTour]);

  const handleAdd = useCallback(() => {
    if (!form.label.trim()) return;
    const newPOI: PointOfInterest = {
      id:          uuidv4(),
      label:       form.label.trim(),
      category:    form.category,
      distance:    form.distance.trim() || undefined,
      description: form.description.trim() || undefined,
    };
    savePOIs([...pois, newPOI]);
    setForm(EMPTY_FORM);
    setAdding(false);
  }, [form, pois, savePOIs]);

  const handleEdit = useCallback((poi: PointOfInterest) => {
    setEditingId(poi.id);
    setForm({
      label:       poi.label,
      category:    poi.category,
      distance:    poi.distance ?? '',
      description: poi.description ?? '',
    });
    setAdding(false);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!form.label.trim() || !editingId) return;
    savePOIs(pois.map((p) =>
      p.id === editingId
        ? {
            ...p,
            label:       form.label.trim(),
            category:    form.category,
            distance:    form.distance.trim() || undefined,
            description: form.description.trim() || undefined,
          }
        : p
    ));
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, [editingId, form, pois, savePOIs]);

  const handleDelete = useCallback((id: string) => {
    savePOIs(pois.filter((p) => p.id !== id));
    if (editingId === id) { setEditingId(null); setForm(EMPTY_FORM); }
  }, [pois, editingId, savePOIs]);

  const cancelForm = () => {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const isFormOpen = adding || editingId !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Puntos de interés ({pois.length})
        </h3>
        {!isFormOpen && (
          <button
            onClick={() => { setAdding(true); setEditingId(null); setForm(EMPTY_FORM); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir
          </button>
        )}
      </div>

      {/* Existing POI list */}
      {pois.length > 0 && (
        <ul className="space-y-1.5">
          {pois.map((poi) => {
            const cfg = POI_CONFIG[poi.category];
            const isEditing = editingId === poi.id;
            return (
              <li key={poi.id}>
                {isEditing ? (
                  <POIForm
                    form={form}
                    patch={patch}
                    onSave={handleSaveEdit}
                    onCancel={cancelForm}
                    isEdit
                  />
                ) : (
                  <div className={cn(
                    'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border bg-gray-800/50',
                    'border-gray-700/40 group'
                  )}>
                    <span className="text-base leading-none mt-0.5 flex-shrink-0">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-200 truncate">{poi.label}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{cfg.label}</p>
                      {(poi.distance || poi.description) && (
                        <div className="mt-1 flex gap-2 flex-wrap">
                          {poi.distance && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400/90">
                              <Navigation className="w-2.5 h-2.5" />{poi.distance}
                            </span>
                          )}
                          {poi.description && (
                            <span className="text-[10px] text-gray-500 truncate max-w-[160px]">{poi.description}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => handleEdit(poi)}
                        className="p-1 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-700 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(poi.id)}
                        className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Empty state */}
      {pois.length === 0 && !adding && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <MapPin className="w-8 h-8 text-gray-700" />
          <p className="text-xs text-gray-600">Sin puntos de interés</p>
          <p className="text-[10px] text-gray-700">Añade lugares cercanos al desarrollo</p>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <POIForm
          form={form}
          patch={patch}
          onSave={handleAdd}
          onCancel={cancelForm}
          isEdit={false}
        />
      )}
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function POIForm({
  form, patch, onSave, onCancel, isEdit,
}: {
  form: FormState;
  patch: (key: keyof FormState, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-gray-800/60 p-3 space-y-2.5">

      {/* Category grid */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Categoría</p>
        <div className="grid grid-cols-4 gap-1">
          {CATEGORIES.map((cat) => {
            const cfg = POI_CONFIG[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => patch('category', cat)}
                title={cfg.label}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold border transition-all',
                  form.category === cat
                    ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                    : 'border-gray-700 bg-gray-700/50 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                )}
              >
                <span className="text-sm leading-none">{cfg.emoji}</span>
                <span className="truncate w-full text-center px-0.5 leading-tight">{cfg.label.split('/')[0].trim()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Nombre *</label>
        <input
          type="text"
          value={form.label}
          onChange={(e) => patch('label', e.target.value)}
          placeholder="Ej: Centro Comercial La Isla"
          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
          autoFocus
        />
      </div>

      {/* Distance */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Distancia / Tiempo</label>
        <input
          type="text"
          value={form.distance}
          onChange={(e) => patch('distance', e.target.value)}
          placeholder="Ej: 1.2 km, 5 min en auto"
          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Descripción (opcional)</label>
        <textarea
          value={form.description}
          onChange={(e) => patch('description', e.target.value)}
          placeholder="Info adicional sobre el lugar"
          rows={2}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onSave}
          disabled={!form.label.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {isEdit ? 'Guardar' : 'Añadir lugar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
