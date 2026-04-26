'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, X, CheckCircle, AlertCircle, Cloud, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { readFileAsDataURL } from '@/lib/utils';
import { uploadSceneImage, uploadSceneDataUrl, generateThumbnail, uploadThumbnail } from '@/lib/storage';
import { useTourStore } from '@/store/tourStore';
import {
  detectFormat,
  convertToEquirectangularJpeg,
  FORMAT_INSTRUCTIONS,
  getCameraLabel,
  getActionBadges,
  type FormatInfo,
  type ConversionResult,
} from '@/lib/imageConverter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageUploaderProps {
  onImagesReady: (files: Array<{ name: string; url: string; thumbnailUrl?: string }>) => void;
  maxFiles?: number;
  className?: string;
}

type FileStatus = 'pending' | 'detecting' | 'converting' | 'uploading' | 'ready' | 'error';

interface FileItem {
  file: File;
  preview: string;
  status: FileStatus;
  uploadProgress?: number;
  formatInfo?: FormatInfo;
  convResult?: ConversionResult;
  error?: string;
  showInstructions?: boolean;
}

// ─── Camera guide data ────────────────────────────────────────────────────────

const CAMERA_GUIDES = [
  {
    brand: 'Insta360 X4',
    color: 'text-orange-300',
    dot: 'bg-orange-500',
    steps: [
      'Captura la foto 360° con tu X4',
      'Conecta vía USB o transfiere el archivo .insp',
      'Arrastra el .insp directo aquí — se procesa automáticamente',
    ],
    note: '✓ No necesitas Insta360 Studio. El .insp ya es equirectangular.',
    noteColor: 'text-green-400',
  },
  {
    brand: 'DJI Mini 3',
    color: 'text-sky-300',
    dot: 'bg-sky-500',
    steps: [
      'En DJI Fly: Panorama → Esfera (26 fotos)',
      'Espera el stitching automático en la app',
      'Descarga el JPEG resultante al teléfono/PC',
      'Arrastra el JPEG aquí',
    ],
    note: '✓ El JPEG del DJI Fly ya es equirectangular 8192×4096.',
    noteColor: 'text-green-400',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageUploader({ onImagesReady, maxFiles = 20, className }: ImageUploaderProps) {
  const [files, setFiles]           = useState<FileItem[]>([]);
  const [showGuide, setShowGuide]   = useState(false);
  const tour = useTourStore((s) => s.tour);

  const patch = (name: string, p: Partial<FileItem>) =>
    setFiles((prev) => prev.map((f) => f.file.name === name ? { ...f, ...p } : f));

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const newItems: FileItem[] = accepted.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as FileStatus,
      }));

      setFiles((prev) => [...prev, ...newItems].slice(0, maxFiles));

      const ready: Array<{ name: string; url: string; thumbnailUrl?: string }> = [];

      for (const item of newItems) {
        const name = item.file.name;

        // ── 1. Detect format ───────────────────────────────────────────────
        patch(name, { status: 'detecting' });

        let info: FormatInfo;
        try {
          info = await detectFormat(item.file);
          patch(name, { formatInfo: info });
        } catch {
          patch(name, { status: 'error', error: 'Error leyendo el archivo' });
          continue;
        }

        if (!info.canConvert) {
          patch(name, { status: 'error', error: info.issueMessage ?? 'Formato no compatible' });
          continue;
        }

        // ── 2. Convert / optimize if needed ───────────────────────────────
        let uploadBlob: File | Blob = item.file;
        let convResult: ConversionResult | undefined;

        if (info.action !== 'use-as-is') {
          patch(name, { status: 'converting' });
          try {
            convResult = await convertToEquirectangularJpeg(item.file, info);
            uploadBlob = convResult.blob;
            patch(name, { convResult });
          } catch (err) {
            console.error(err);
            patch(name, { status: 'error', error: 'Error al procesar la imagen' });
            continue;
          }
        }

        // ── 3. Upload ──────────────────────────────────────────────────────
        patch(name, { status: 'uploading', uploadProgress: 5 });

        try {
          let url: string;
          let thumbnailUrl: string | undefined;

          if (tour?.id && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            if (uploadBlob instanceof File) {
              const result = await uploadSceneImage(tour.id, uploadBlob, (pct) =>
                patch(name, { uploadProgress: 5 + pct * 0.75 })
              );
              url = result.url;
            } else {
              patch(name, { uploadProgress: 30 });
              const dataUrl = await blobToDataUrl(uploadBlob);
              const result  = await uploadSceneDataUrl(tour.id, dataUrl, 'jpg');
              url = result.url;
              patch(name, { uploadProgress: 80 });
            }

            patch(name, { uploadProgress: 85 });
            const srcFile    = uploadBlob instanceof File
              ? uploadBlob
              : new File([uploadBlob], name.replace(/\.insp$/i, '.jpg'), { type: 'image/jpeg' });
            const dataUrl    = await readFileAsDataURL(srcFile);
            const thumbUrl   = await generateThumbnail(dataUrl, 320, 160);
            const thumbResult = await uploadThumbnail(tour.id, thumbUrl);
            thumbnailUrl = thumbResult.url;
          } else {
            const srcFile = uploadBlob instanceof File
              ? uploadBlob
              : new File([uploadBlob], name.replace(/\.insp$/i, '.jpg'), { type: 'image/jpeg' });
            url = await readFileAsDataURL(srcFile);
          }

          patch(name, { status: 'ready', uploadProgress: 100 });
          ready.push({ name, url, thumbnailUrl });
        } catch (err) {
          console.error(err);
          patch(name, { status: 'error', error: 'Error al subir el archivo' });
        }
      }

      if (ready.length > 0) onImagesReady(ready);
    },
    [maxFiles, onImagesReady, tour]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg':               ['.jpg', '.jpeg', '.insp'],
      'image/png':                ['.png'],
      'image/webp':               ['.webp'],
      'image/heic':               ['.heic'],
      'image/heif':               ['.heif'],
      'application/octet-stream': ['.insv', '.360', '.dng', '.arw', '.cr2', '.cr3', '.nef', '.orf', '.raf', '.rw2', '.raw'],
    },
    maxFiles,
    multiple: true,
  });

  const removeFile = (name: string) =>
    setFiles((prev) => {
      const r = prev.find((f) => f.file.name === name);
      if (r) URL.revokeObjectURL(r.preview);
      return prev.filter((f) => f.file.name !== name);
    });

  const toggleInstr = (name: string) =>
    setFiles((prev) => prev.map((f) =>
      f.file.name === name ? { ...f, showInstructions: !f.showInstructions } : f
    ));

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={cn('space-y-3', className)}>

      {/* ── Dropzone ──────────────────────────────────────────────────────── */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-gray-600 hover:border-gray-400 bg-gray-800/50 hover:bg-gray-800'
        )}
      >
        <input {...getInputProps()} />
        <Upload className={cn('w-8 h-8 mx-auto mb-2 transition-colors', isDragActive ? 'text-blue-400' : 'text-gray-500')} />
        <p className="text-sm font-medium text-gray-200 mb-1">
          {isDragActive ? 'Suelta aquí' : 'Arrastra tus fotos 360°'}
        </p>
        <p className="text-xs text-gray-500 mb-3">
          JPEG · PNG · WebP · <span className="text-orange-400 font-medium">.insp</span> (Insta360) — Máx. {maxFiles}
        </p>

        {/* Camera brand pills */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {[
            { label: 'Insta360 X4',  cls: 'bg-orange-900/40 text-orange-300 border-orange-800/60' },
            { label: 'DJI Mini 3',   cls: 'bg-sky-900/40    text-sky-300    border-sky-800/60'    },
            { label: 'Ricoh Theta',  cls: 'bg-purple-900/40 text-purple-300 border-purple-800/60' },
            { label: 'GoPro Max',    cls: 'bg-blue-900/40   text-blue-300   border-blue-800/60'   },
          ].map((b) => (
            <span key={b.label} className={cn('px-2 py-0.5 rounded-full text-[10px] border', b.cls)}>
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Camera guide toggle ────────────────────────────────────────────── */}
      <button
        onClick={() => setShowGuide((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          ¿Cómo exportar desde mi cámara?
        </span>
        {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* ── Camera guide panel ────────────────────────────────────────────── */}
      {showGuide && (
        <div className="space-y-3 px-1">
          {CAMERA_GUIDES.map((g) => (
            <div key={g.brand} className="p-3 rounded-xl bg-gray-800/40 border border-gray-700/40 space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', g.dot)} />
                <span className={cn('text-xs font-semibold', g.color)}>{g.brand}</span>
              </div>
              <ol className="space-y-1 pl-4">
                {g.steps.map((step, i) => (
                  <li key={i} className="text-xs text-gray-400 list-decimal">{step}</li>
                ))}
              </ol>
              <p className={cn('text-[11px] font-medium', g.noteColor)}>{g.note}</p>
            </div>
          ))}
          <p className="text-[11px] text-gray-600 text-center pb-1">
            Imágenes &gt;8192px se optimizan automáticamente para web (sin pérdida visible)
          </p>
        </div>
      )}

      {/* ── File list ─────────────────────────────────────────────────────── */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((item) => (
            <li key={item.file.name} className="rounded-xl bg-gray-800 border border-gray-700 overflow-hidden">

              {/* Main row */}
              <div className="flex items-center gap-2.5 p-2">
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-12 h-6 object-cover rounded flex-shrink-0 bg-gray-900"
                />

                {/* Name + info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-200 truncate">{item.file.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <StatusLabel status={item.status} />

                    {/* Resolution badge */}
                    {item.formatInfo?.width && item.status !== 'error' && (
                      <span className="text-[10px] text-gray-600 font-mono">
                        {item.formatInfo.width}×{item.formatInfo.height}
                      </span>
                    )}

                    {/* Camera brand */}
                    {item.formatInfo?.cameraBrand && item.status === 'ready' && (
                      <span className="text-[10px] text-gray-500">
                        {getCameraLabel(item.formatInfo.cameraBrand)}
                      </span>
                    )}

                    {/* Action badges */}
                    {item.status === 'ready' && item.convResult && item.formatInfo && (
                      getActionBadges(item.convResult, item.formatInfo).map((badge) => (
                        <span key={badge} className="text-[10px] text-amber-400">{badge}</span>
                      ))
                    )}

                    {/* Error message */}
                    {item.status === 'error' && item.error && (
                      <span className="text-[10px] text-red-400 truncate max-w-[140px]">{item.error}</span>
                    )}
                  </div>
                </div>

                {/* Progress % */}
                {item.status === 'uploading' && item.uploadProgress != null && (
                  <span className="text-[10px] text-blue-400 font-mono flex-shrink-0">
                    {item.uploadProgress.toFixed(0)}%
                  </span>
                )}

                {/* Status icon */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {item.status === 'detecting'  && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
                  {item.status === 'converting' && <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                  {item.status === 'uploading'  && <Cloud className="w-3.5 h-3.5 text-blue-400 animate-pulse" />}
                  {item.status === 'ready'      && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                  {item.status === 'error'      && (
                    <button
                      onClick={() => toggleInstr(item.file.name)}
                      className="flex items-center gap-0.5 text-red-400 hover:text-red-300"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {item.showInstructions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeFile(item.file.name)}
                  className="flex-shrink-0 p-0.5 rounded hover:bg-gray-700 text-gray-600 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Upload progress bar */}
              {item.status === 'uploading' && item.uploadProgress != null && (
                <div className="h-0.5 bg-gray-700">
                  <div className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${item.uploadProgress}%` }} />
                </div>
              )}

              {/* Converting bar (indeterminate) */}
              {item.status === 'converting' && (
                <div className="h-0.5 bg-gray-700 overflow-hidden">
                  <div className="h-full w-1/3 bg-amber-500 rounded-full animate-[slide_1.2s_ease-in-out_infinite]" />
                </div>
              )}

              {/* Instructions for unsupported formats */}
              {item.status === 'error' && item.showInstructions && (
                <InstructionPanel
                  ext={(item.formatInfo?.ext ?? item.file.name.split('.').pop() ?? '').toLowerCase()}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusLabel({ status }: { status: FileStatus }) {
  const map: Record<FileStatus, { text: string; cls: string }> = {
    pending:    { text: 'En espera',     cls: 'text-gray-500'  },
    detecting:  { text: 'Detectando…',  cls: 'text-gray-400'  },
    converting: { text: 'Convirtiendo…', cls: 'text-amber-400' },
    uploading:  { text: 'Subiendo…',    cls: 'text-blue-400'  },
    ready:      { text: 'Listo',         cls: 'text-green-400' },
    error:      { text: 'Error',         cls: 'text-red-400'   },
  };
  const { text, cls } = map[status];
  return <span className={cn('text-[10px] font-semibold', cls)}>{text}</span>;
}

function InstructionPanel({ ext }: { ext: string }) {
  const key =
    RAW_EXTS.has(ext) ? 'dng' :
    (ext === 'heic' || ext === 'heif') ? 'heic' :
    ext in FORMAT_INSTRUCTIONS ? ext : null;

  if (!key) {
    return (
      <div className="px-3 pb-3 pt-2 border-t border-gray-700/50">
        <p className="text-xs text-gray-500">
          Formato <span className="font-mono text-gray-400">.{ext}</span> no soportado.
          Exporta tu panorámica como JPEG equirectangular (2:1) desde la app de tu cámara.
        </p>
      </div>
    );
  }

  const instr = FORMAT_INSTRUCTIONS[key];
  return (
    <div className="px-3 pb-3 pt-2 space-y-2 border-t border-gray-700/50">
      <p className="text-xs font-semibold text-gray-300">{instr.title}</p>
      <ol className="space-y-1.5">
        {instr.steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-xs text-gray-400 items-start">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-700 text-gray-300
                             flex items-center justify-center text-[10px] font-bold mt-px">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {instr.appUrl && (
        <a href={instr.appUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
          <ExternalLink className="w-3 h-3" />
          Descargar {instr.brand}
        </a>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RAW_EXTS = new Set(['dng','arw','cr2','cr3','nef','orf','raf','rw2','raw','rwl','pef','srw','x3f']);

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
