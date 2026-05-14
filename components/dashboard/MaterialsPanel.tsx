'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Upload, Trash2, Download, Loader2, FolderOpen,
  FileText, AlertCircle, CheckCircle, X, Plus,
  LayoutGrid, List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getMaterials, uploadMaterial, deleteMaterial, getDownloadUrl,
  CATEGORY_CONFIG, formatBytes, fileIcon,
  type TeamMaterial, type MaterialCategory,
} from '@/lib/materials';

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [MaterialCategory, { label: string; color: string }][];

// ─── Upload form ──────────────────────────────────────────────────────────────

function UploadForm({ onUploaded }: { onUploaded: (m: TeamMaterial) => void }) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);
  const [file,        setFile]        = useState<File | null>(null);
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState<MaterialCategory>('general');
  const [dragging,    setDragging]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const pickFile = (f: File) => {
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setUploading(true);
    setError(null);
    const result = await uploadMaterial({ file, name: name.trim(), description: description.trim() || undefined, category });
    setUploading(false);
    if (result.error) { setError(result.error); return; }
    onUploaded(result.data!);
    setFile(null);
    setName('');
    setDescription('');
    setCategory('general');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl bg-gray-900 border border-gray-800">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Subir archivo</p>

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
          dragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50',
          file && 'border-emerald-500/50 bg-emerald-500/5'
        )}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.pptx,.ppt"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
        />
        {file ? (
          <>
            <span className="text-3xl">{fileIcon(file.type)}</span>
            <p className="text-sm font-medium text-gray-200 text-center">{file.name}</p>
            <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setName(''); if (fileRef.current) fileRef.current.value = ''; }}
              className="absolute top-2 right-2 p-1 rounded-lg hover:bg-gray-700 text-gray-600 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-600" />
            <p className="text-sm text-gray-500">Arrastra un archivo o <span className="text-blue-400">haz clic para seleccionar</span></p>
            <p className="text-xs text-gray-600">PDF, imagen, Excel, CSV, PowerPoint · Máx 50 MB</p>
          </>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 font-medium">Nombre *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lista de precios Q1 2025"
            className="w-full px-3 py-2 text-sm rounded-xl bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500 font-medium">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MaterialCategory)}
            className="w-full px-3 py-2 text-sm rounded-xl bg-gray-800 border border-gray-700 text-gray-200 outline-none focus:border-blue-500 transition-colors"
          >
            {CATEGORIES.map(([value, cfg]) => (
              <option key={value} value={value}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-gray-500 font-medium">Descripción (opcional)</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Válido para el proyecto Torre Norte, vigente hasta junio 2025"
          className="w-full px-3 py-2 text-sm rounded-xl bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || !file || !name.trim()}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {uploading ? 'Subiendo…' : 'Subir material'}
      </button>
    </form>
  );
}

// ─── Shared actions hook ──────────────────────────────────────────────────────

function useMaterialActions(material: TeamMaterial, onDeleted: (id: string) => void) {
  const [downloading, setDownloading] = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    const url = await getDownloadUrl(material.id);
    setDownloading(false);
    if (url) window.open(url, '_blank');
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${material.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    const ok = await deleteMaterial(material.id);
    setDeleting(false);
    if (ok) onDeleted(material.id);
  };

  return { downloading, deleting, handleDownload, handleDelete };
}

// ─── Material row (list view) ─────────────────────────────────────────────────

function MaterialRow({
  material, isAdmin, onDeleted,
}: {
  material: TeamMaterial;
  isAdmin:  boolean;
  onDeleted: (id: string) => void;
}) {
  const cfg = CATEGORY_CONFIG[material.category];
  const { downloading, deleting, handleDownload, handleDelete } = useMaterialActions(material, onDeleted);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
      <span className="text-2xl flex-shrink-0">{fileIcon(material.file_type)}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-200 truncate">{material.name}</p>
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0', cfg.color)}>
            {cfg.label}
          </span>
        </div>
        {material.description && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{material.description}</p>
        )}
        <p className="text-[11px] text-gray-600 mt-0.5">
          {material.file_name} {material.file_size ? `· ${formatBytes(material.file_size)}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleDownload}
          disabled={downloading}
          title="Descargar"
          className="w-8 h-8 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-colors border border-blue-500/20 disabled:opacity-40"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        </button>
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Eliminar"
            className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-red-500/20 text-gray-600 hover:text-red-400 flex items-center justify-center transition-colors border border-gray-700 disabled:opacity-40"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Material card (grid view) ────────────────────────────────────────────────

function MaterialCard({
  material, isAdmin, onDeleted,
}: {
  material: TeamMaterial;
  isAdmin:  boolean;
  onDeleted: (id: string) => void;
}) {
  const cfg = CATEGORY_CONFIG[material.category];
  const { downloading, deleting, handleDownload, handleDelete } = useMaterialActions(material, onDeleted);

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-4xl">{fileIcon(material.file_type)}</span>
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0 mt-0.5', cfg.color)}>
          {cfg.label}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-200 leading-snug line-clamp-2">{material.name}</p>
        {material.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{material.description}</p>
        )}
        <p className="text-[11px] text-gray-600 mt-1.5">
          {material.file_size ? formatBytes(material.file_size) : material.file_name}
        </p>
      </div>

      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-800">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold transition-colors border border-blue-500/20 disabled:opacity-40"
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Descargar
        </button>
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Eliminar"
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-red-500/20 text-gray-600 hover:text-red-400 flex items-center justify-center transition-colors border border-gray-700 disabled:opacity-40"
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function MaterialsPanel({ isAdmin }: { isAdmin: boolean }) {
  const [materials,   setMaterials]   = useState<TeamMaterial[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<MaterialCategory | 'all'>('all');
  const [showUpload,  setShowUpload]  = useState(false);
  const [viewMode,    setViewMode]    = useState<'list' | 'grid'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    setMaterials(await getMaterials());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUploaded = (m: TeamMaterial) => {
    setMaterials((prev) => [m, ...prev]);
    setShowUpload(false);
  };

  const handleDeleted = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const visible = filter === 'all'
    ? materials
    : materials.filter((m) => m.category === filter);

  const groupedVisible = CATEGORIES
    .map(([cat, cfg]) => ({
      cat,
      cfg,
      items: visible.filter((m) => m.category === cat),
    }))
    .filter((group) => group.items.length > 0);

  const countByCategory = (cat: MaterialCategory) => materials.filter((m) => m.category === cat).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            Kit de Ventas
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Materiales internos — visibles solo para tu equipo, nunca para clientes externos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-gray-800 bg-gray-900 p-0.5">
            <button
              onClick={() => setViewMode('list')}
              title="Vista lista"
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-600 hover:text-gray-400'
              )}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Vista cuadrícula"
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-600 hover:text-gray-400'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowUpload((v) => !v)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                showUpload
                  ? 'bg-gray-800 text-gray-300 border border-gray-700'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              )}
            >
              {showUpload ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {showUpload ? 'Cancelar' : 'Subir archivo'}
            </button>
          )}
        </div>
      </div>

      {/* Upload form */}
      {isAdmin && showUpload && <UploadForm onUploaded={handleUploaded} />}

      {/* Category filter chips */}
      {materials.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
              filter === 'all'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
            )}
          >
            Todos ({materials.length})
          </button>
          {CATEGORIES.map(([cat, cfg]) => {
            const count = countByCategory(cat);
            if (!count) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                  filter === cat ? `${cfg.color} opacity-100` : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                )}
              >
                {cfg.label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
            <FileText className="w-6 h-6 text-gray-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">
              {filter !== 'all' ? `Sin materiales en "${CATEGORY_CONFIG[filter].label}"` : 'Sin materiales aún'}
            </p>
            {isAdmin && filter === 'all' && (
              <p className="text-xs text-gray-600 mt-1">
                Sube listas de precios, descuentos, planos y materiales de comisiones para tu equipo.
              </p>
            )}
          </div>
        </div>
      ) : filter === 'all' ? (
        <div className="space-y-5">
          {groupedVisible.map((group) => (
            <section key={group.cat} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold', group.cfg.color)}>
                  {group.cfg.label}
                </span>
                <span className="text-[10px] text-gray-600">{group.items.length} archivo{group.items.length !== 1 ? 's' : ''}</span>
              </div>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {group.items.map((m) => (
                    <MaterialCard key={m.id} material={m} isAdmin={isAdmin} onDeleted={handleDeleted} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {group.items.map((m) => (
                    <MaterialRow key={m.id} material={m} isAdmin={isAdmin} onDeleted={handleDeleted} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map((m) => (
            <MaterialCard key={m.id} material={m} isAdmin={isAdmin} onDeleted={handleDeleted} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((m) => (
            <MaterialRow key={m.id} material={m} isAdmin={isAdmin} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {/* Info banner */}
      {!isAdmin && materials.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Los links de descarga expiran en 1 hora. Descarga el archivo si necesitas acceso offline.
        </div>
      )}
    </div>
  );
}
