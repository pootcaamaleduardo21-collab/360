'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readFileAsDataURL, createObjectURL } from '@/lib/utils';
import { uploadSceneImage, generateThumbnail, uploadThumbnail } from '@/lib/storage';
import { useTourStore } from '@/store/tourStore';

interface ImageUploaderProps {
  onImagesReady: (files: Array<{ name: string; url: string; thumbnailUrl?: string }>) => void;
  maxFiles?: number;
  className?: string;
}

interface FileItem {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  uploadProgress?: number;
  error?: string;
}

/** Validate that an image has a 2:1 aspect ratio (equirectangular) */
async function validateEquirectangular(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(Math.abs(img.width / img.height - 2) < 0.05); // allow 5% tolerance
    };
    img.onerror = () => resolve(false);
    img.src = URL.createObjectURL(file);
  });
}

export function ImageUploader({ onImagesReady, maxFiles = 20, className }: ImageUploaderProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const tour = useTourStore((s) => s.tour);

  const setFileStatus = (name: string, patch: Partial<FileItem>) =>
    setFiles((prev) => prev.map((f) => (f.file.name === name ? { ...f, ...patch } : f)));

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const newItems: FileItem[] = accepted.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
      }));

      setFiles((prev) => [...prev, ...newItems].slice(0, maxFiles));

      // Process sequentially to avoid saturating bandwidth
      const ready: Array<{ name: string; url: string; thumbnailUrl?: string }> = [];

      for (const item of newItems) {
        setFileStatus(item.file.name, { status: 'uploading', uploadProgress: 5 });

        try {
          // 1. Validate 2:1 ratio
          const isValid = await validateEquirectangular(item.file);
          if (!isValid) {
            setFileStatus(item.file.name, { status: 'error', error: 'No es 2:1 (equirectangular)' });
            continue;
          }

          let url: string;
          let thumbnailUrl: string | undefined;

          if (tour?.id && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            // ── Upload to Supabase Storage ──────────────────────────────────
            setFileStatus(item.file.name, { uploadProgress: 20 });
            const result = await uploadSceneImage(tour.id, item.file, (pct) =>
              setFileStatus(item.file.name, { uploadProgress: 20 + pct * 0.6 })
            );
            url = result.url;

            // Generate + upload thumbnail
            setFileStatus(item.file.name, { uploadProgress: 85 });
            const dataUrl = await readFileAsDataURL(item.file);
            const thumbDataUrl = await generateThumbnail(dataUrl, 320, 160);
            const thumbResult  = await uploadThumbnail(tour.id, thumbDataUrl);
            thumbnailUrl = thumbResult.url;
          } else {
            // ── Fallback: use local dataURL (no Supabase configured) ────────
            const dataUrl = await readFileAsDataURL(item.file);
            url = dataUrl;
            thumbnailUrl = undefined;
          }

          setFileStatus(item.file.name, { status: 'ready', uploadProgress: 100 });
          ready.push({ name: item.file.name, url, thumbnailUrl });
        } catch (err) {
          console.error(err);
          setFileStatus(item.file.name, { status: 'error', error: 'Error al subir el archivo' });
        }
      }

      if (ready.length > 0) onImagesReady(ready);
    },
    [maxFiles, onImagesReady, tour]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles,
    multiple: true,
  });

  const removeFile = (name: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.file.name === name);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((f) => f.file.name !== name);
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-gray-600 hover:border-gray-400 bg-gray-800/50 hover:bg-gray-800'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          className={cn(
            'w-10 h-10 mx-auto mb-3 transition-colors',
            isDragActive ? 'text-blue-400' : 'text-gray-500'
          )}
        />
        <p className="text-sm font-medium text-gray-200 mb-1">
          {isDragActive ? 'Suelta las imágenes aquí' : 'Arrastra tus fotos 360° aquí'}
        </p>
        <p className="text-xs text-gray-500">
          JPEG, PNG o WebP · Relación 2:1 (equirectangular) · Máx. {maxFiles} archivos
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((item) => (
            <li
              key={item.file.name}
              className="flex items-center gap-3 p-2 rounded-xl bg-gray-800 border border-gray-700"
            >
              {/* Thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt={item.file.name}
                className="w-14 h-7 object-cover rounded-md flex-shrink-0"
              />

              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 truncate">{item.file.name}</p>
                {item.error && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" /> {item.error}
                  </p>
                )}
              </div>

              {/* Upload progress bar */}
              {item.status === 'uploading' && item.uploadProgress !== undefined && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${item.uploadProgress}%` }}
                  />
                </div>
              )}

              {/* Status icon */}
              <div className="flex-shrink-0">
                {item.status === 'uploading' && (
                  <div className="flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-blue-400" />
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {item.status === 'ready' && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFile(item.file.name)}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
