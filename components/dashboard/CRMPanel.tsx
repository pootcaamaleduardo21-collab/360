'use client';

/**
 * CRMPanel — Master inventory view across all tours.
 *
 * Features:
 * - Table of all units from all tours
 * - Filter by tour, status, search by label
 * - Inline status editing
 * - Export all units to CSV
 * - Master CSV import with column mapping
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { listToursWithUnits, getTourById, saveTour, type CRMUnit } from '@/lib/db';
import { PropertyStatus } from '@/types/tour.types';
import {
  Loader2, Search, Download, Upload, ChevronDown,
  Building2, AlertCircle, RefreshCw, Check, X, FileText, Hotel,
  Briefcase, Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PropertyStatus, string> = {
  available:  'Disponible',
  reserved:   'Reservado',
  sold:       'Vendido',
  'in-process': 'En proceso',
};

const STATUS_COLORS: Record<PropertyStatus, string> = {
  available:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  reserved:     'bg-amber-500/15 text-amber-400 border-amber-500/30',
  sold:         'bg-red-500/15 text-red-400 border-red-500/30',
  'in-process': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const STATUSES: PropertyStatus[] = ['available', 'reserved', 'in-process', 'sold'];

// ─── Column mapper for CSV import ─────────────────────────────────────────────

const STANDARD_FIELDS = [
  { key: 'label',        label: 'Identificador (Apt, Suite…)' },
  { key: 'status',       label: 'Estado (available/sold/reserved/in-process)' },
  { key: 'price',        label: 'Precio' },
  { key: 'currency',     label: 'Moneda' },
  { key: 'area',         label: 'Área (m²)' },
  { key: 'bedrooms',     label: 'Recámaras' },
  { key: 'bathrooms',    label: 'Baños' },
  { key: 'parking',      label: 'Cajones de estacionamiento' },
  { key: 'floor',        label: 'Piso' },
  { key: 'orientation',  label: 'Orientación' },
  { key: 'description',  label: 'Descripción' },
  { key: '__tour__',     label: '🗂 Nombre del tour (para distribución multi-tour)' },
  { key: '__skip__',     label: '— Ignorar columna' },
];

// ─── Niche templates ──────────────────────────────────────────────────────────

interface NicheTemplate {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  headers: string[];
  example: string[];
}

const NICHE_TEMPLATES: NicheTemplate[] = [
  {
    id: 'real_estate',
    label: 'Inmobiliario',
    description: 'Casas, depto, condominios',
    icon: <Building2 className="w-4 h-4" />,
    headers: ['tour', 'label', 'status', 'price', 'currency', 'area', 'bedrooms', 'bathrooms', 'parking', 'floor', 'orientation', 'description'],
    example: ['Torre Residencial Norte', 'Depto 3A', 'available', '3500000', 'MXN', '85', '2', '2', '1', '3', 'Norte', 'Vista al parque'],
  },
  {
    id: 'hotel',
    label: 'Hotel / Resort',
    description: 'Habitaciones y suites',
    icon: <Hotel className="w-4 h-4" />,
    headers: ['tour', 'label', 'status', 'price', 'currency', 'area', 'bedrooms', 'bathrooms', 'floor', 'orientation', 'description'],
    example: ['Grand Hotel Cancún', 'Suite 502', 'available', '4500', 'MXN', '65', '1', '1', '5', 'Vista al mar', 'King bed · Balcón privado'],
  },
  {
    id: 'coworking',
    label: 'Coworking / Oficinas',
    description: 'Espacios de trabajo',
    icon: <Briefcase className="w-4 h-4" />,
    headers: ['tour', 'label', 'status', 'price', 'currency', 'area', 'parking', 'floor', 'description'],
    example: ['WeWork Centro', 'Oficina 12', 'available', '18000', 'MXN', '42', '1', '2', 'Privada · 6 personas · Sala incluida'],
  },
  {
    id: 'commercial',
    label: 'Comercial / Retail',
    description: 'Locales y plazas',
    icon: <Store className="w-4 h-4" />,
    headers: ['tour', 'label', 'status', 'price', 'currency', 'area', 'floor', 'orientation', 'description'],
    example: ['Plaza Las Américas', 'Local B-14', 'available', '55000', 'MXN', '120', '1', 'Frente principal', 'Esquina · Alta afluencia'],
  },
];

function downloadTemplate(template: NicheTemplate) {
  // Two example rows so users see the pattern clearly
  const example2 = [...template.example];
  // Tweak first column (tour) and label for the second row
  example2[0] = template.example[0]; // same tour
  example2[1] = template.id === 'real_estate' ? 'Depto 4B'
    : template.id === 'hotel'     ? 'Habitación 301'
    : template.id === 'coworking' ? 'Sala Magna'
    : 'Local C-05';
  example2[2] = 'reserved';

  const rows = [template.headers, template.example, example2];
  const csv  = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `plantilla_crm_${template.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exportToCSV(units: CRMUnit[]) {
  const headers = ['Tour', 'ID', 'Estado', 'Precio', 'Moneda', 'Área (m²)', 'Recámaras', 'Baños', 'Estacionamiento', 'Piso', 'Orientación'];
  const rows = units.map(({ tourTitle, unit }) => [
    tourTitle,
    unit.label,
    STATUS_LABELS[unit.status] ?? unit.status,
    unit.price ?? '',
    unit.currency ?? '',
    unit.area ?? '',
    unit.bedrooms ?? '',
    unit.bathrooms ?? '',
    unit.parking ?? '',
    unit.floor ?? '',
    unit.orientation ?? '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'crm_eleva360.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines  = text.trim().split(/\r?\n/);
  const parse  = (line: string) => {
    const cols: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };
  const headers = parse(lines[0]);
  const rows    = lines.slice(1).filter((l) => l.trim()).map(parse);
  return { headers, rows };
}

// ─── Sub: template download dropdown ─────────────────────────────────────────

function TemplateDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700 text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Plantilla
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform text-gray-500', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs font-bold text-gray-200">Descargar plantilla CSV</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Elige tu nicho — incluye 2 filas de ejemplo</p>
          </div>
          <div className="p-2 space-y-1">
            {NICHE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => { downloadTemplate(tpl); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-gray-800 transition-colors group"
              >
                <span className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center text-blue-400 flex-shrink-0 transition-colors">
                  {tpl.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-200">{tpl.label}</p>
                  <p className="text-[11px] text-gray-500">{tpl.description}</p>
                </div>
                <Download className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-400 transition-colors flex-shrink-0 ml-auto" />
              </button>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-800 bg-gray-800/40">
            <p className="text-[11px] text-gray-600">
              💡 La columna <span className="font-mono text-gray-400">tour</span> distribuye las filas al tour correcto al importar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub: status pill with inline dropdown ────────────────────────────────────

function StatusPill({
  status,
  onSelect,
}: {
  status: PropertyStatus;
  onSelect: (s: PropertyStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors cursor-pointer',
          STATUS_COLORS[status]
        )}
      >
        {STATUS_LABELS[status]}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { onSelect(s); setOpen(false); }}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-xs font-medium transition-colors',
                s === status ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              {s === status && <Check className="w-3 h-3 text-blue-400" />}
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub: CSV import modal ────────────────────────────────────────────────────

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'saving'>('upload');
  const [csvHeaders, setCsvHeaders]         = useState<string[]>([]);
  const [csvRows, setCsvRows]               = useState<string[][]>([]);
  const [mapping, setMapping]               = useState<Record<string, string>>({});
  const [error, setError]                   = useState<string | null>(null);
  const [saveResult, setSaveResult]         = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { headers, rows } = parseCSV(ev.target!.result as string);
        setCsvHeaders(headers);
        setCsvRows(rows);
        // Auto-map by matching header names (case insensitive)
        const auto: Record<string, string> = {};
        headers.forEach((h) => {
          const norm = h.toLowerCase().replace(/[^a-z]/g, '');
          const match = STANDARD_FIELDS.find((f) => f.key.replace(/[^a-z]/g, '') === norm || f.label.toLowerCase().includes(norm));
          auto[h] = match?.key ?? '__skip__';
        });
        setMapping(auto);
        setStep('map');
      } catch {
        setError('No se pudo leer el archivo. Asegúrate de que sea un CSV válido.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleSave = async () => {
    setStep('saving');
    try {
      // Group rows by tour (if __tour__ column mapped)
      const tourColHeader = Object.entries(mapping).find(([, v]) => v === '__tour__')?.[0];
      const tourColIdx    = tourColHeader !== undefined ? csvHeaders.indexOf(tourColHeader) : -1;

      // Fetch all tours (we need to find them by title)
      const { getSupabase } = await import('@/lib/supabase');
      const sb = getSupabase();
      const { data: tourRows } = await sb.from('tours').select('id, title, data');

      type TourRowRaw = { id: string; title: string; data: Record<string, unknown> };
      const byTitle = new Map(
        ((tourRows ?? []) as TourRowRaw[]).map((r) => [r.title.toLowerCase().trim(), r])
      );

      const tourUpdates = new Map<string, { row: TourRowRaw; units: Record<string, unknown>[] }>();

      for (const csvRow of csvRows) {
        const rawTourTitle = tourColIdx >= 0 ? (csvRow[tourColIdx] ?? '').trim() : null;
        if (rawTourTitle === null || rawTourTitle === '') continue; // skip if no tour column

        const tourRow = byTitle.get(rawTourTitle.toLowerCase());
        if (!tourRow) continue; // tour not found — skip row

        if (!tourUpdates.has(tourRow.id)) {
          tourUpdates.set(tourRow.id, {
            row:   tourRow,
            units: [...((tourRow.data?.units as Record<string, unknown>[] | undefined) ?? [])],
          });
        }

        // Build unit from mapped columns
        const entry: Record<string, unknown> = { id: crypto.randomUUID(), status: 'available' };
        for (const [header, fieldKey] of Object.entries(mapping)) {
          if (fieldKey === '__skip__' || fieldKey === '__tour__') continue;
          const colIdx = csvHeaders.indexOf(header);
          if (colIdx < 0) continue;
          const raw = csvRow[colIdx] ?? '';
          const num = Number(raw);
          if (['price', 'area', 'bedrooms', 'bathrooms', 'parking', 'floor'].includes(fieldKey)) {
            if (!Number.isNaN(num) && raw !== '') entry[fieldKey] = num;
          } else if (fieldKey === 'status') {
            // Normalize status
            const s = raw.toLowerCase().replace(/[- ]/g, '');
            const normalized: Record<string, PropertyStatus> = {
              available: 'available', disponible: 'available',
              reserved: 'reserved', reservado: 'reserved',
              sold: 'sold', vendido: 'sold',
              inprocess: 'in-process', enproceso: 'in-process',
            };
            entry.status = normalized[s] ?? 'available';
          } else {
            entry[fieldKey] = raw;
          }
        }

        // Merge or add unit (match by label)
        const existing = tourUpdates.get(tourRow.id)!;
        const idx = existing.units.findIndex((u) => (u as Record<string, unknown>).label === entry.label);
        if (idx >= 0) {
          existing.units[idx] = { ...existing.units[idx], ...entry, id: (existing.units[idx] as Record<string, unknown>).id ?? entry.id };
        } else {
          existing.units.push(entry);
        }
      }

      // Save updated tours
      let saved = 0;
      for (const { row, units } of tourUpdates.values()) {
        const updatedData = { ...row.data, units };
        await sb.from('tours').update({ data: updatedData }).eq('id', row.id);
        saved++;
      }

      setSaveResult(`✅ Importación completa: ${csvRows.length} filas procesadas, ${saved} tour${saved !== 1 ? 's' : ''} actualizados.`);
      setTimeout(() => { onImported(); onClose(); }, 2500);
    } catch (err) {
      setSaveResult(`❌ Error: ${(err as Error).message}`);
      setStep('preview');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-bold text-white">Importar inventario CRM</h2>
            <p className="text-xs text-gray-500 mt-0.5">CSV con columna "tour" para distribución multi-tour</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Step: Upload */}
          {step === 'upload' && (
            <div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded-2xl p-10 text-center transition-colors group"
              >
                <FileText className="w-10 h-10 text-gray-600 group-hover:text-blue-400 mx-auto mb-3 transition-colors" />
                <p className="text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">Arrastra tu CSV aquí o haz clic para seleccionar</p>
                <p className="text-xs text-gray-600 mt-1">UTF-8 • columnas separadas por coma</p>
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />

              <div className="mt-4 p-3 rounded-xl bg-gray-800/60 border border-gray-700">
                <p className="text-xs font-semibold text-gray-400 mb-2">Columnas recomendadas</p>
                <p className="text-xs text-gray-600 font-mono">tour, label, status, price, area, bedrooms, bathrooms, floor, orientation</p>
              </div>
            </div>
          )}

          {/* Step: Map */}
          {step === 'map' && (
            <div>
              <p className="text-sm text-gray-400 mb-4">
                Mapea cada columna de tu archivo a un campo estándar.<br/>
                <span className="text-blue-400 font-semibold">La columna "tour"</span> es necesaria para distribuir unidades al tour correcto.
              </p>
              <div className="space-y-2">
                {csvHeaders.map((h) => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400 bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-700 w-40 truncate flex-shrink-0">{h}</span>
                    <span className="text-gray-600 text-xs">→</span>
                    <select
                      value={mapping[h] ?? '__skip__'}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
                    >
                      {STANDARD_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div>
              {saveResult && (
                <div className={cn(
                  'p-3 rounded-xl text-sm mb-4',
                  saveResult.startsWith('✅') ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
                )}>
                  {saveResult}
                </div>
              )}
              <p className="text-sm text-gray-400 mb-3">
                Vista previa — <span className="text-white font-semibold">{csvRows.length} unidades</span> encontradas
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-800/60 border-b border-gray-700">
                    <tr>
                      {csvHeaders.map((h) => mapping[h] !== '__skip__' && (
                        <th key={h} className="px-3 py-2 font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-gray-800/50 last:border-none">
                        {csvHeaders.map((h, ci) => mapping[h] !== '__skip__' && (
                          <td key={h} className="px-3 py-2 text-gray-300 whitespace-nowrap max-w-[150px] truncate">{row[ci]}</td>
                        ))}
                      </tr>
                    ))}
                    {csvRows.length > 5 && (
                      <tr><td colSpan={99} className="px-3 py-2 text-gray-600 text-center">+{csvRows.length - 5} más…</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step: Saving */}
          {step === 'saving' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              <p className="text-sm text-gray-400">Guardando cambios en tus tours…</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800 bg-gray-900/80">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
            Cancelar
          </button>
          <div className="flex gap-2">
            {step === 'map' && (
              <>
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep('preview')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Previsualizar
                </button>
              </>
            )}
            {step === 'preview' && !saveResult && (
              <>
                <button
                  onClick={() => setStep('map')}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Ajustar mapeo
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Importar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CRMPanel() {
  const [allUnits,      setAllUnits]      = useState<CRMUnit[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [filterTour,    setFilterTour]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [importOpen,    setImportOpen]    = useState(false);
  const [saving,        setSaving]        = useState<string | null>(null); // unitId being saved

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listToursWithUnits();
      setAllUnits(data);
    } catch {
      setError('No se pudo cargar el inventario.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Inline status update ──────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (tourId: string, unitId: string, newStatus: PropertyStatus) => {
    // Optimistic update
    setAllUnits((prev) =>
      prev.map((item) =>
        item.tourId === tourId && item.unit.id === unitId
          ? { ...item, unit: { ...item.unit, status: newStatus } }
          : item
      )
    );
    setSaving(unitId);
    try {
      const tourRow = await getTourById(tourId);
      if (!tourRow) return;
      const updated = {
        ...tourRow.data,
        units: (tourRow.data.units ?? []).map((u) =>
          u.id === unitId ? { ...u, status: newStatus } : u
        ),
      };
      await saveTour(updated);
    } catch {
      // Revert on failure
      load();
    } finally {
      setSaving(null);
    }
  }, [load]);

  // ── Filter + search ───────────────────────────────────────────────────────
  const tourOptions = Array.from(new Set(allUnits.map((u) => u.tourTitle))).sort();

  const filtered = allUnits.filter((item) => {
    const matchSearch = !search || item.unit.label.toLowerCase().includes(search.toLowerCase());
    const matchTour   = !filterTour   || item.tourTitle === filterTour;
    const matchStatus = !filterStatus || item.unit.status === filterStatus;
    return matchSearch && matchTour && matchStatus;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:     allUnits.length,
    available: allUnits.filter((u) => u.unit.status === 'available').length,
    reserved:  allUnits.filter((u) => u.unit.status === 'reserved').length,
    sold:      allUnits.filter((u) => u.unit.status === 'sold').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-100">CRM de inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">Todas las unidades de todos tus tours, en un solo lugar</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700"
            title="Recargar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* Download niche template */}
          <TemplateDropdown />
          {/* Export current data */}
          <button
            onClick={() => exportToCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors border border-gray-700 text-sm font-medium disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors text-sm shadow-lg shadow-blue-600/20"
          >
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: stats.total,     color: 'text-gray-300' },
          { label: 'Disponible', value: stats.available,  color: 'text-emerald-400' },
          { label: 'Reservado',  value: stats.reserved,   color: 'text-amber-400' },
          { label: 'Vendido',    value: stats.sold,       color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-2xl bg-gray-900 border border-gray-800">
            <p className={cn('text-2xl font-black leading-none', color)}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar unidad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={filterTour}
          onChange={(e) => setFilterTour(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos los tours</option>
          {tourOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      ) : allUnits.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-gray-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-400 mb-2">Sin unidades aún</h3>
          <p className="text-sm text-gray-600 max-w-xs mx-auto mb-5">
            Importa tu inventario desde un CSV o agrega unidades desde el editor de tours.
          </p>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors mx-auto"
          >
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          Sin resultados para los filtros aplicados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-400 text-xs">Tour</th>
                <th className="px-4 py-3 font-semibold text-gray-400 text-xs">Unidad</th>
                <th className="px-4 py-3 font-semibold text-gray-400 text-xs">Estado</th>
                <th className="px-4 py-3 font-semibold text-gray-400 text-xs">Precio</th>
                <th className="px-4 py-3 font-semibold text-gray-400 text-xs">Área</th>
                <th className="px-4 py-3 font-semibold text-gray-400 text-xs">Rec.</th>
                <th className="px-4 py-3 font-semibold text-gray-400 text-xs">Baños</th>
                <th className="px-4 py-3 font-semibold text-gray-400 text-xs">Piso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filtered.map(({ tourId, tourTitle, unit }) => (
                <tr key={`${tourId}-${unit.id}`} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-md border border-gray-700 whitespace-nowrap max-w-[140px] truncate block">
                      {tourTitle}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-200 whitespace-nowrap">{unit.label}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusPill
                        status={unit.status}
                        onSelect={(s) => handleStatusChange(tourId, unit.id, s)}
                      />
                      {saving === unit.id && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {unit.price ? `${(unit.currency ?? 'MXN')} ${unit.price.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{unit.area ? `${unit.area} m²` : '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{unit.bedrooms ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{unit.bathrooms ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{unit.floor ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-800 bg-gray-900/60">
            <span className="text-xs text-gray-600">{filtered.length} de {allUnits.length} unidades</span>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={load}
        />
      )}
    </div>
  );
}
