'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Tour, GalleryItem, TourModel3D } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { uploadAsset } from '@/lib/storage';
import {
  FileText, Image as ImageIcon, Film, Plus, Trash2, Upload, Loader2,
  ExternalLink, GripVertical, Youtube, Link2, Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MODEL_FORMATS = ['glb', 'gltf', 'splat', 'ply', 'obj'] as const;
type ModelFormat = typeof MODEL_FORMATS[number];

function getModelFormat(filenameOrUrl: string): ModelFormat | null {
  const clean = filenameOrUrl.split('?')[0]?.split('#')[0] ?? filenameOrUrl;
  const ext = clean.split('.').pop()?.toLowerCase();
  return MODEL_FORMATS.includes(ext as ModelFormat) ? (ext as ModelFormat) : null;
}

// ─── PDF Brochure section ─────────────────────────────────────────────────────

function BrochureSection({ tour }: { tour: Tour }) {
  const updateTour   = useTourStore((s) => s.updateTour);
  const inputRef     = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se aceptan archivos PDF.');
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError('El PDF no puede superar los 30 MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const result = await uploadAsset(tour.id, file);
      updateTour({ brochureUrl: result.url, brochureFilename: file.name });
    } catch {
      setError('Error al subir el archivo. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1">
        Brochure / Carpeta de ventas
      </h4>

      {tour.brochureUrl ? (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-900/20 border border-blue-700/30">
          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-300 font-medium truncate">
              {tour.brochureFilename ?? 'brochure.pdf'}
            </p>
            <a
              href={tour.brochureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-500 hover:text-blue-400 flex items-center gap-1 mt-0.5"
            >
              <ExternalLink className="w-3 h-3" /> Ver PDF
            </a>
          </div>
          <button
            onClick={() => updateTour({ brochureUrl: undefined, brochureFilename: undefined })}
            className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
            title="Quitar brochure"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-700 hover:border-blue-600/50 hover:bg-blue-900/10 text-gray-500 hover:text-blue-400 transition-colors disabled:opacity-50"
        >
          {uploading
            ? <Loader2 className="w-6 h-6 animate-spin" />
            : <Upload className="w-6 h-6" />}
          <span className="text-xs font-medium">
            {uploading ? 'Subiendo…' : 'Subir PDF (máx. 30 MB)'}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = '';
        }}
      />

      {error && (
        <p className="text-[11px] text-red-400 px-1">{error}</p>
      )}

      {!tour.brochureUrl && (
        <p className="text-[10px] text-gray-600 px-1">
          El botón "Descargar brochure" aparecerá en el recorrido para los visitantes.
        </p>
      )}
    </div>
  );
}

// ─── 3D model section ────────────────────────────────────────────────────────

function Model3DSection({ tour }: { tour: Tour }) {
  const updateTour = useTourStore((s) => s.updateTour);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState(tour.model3d?.title ?? '');
  const [error, setError] = useState<string | null>(null);

  const saveModel = (model: TourModel3D) => {
    updateTour({ model3d: model });
    setUrlInput('');
    setTitleInput(model.title ?? '');
    setError(null);
  };

  const handleUpload = async (file: File) => {
    const format = getModelFormat(file.name);
    if (!format) {
      setError('Formatos aceptados: .glb, .gltf, .splat, .ply, .obj.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('El modelo 3D no puede superar 100 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadAsset(tour.id, file);
      saveModel({
        url: result.url,
        filename: file.name,
        title: titleInput.trim() || 'Plano 3D',
        format,
      });
    } catch {
      setError('Error al subir el modelo. Revisa permisos de storage y vuelve a intentar.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    const format = getModelFormat(url);
    if (!format) {
      setError('La URL debe terminar en .glb, .gltf, .splat, .ply u .obj.');
      return;
    }
    saveModel({
      url,
      filename: url.split('/').pop()?.split('?')[0] || undefined,
      title: titleInput.trim() || 'Plano 3D',
      format,
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        Plano 3D / Dollhouse
      </h4>

      {tour.model3d ? (
        <div className="rounded-xl border border-cyan-700/30 bg-cyan-900/15 p-3">
          <div className="flex items-start gap-3">
            <Box className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-300" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-cyan-200">
                {tour.model3d.title || 'Plano 3D'}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-cyan-300/60">
                {tour.model3d.filename ?? tour.model3d.url}
              </p>
              {!['glb', 'gltf'].includes(tour.model3d.format) && (
                <p className="mt-2 text-[10px] leading-4 text-amber-300">
                  Guardado para pipeline avanzado. El visor actual renderiza .glb, .gltf, .obj y .ply.
                </p>
              )}
            </div>
            <button
              onClick={() => updateTour({ model3d: undefined })}
              className="flex-shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-red-400"
              title="Quitar modelo 3D"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <a
            href={tour.model3d.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-1 text-[10px] text-cyan-300 transition-colors hover:text-cyan-200"
          >
            <ExternalLink className="h-3 w-3" /> Abrir archivo
          </a>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-900/70 p-3">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Título: Plano 3D, Dollhouse, Maqueta..."
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-blue-500"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-600 py-3 text-xs font-medium text-gray-500 transition-colors hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Subiendo modelo...' : 'Subir .glb/.gltf/.obj/.ply/.splat'}
          </button>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              placeholder="O pega una URL pública al modelo"
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-blue-500"
            />
            <button
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
              className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-40"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,.splat,.ply,.obj,model/gltf-binary,model/gltf+json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = '';
        }}
      />

      {error && <p className="px-1 text-[11px] text-red-400">{error}</p>}
      {!tour.model3d && (
        <p className="px-1 text-[10px] leading-4 text-gray-600">
          Ideal para modelos generados en Polycam, RealityCapture, Luma, Blender o pipelines de drone/360.
        </p>
      )}
    </div>
  );
}

// ─── Gallery section ──────────────────────────────────────────────────────────

type AddMode = 'image-upload' | 'image-url' | 'youtube' | 'video-url' | null;

function GallerySection({ tour }: { tour: Tour }) {
  const updateTour  = useTourStore((s) => s.updateTour);
  const imageRef    = useRef<HTMLInputElement>(null);

  const [addMode,    setAddMode]    = useState<AddMode>(null);
  const [urlInput,   setUrlInput]   = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const gallery = useMemo<GalleryItem[]>(() => tour.gallery ?? [], [tour.gallery]);

  const addItem = useCallback((item: GalleryItem) => {
    updateTour({ gallery: [...gallery, item] });
  }, [gallery, updateTour]);

  const removeItem = useCallback((id: string) => {
    updateTour({ gallery: gallery.filter((g) => g.id !== id) });
  }, [gallery, updateTour]);

  // Upload image file
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('La imagen no puede superar los 15 MB.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const result = await uploadAsset(tour.id, file);
      addItem({
        id: uuidv4(),
        type: 'image',
        url: result.url,
        title: titleInput || file.name.replace(/\.[^.]+$/, ''),
      });
      setTitleInput('');
      setAddMode(null);
    } catch {
      setError('Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  // Add by URL (image or video)
  const handleAddUrl = useCallback(() => {
    if (!urlInput.trim()) return;
    setError(null);

    const url = urlInput.trim();
    let type: GalleryItem['type'] = 'image';
    let finalUrl = url;

    if (addMode === 'youtube') {
      // Accept full URLs or just IDs
      const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
      const id = match?.[1] ?? url.trim();
      if (!id || id.length !== 11) {
        setError('URL o ID de YouTube inválido.');
        return;
      }
      finalUrl = `https://www.youtube.com/embed/${id}`;
      type = 'video';
    } else if (addMode === 'video-url') {
      type = 'video';
    }

    addItem({
      id: uuidv4(),
      type,
      url: finalUrl,
      title: titleInput || undefined,
      thumbnail: addMode === 'youtube'
        ? `https://img.youtube.com/vi/${finalUrl.split('/embed/')[1]}/hqdefault.jpg`
        : undefined,
    });
    setUrlInput('');
    setTitleInput('');
    setAddMode(null);
  }, [addMode, addItem, titleInput, urlInput]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Galería de imágenes y videos
        </h4>
        <span className="text-[10px] text-gray-600">{gallery.length} elemento{gallery.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Gallery grid */}
      {gallery.length > 0 && (
        <div className="space-y-1.5">
          {gallery.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-800 border border-gray-700 group">
              {/* Thumbnail */}
              <div className="w-12 h-9 rounded-md overflow-hidden bg-gray-700 flex-shrink-0 relative">
                {item.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <>
                    {item.thumbnail
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center bg-gray-700">
                          <Film className="w-4 h-4 text-gray-500" />
                        </div>
                    }
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Film className="w-3 h-3 text-white" />
                    </div>
                  </>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 truncate font-medium">
                  {item.title ?? (item.type === 'image' ? 'Imagen' : 'Video')}
                </p>
                <p className="text-[10px] text-gray-600 truncate">{item.url.slice(0, 50)}…</p>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(item.id)}
                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {addMode ? (
        <div className="space-y-2 p-3 rounded-xl bg-gray-800 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300">
              {addMode === 'image-upload' ? 'Subir imagen'
               : addMode === 'image-url'  ? 'URL de imagen'
               : addMode === 'youtube'    ? 'Video de YouTube'
               : 'URL de video'}
            </span>
            <button onClick={() => { setAddMode(null); setUrlInput(''); setTitleInput(''); setError(null); }}
              className="text-[10px] text-gray-600 hover:text-gray-400">Cancelar</button>
          </div>

          {/* Title (all modes) */}
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Título (opcional)"
            className="w-full px-3 py-2 text-xs rounded-lg bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
          />

          {addMode === 'image-upload' ? (
            <button
              onClick={() => imageRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-gray-600 hover:border-blue-500 text-gray-500 hover:text-blue-400 transition-colors text-xs disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Subiendo…' : 'Seleccionar imagen'}
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                placeholder={addMode === 'youtube' ? 'https://youtube.com/watch?v=… o ID' : 'https://…'}
                className="flex-1 px-3 py-2 text-xs rounded-lg bg-gray-900 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleAddUrl}
                disabled={!urlInput.trim()}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                Agregar
              </button>
            </div>
          )}

          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>
      ) : (
        /* Add buttons */
        <div className="grid grid-cols-2 gap-2">
          {[
            { mode: 'image-upload' as AddMode, icon: <Upload  className="w-3.5 h-3.5" />, label: 'Subir imagen' },
            { mode: 'image-url'   as AddMode, icon: <ImageIcon className="w-3.5 h-3.5" />, label: 'URL imagen' },
            { mode: 'youtube'     as AddMode, icon: <Youtube  className="w-3.5 h-3.5" />, label: 'YouTube' },
            { mode: 'video-url'   as AddMode, icon: <Link2    className="w-3.5 h-3.5" />, label: 'URL video' },
          ].map(({ mode, icon, label }) => (
            <button
              key={mode!}
              onClick={() => { setAddMode(mode); setError(null); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-200 transition-colors text-xs font-medium"
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}

      {/* Hidden image input */}
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
          e.target.value = '';
        }}
      />

      {gallery.length === 0 && !addMode && (
        <p className="text-[10px] text-gray-600 px-1">
          Las imágenes y videos aparecen en una galería accesible desde el recorrido.
        </p>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface MediaPanelProps {
  tour: Tour;
}

export function MediaPanel({ tour }: MediaPanelProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
        Medios del tour
      </h3>
      <BrochureSection tour={tour} />
      <div className="border-t border-gray-800" />
      <Model3DSection tour={tour} />
      <div className="border-t border-gray-800" />
      <GallerySection tour={tour} />
    </div>
  );
}
