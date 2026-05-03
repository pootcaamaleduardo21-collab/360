'use client';

import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import {
  Tour, PropertyUnit, PropertyStatus,
  UnitPrototype, UnitAmenity, SalesAdvisor,
} from '@/types/tour.types';
import { getNiche } from '@/lib/niches';
import { useTourStore } from '@/store/tourStore';
import { uploadAsset } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import {
  Plus, Trash2, Home, CheckCircle, XCircle, Clock, AlertCircle,
  Building2, User, ChevronDown, ChevronUp, Upload, Loader2, X,
  FileSpreadsheet, Download, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const STATUS_ALIASES: Record<string, PropertyStatus> = {
  disponible: 'available', available: 'available', libre: 'available',
  reservado: 'reserved',   reserved: 'reserved',
  vendido: 'sold',         sold: 'sold', vendida: 'sold',
  proceso: 'in-process',   'in-process': 'in-process', 'en proceso': 'in-process',
};

function normalizeStatus(raw: string): PropertyStatus {
  return STATUS_ALIASES[raw.toLowerCase().trim()] ?? 'available';
}

function num(v: string | undefined): number | undefined {
  if (!v || v.trim() === '') return undefined;
  const n = parseFloat(v.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? undefined : n;
}

function csvToUnits(rows: Record<string, string>[]): PropertyUnit[] {
  return rows
    .filter((r) => Object.values(r).some((v) => v.trim()))
    .map((row) => {
      // Normalize keys: lowercase + remove spaces/underscores
      const r: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        r[k.toLowerCase().replace(/[\s_]+/g, '')] = v;
      }
      return {
        id:          uuidv4(),
        label:       r['label'] ?? r['nombre'] ?? r['unidad'] ?? r['unit'] ?? 'Unidad',
        status:      normalizeStatus(r['status'] ?? r['estado'] ?? ''),
        price:       num(r['price'] ?? r['precio']),
        area:        num(r['area'] ?? r['m2'] ?? r['metros']),
        bedrooms:    num(r['bedrooms'] ?? r['recamaras'] ?? r['rec']),
        bathrooms:   num(r['bathrooms'] ?? r['banos'] ?? r['baños']),
        parking:     num(r['parking'] ?? r['estacionamiento'] ?? r['auto']),
        floor:       num(r['floor'] ?? r['piso']),
        orientation: (r['orientation'] ?? r['orientacion'] ?? r['orientación'] ?? '').trim() || undefined,
        description: (r['description'] ?? r['descripcion'] ?? r['descripción'] ?? '').trim() || undefined,
      } as PropertyUnit;
    });
}

const CSV_TEMPLATE = `label,status,price,area,bedrooms,bathrooms,parking,floor,orientation,description
Apto 101,disponible,2500000,75,2,2,1,1,Norte,Vista al jardín
Apto 102,reservado,2600000,80,2,2,1,1,Sur,
Apto 103,vendido,3100000,110,3,2,2,2,Oriente,
Apto 201,disponible,2550000,75,2,2,1,2,Norte,`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'plantilla_unidades.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<PropertyStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  available:    { color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40', icon: <CheckCircle  className="w-3.5 h-3.5" /> },
  reserved:     { color: 'text-amber-400',   bg: 'bg-amber-500/20   border-amber-500/40',   icon: <Clock        className="w-3.5 h-3.5" /> },
  sold:         { color: 'text-red-400',     bg: 'bg-red-500/20     border-red-500/40',     icon: <XCircle      className="w-3.5 h-3.5" /> },
  'in-process': { color: 'text-blue-400',    bg: 'bg-blue-500/20    border-blue-500/40',    icon: <AlertCircle  className="w-3.5 h-3.5" /> },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { tour: Tour }
type SubTab = 'units' | 'prototypes' | 'advisor';

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryPanel({ tour }: Props) {
  const updateTour = useTourStore((s) => s.updateTour);
  const niche = getNiche(tour);
  const [subTab, setSubTab] = useState<SubTab>('units');

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab nav */}
      <div className="grid grid-cols-3 border-b border-gray-800 flex-shrink-0">
        {(['units', 'prototypes', 'advisor'] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={cn(
              'py-2 text-xs font-medium transition-colors',
              subTab === t
                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            {t === 'units' ? niche.unitLabelPlural : t === 'prototypes' ? niche.prototypeLabel : niche.advisorLabel.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {subTab === 'units'      && <UnitsTab      tour={tour} updateTour={updateTour} />}
        {subTab === 'prototypes' && <PrototypesTab tour={tour} updateTour={updateTour} />}
        {subTab === 'advisor'    && <AdvisorTab    tour={tour} updateTour={updateTour} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab: Unidades
// ═══════════════════════════════════════════════════════════════════════════════

function UnitsTab({ tour, updateTour }: { tour: Tour; updateTour: (p: any) => void }) {
  const niche = getNiche(tour);
  const units = tour.units ?? [];
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<PropertyUnit[] | null>(null);
  const [csvError,   setCsvError]   = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const setUnits = (next: PropertyUnit[]) => updateTour({ units: next });

  // ── CSV import ──────────────────────────────────────────────────────────────
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data.length) { setCsvError('El archivo está vacío o no tiene filas de datos.'); return; }
        try {
          setCsvPreview(csvToUnits(result.data));
        } catch {
          setCsvError('No se pudo procesar el CSV. Verifica que tenga las columnas correctas.');
        }
      },
      error: () => setCsvError('Error al leer el archivo. Asegúrate de que sea un CSV válido.'),
    });
    if (e.target) e.target.value = '';
  };

  const confirmCsvImport = (replace: boolean) => {
    if (!csvPreview) return;
    setUnits(replace ? csvPreview : [...units, ...csvPreview]);
    setCsvPreview(null);
  };

  const addUnit = () => {
    const unit: PropertyUnit = { id: uuidv4(), label: `Unidad ${units.length + 1}`, status: 'available' };
    setUnits([...units, unit]);
    setExpanded(unit.id);
  };

  const updateUnit = (id: string, patch: Partial<PropertyUnit>) =>
    setUnits(units.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const removeUnit = (id: string) => {
    setUnits(units.filter((u) => u.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const stats = {
    available:    units.filter((u) => u.status === 'available').length,
    reserved:     units.filter((u) => u.status === 'reserved').length,
    sold:         units.filter((u) => u.status === 'sold').length,
    'in-process': units.filter((u) => u.status === 'in-process').length,
  };

  return (
    <div className="p-4 space-y-4">

      {/* ── CSV Preview Modal ─────────────────────────────────────────────── */}
      {csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-white text-sm">Vista previa — {csvPreview.length} unidades</span>
              </div>
              <button onClick={() => setCsvPreview(null)} className="p-1 text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview table */}
            <div className="overflow-y-auto flex-1 p-3">
              <div className="space-y-1.5">
                {csvPreview.slice(0, 30).map((u) => {
                  const cfg = STATUS_STYLE[u.status];
                  return (
                    <div key={u.id} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-xs">
                      <span className="flex-1 text-gray-200 font-medium truncate">{u.label}</span>
                      <span className={cn('flex-shrink-0 px-1.5 py-0.5 rounded-full border text-[10px]', cfg.bg, cfg.color)}>{u.status}</span>
                      {u.price    != null && <span className="text-gray-500 flex-shrink-0">${u.price.toLocaleString()}</span>}
                      {u.area     != null && <span className="text-gray-500 flex-shrink-0">{u.area}m²</span>}
                      {u.bedrooms != null && <span className="text-gray-500 flex-shrink-0">{u.bedrooms}rec</span>}
                    </div>
                  );
                })}
                {csvPreview.length > 30 && (
                  <p className="text-center text-xs text-gray-600 py-1">…y {csvPreview.length - 30} más</p>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-800 space-y-2">
              {units.length > 0 && (
                <p className="text-xs text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  Ya tienes {units.length} unidades. ¿Reemplazar o agregar al final?
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {units.length > 0 && (
                  <button
                    onClick={() => confirmCsvImport(false)}
                    className="py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold transition-colors"
                  >
                    Agregar al final
                  </button>
                )}
                <button
                  onClick={() => confirmCsvImport(true)}
                  className={cn(
                    'py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors',
                    units.length === 0 && 'col-span-2'
                  )}
                >
                  {units.length > 0 ? 'Reemplazar todo' : `Importar ${csvPreview.length} unidades`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV error toast */}
      {csvError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{csvError}</span>
          <button onClick={() => setCsvError(null)} className="ml-auto flex-shrink-0"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* CSV import bar */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
        <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="text-xs text-gray-400 flex-1">Importa tu inventario desde Excel/CSV</span>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
          title="Descargar plantilla CSV"
        >
          <Download className="w-3.5 h-3.5" /> Plantilla
        </button>
        <button
          onClick={() => csvInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
        >
          <Upload className="w-3.5 h-3.5" /> Importar
        </button>
        <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
      </div>

      {/* Currency + listing type */}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Moneda">
          <select
            value={tour.currency ?? 'MXN'}
            onChange={(e) => updateTour({ currency: e.target.value })}
            className="input-dark text-xs"
          >
            {['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'BRL'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select
            value={tour.listingType ?? 'sale'}
            onChange={(e) => updateTour({ listingType: e.target.value as any })}
            className="input-dark text-xs"
          >
            <option value="sale">Venta</option>
            <option value="rent">Renta</option>
            <option value="mixed">Mixto</option>
          </select>
        </Field>
      </div>

      {/* Stats bar */}
      {units.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.entries(stats) as [PropertyStatus, number][]).map(([status, count]) => {
            const cfg = STATUS_STYLE[status];
            return (
              <div key={status} className={cn('flex flex-col items-center py-1.5 rounded-lg border text-xs font-medium', cfg.bg, cfg.color)}>
                <span className="text-base font-bold">{count}</span>
                <span className="text-[9px] opacity-80 leading-tight text-center">{niche.statusLabels[status].split(' ')[0]}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Units list */}
      <div className="space-y-2">
        {units.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">
            Sin unidades. Agrégalas para gestionar disponibilidad.
          </p>
        )}

        {units.map((unit) => {
          const cfg    = STATUS_STYLE[unit.status];
          const isOpen = expanded === unit.id;
          const proto  = tour.unitPrototypes?.find((p) => p.id === unit.prototypeId);

          return (
            <div key={unit.id} className="rounded-xl border border-gray-700 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : unit.id)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 text-left hover:bg-gray-750 transition-colors"
              >
                <Home className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="flex-1 text-xs font-medium text-gray-200 truncate">{unit.label}</span>
                <span className={cn('flex items-center gap-1 text-xs border rounded-full px-1.5 py-0.5 flex-shrink-0', cfg.bg, cfg.color)}>
                  {cfg.icon}
                </span>
                {isOpen ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />}
              </button>

              {isOpen && (
                <div className="px-3 py-3 bg-gray-900 space-y-3 border-t border-gray-700">

                  <Field label="Nombre / Identificador">
                    <input type="text" value={unit.label} onChange={(e) => updateUnit(unit.id, { label: e.target.value })} className="input-dark" placeholder="Ej: Apto 3A, Casa 12…" />
                  </Field>

                  {/* Status selector */}
                  <Field label="Estado">
                    <div className="grid grid-cols-2 gap-1">
                      {(Object.keys(STATUS_STYLE) as PropertyStatus[]).map((status) => {
                        const c = STATUS_STYLE[status];
                        return (
                          <button key={status} onClick={() => updateUnit(unit.id, { status })}
                            className={cn('flex items-center gap-1 py-1.5 px-2 rounded-lg text-xs border transition-colors justify-center',
                              unit.status === status ? cn(c.bg, c.color) : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                            )}>
                            {c.icon} {niche.statusLabels[status]}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  {/* Prototype link */}
                  {(tour.unitPrototypes?.length ?? 0) > 0 && (
                    <Field label="Prototipo (hereda datos)">
                      <select value={unit.prototypeId ?? ''} onChange={(e) => updateUnit(unit.id, { prototypeId: e.target.value || undefined })} className="input-dark">
                        <option value="">— Sin prototipo —</option>
                        {tour.unitPrototypes!.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </Field>
                  )}

                  {/* Price */}
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={`Precio (${tour.currency ?? 'MXN'})`}>
                      <input type="number" value={unit.price ?? ''} onChange={(e) => updateUnit(unit.id, { price: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" placeholder="0" min={0} />
                    </Field>
                    <Field label="Área (m²)">
                      <input type="number" value={unit.area ?? proto?.area ?? ''} onChange={(e) => updateUnit(unit.id, { area: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" placeholder={proto?.area ? String(proto.area) : '0'} min={0} />
                    </Field>
                  </div>

                  {/* Rooms */}
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Rec">
                      <input type="number" value={unit.bedrooms ?? ''} onChange={(e) => updateUnit(unit.id, { bedrooms: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" placeholder={proto?.bedrooms != null ? String(proto.bedrooms) : '—'} min={0} />
                    </Field>
                    <Field label="Baños">
                      <input type="number" value={unit.bathrooms ?? ''} onChange={(e) => updateUnit(unit.id, { bathrooms: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" placeholder={proto?.bathrooms != null ? String(proto.bathrooms) : '—'} min={0} />
                    </Field>
                    <Field label="Auto">
                      <input type="number" value={unit.parking ?? ''} onChange={(e) => updateUnit(unit.id, { parking: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" placeholder={proto?.parking != null ? String(proto.parking) : '—'} min={0} />
                    </Field>
                  </div>

                  {/* Floor + orientation */}
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Piso">
                      <input type="number" value={unit.floor ?? ''} onChange={(e) => updateUnit(unit.id, { floor: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" placeholder="1" min={0} />
                    </Field>
                    <Field label="Orientación">
                      <input type="text" value={unit.orientation ?? ''} onChange={(e) => updateUnit(unit.id, { orientation: e.target.value || undefined })} className="input-dark" placeholder="Norte" />
                    </Field>
                  </div>

                  {/* Description */}
                  <Field label="Descripción (opcional)">
                    <textarea value={unit.description ?? ''} onChange={(e) => updateUnit(unit.id, { description: e.target.value || undefined })} className="input-dark resize-none h-16 text-xs" placeholder={proto?.description ?? 'Descripción de la unidad…'} />
                  </Field>

                  {/* Scene link */}
                  <Field label="Escena vinculada (tour interior)">
                    <select value={unit.sceneId ?? ''} onChange={(e) => updateUnit(unit.id, { sceneId: e.target.value || undefined })} className="input-dark">
                      <option value="">— Sin escena —</option>
                      {tour.scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>

                  <button onClick={() => removeUnit(unit.id)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors pt-1">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar unidad
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={addUnit} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">
        <Plus className="w-4 h-4" /> Agregar unidad
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab: Prototipos
// ═══════════════════════════════════════════════════════════════════════════════

function PrototypesTab({ tour, updateTour }: { tour: Tour; updateTour: (p: any) => void }) {
  const prototypes = tour.unitPrototypes ?? [];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newAmenityIcon, setNewAmenityIcon]   = useState('');
  const [newAmenityLabel, setNewAmenityLabel] = useState('');
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null); // protoId being uploaded

  const setProtos = (next: UnitPrototype[]) => updateTour({ unitPrototypes: next });

  const addProto = () => {
    const p: UnitPrototype = { id: uuidv4(), name: `Prototipo ${prototypes.length + 1}` };
    setProtos([...prototypes, p]);
    setExpanded(p.id);
  };

  const updateProto = (id: string, patch: Partial<UnitPrototype>) =>
    setProtos(prototypes.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const removeProto = (id: string) => {
    setProtos(prototypes.filter((p) => p.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const addAmenity = (protoId: string) => {
    if (!newAmenityLabel.trim()) return;
    const amenity: UnitAmenity = { id: uuidv4(), label: newAmenityLabel.trim(), icon: newAmenityIcon || undefined };
    const proto = prototypes.find((p) => p.id === protoId);
    updateProto(protoId, { amenities: [...(proto?.amenities ?? []), amenity] });
    setNewAmenityLabel('');
    setNewAmenityIcon('');
  };

  const removeAmenity = (protoId: string, amenityId: string) => {
    const proto = prototypes.find((p) => p.id === protoId);
    updateProto(protoId, { amenities: (proto?.amenities ?? []).filter((a) => a.id !== amenityId) });
  };

  const handleFloorPlanUpload = async (e: React.ChangeEvent<HTMLInputElement>, protoId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(protoId);
    try {
      const result = await uploadAsset(tour.id, file);
      updateProto(protoId, { floorPlanUrl: result.url });
    } finally {
      setUploading(null);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-gray-600">
        Define plantillas reutilizables. Las unidades pueden heredar sus características.
      </p>

      {prototypes.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-2">Sin prototipos.</p>
      )}

      {prototypes.map((proto) => {
        const isOpen = expanded === proto.id;
        const linkedCount = (tour.units ?? []).filter((u) => u.prototypeId === proto.id).length;

        return (
          <div key={proto.id} className="rounded-xl border border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : proto.id)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 text-left hover:bg-gray-750 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="flex-1 text-xs font-medium text-gray-200 truncate">{proto.name}</span>
              {linkedCount > 0 && (
                <span className="text-[10px] text-gray-500 flex-shrink-0">{linkedCount} ud.</span>
              )}
              {isOpen ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />}
            </button>

            {isOpen && (
              <div className="px-3 py-3 bg-gray-900 space-y-3 border-t border-gray-700">

                <Field label="Nombre del prototipo">
                  <input type="text" value={proto.name} onChange={(e) => updateProto(proto.id, { name: e.target.value })} className="input-dark" placeholder="Tipo A — 2 Rec" />
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Área (m²)">
                    <input type="number" value={proto.area ?? ''} onChange={(e) => updateProto(proto.id, { area: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" placeholder="0" min={0} />
                  </Field>
                  <Field label="Precio desde">
                    <input type="number" value={proto.priceFrom ?? ''} onChange={(e) => updateProto(proto.id, { priceFrom: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" placeholder="0" min={0} />
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Field label="Rec">
                    <input type="number" value={proto.bedrooms ?? ''} onChange={(e) => updateProto(proto.id, { bedrooms: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" min={0} />
                  </Field>
                  <Field label="Baños">
                    <input type="number" value={proto.bathrooms ?? ''} onChange={(e) => updateProto(proto.id, { bathrooms: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" min={0} />
                  </Field>
                  <Field label="Auto">
                    <input type="number" value={proto.parking ?? ''} onChange={(e) => updateProto(proto.id, { parking: e.target.value ? Number(e.target.value) : undefined })} className="input-dark" min={0} />
                  </Field>
                </div>

                <Field label="Descripción">
                  <textarea value={proto.description ?? ''} onChange={(e) => updateProto(proto.id, { description: e.target.value || undefined })} className="input-dark resize-none h-14 text-xs" placeholder="Descripción del prototipo…" />
                </Field>

                {/* Floor plan upload */}
                <Field label="Plano del prototipo">
                  {proto.floorPlanUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proto.floorPlanUrl} alt="Plano" className="w-full h-28 object-contain rounded-lg border border-gray-700 bg-gray-800" />
                      <button
                        onClick={() => updateProto(proto.id, { floorPlanUrl: undefined })}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600/80 hover:bg-red-600 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { floorPlanInputRef.current?.setAttribute('data-proto', proto.id); floorPlanInputRef.current?.click(); }}
                      disabled={uploading === proto.id}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 text-xs transition-colors"
                    >
                      {uploading === proto.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Subir plano
                    </button>
                  )}
                </Field>

                {/* Amenities */}
                <Field label="Equipamiento incluido">
                  <div className="space-y-2">
                    {/* Existing amenities */}
                    <div className="flex flex-wrap gap-1.5">
                      {(proto.amenities ?? []).map((a) => (
                        <span key={a.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-gray-700 rounded-full text-xs text-gray-200">
                          {a.icon && <span>{a.icon}</span>}
                          {a.label}
                          <button onClick={() => removeAmenity(proto.id, a.id)} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-600 text-gray-400 hover:text-white transition-colors">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                    {/* Add amenity row */}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newAmenityIcon}
                        onChange={(e) => setNewAmenityIcon(e.target.value)}
                        className="input-dark w-10 text-center text-sm"
                        placeholder="🏊"
                        maxLength={2}
                      />
                      <input
                        type="text"
                        value={newAmenityLabel}
                        onChange={(e) => setNewAmenityLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addAmenity(proto.id)}
                        className="input-dark flex-1 text-xs"
                        placeholder="Cocina integral, Alberca…"
                      />
                      <button
                        onClick={() => addAmenity(proto.id)}
                        className="px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Field>

                <button onClick={() => removeProto(proto.id)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar prototipo
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button onClick={addProto} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 text-xs font-medium transition-colors">
        <Plus className="w-4 h-4" /> Agregar prototipo
      </button>

      {/* Hidden file input for floor plan uploads */}
      <input
        ref={floorPlanInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const protoId = floorPlanInputRef.current?.getAttribute('data-proto');
          if (protoId) handleFloorPlanUpload(e, protoId);
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab: Asesor
// ═══════════════════════════════════════════════════════════════════════════════

function AdvisorTab({ tour, updateTour }: { tour: Tour; updateTour: (p: any) => void }) {
  const advisor = tour.salesAdvisor ?? {} as SalesAdvisor;

  const update = (patch: Partial<SalesAdvisor>) =>
    updateTour({ salesAdvisor: { ...advisor, ...patch } });

  const hasAdvisor = !!(advisor.name && advisor.phone);

  const previewWaLink = hasAdvisor
    ? `https://wa.me/${advisor.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${advisor.name}, quiero información sobre un tour virtual 360°`)}`
    : null;

  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-gray-600">
        El asesor aparece en la tarjeta de cada unidad con botón directo a WhatsApp.
      </p>

      <Field label="Nombre completo">
        <input type="text" value={advisor.name ?? ''} onChange={(e) => update({ name: e.target.value })} className="input-dark" placeholder="Ana García" />
      </Field>

      <Field label="Teléfono WhatsApp">
        <input type="tel" value={advisor.phone ?? ''} onChange={(e) => update({ phone: e.target.value })} className="input-dark" placeholder="+52 55 1234 5678" />
      </Field>

      <Field label="Título">
        <input type="text" value={advisor.title ?? ''} onChange={(e) => update({ title: e.target.value || undefined })} className="input-dark" placeholder="Asesor Inmobiliario" />
      </Field>

      <Field label="Empresa / Inmobiliaria">
        <input type="text" value={advisor.company ?? ''} onChange={(e) => update({ company: e.target.value || undefined })} className="input-dark" placeholder="Inmobiliaria XYZ" />
      </Field>

      <Field label="Email">
        <input type="email" value={advisor.email ?? ''} onChange={(e) => update({ email: e.target.value || undefined })} className="input-dark" placeholder="ana@inmobiliaria.com" />
      </Field>

      <Field label="Foto (URL)">
        <input type="url" value={advisor.photoUrl ?? ''} onChange={(e) => update({ photoUrl: e.target.value || undefined })} className="input-dark" placeholder="https://…" />
      </Field>

      {/* Preview card */}
      {hasAdvisor && (
        <div className="rounded-xl border border-gray-700 overflow-hidden">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider px-3 pt-2 pb-1">Vista previa</p>
          <div className="flex items-center gap-3 px-3 pb-3">
            {advisor.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={advisor.photoUrl} alt={advisor.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {advisor.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{advisor.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{advisor.title ?? advisor.company}</p>
            </div>
            {previewWaLink && (
              <a href={previewWaLink} target="_blank" rel="noopener noreferrer"
                className="text-[10px] bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 rounded-full px-2 py-1 hover:bg-[#25D366]/30 transition-colors">
                WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {advisor.name && (
        <button
          onClick={() => updateTour({ salesAdvisor: undefined })}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Quitar asesor
        </button>
      )}
    </div>
  );
}

// ─── Shared helper ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}
