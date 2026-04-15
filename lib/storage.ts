import { getSupabase, BUCKET_SCENES, BUCKET_ASSETS, BUCKET_THUMBS } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  path: string;
}

export class StorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

// ─── Generic file upload ──────────────────────────────────────────────────────

async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  contentType?: string
): Promise<UploadResult> {
  const { data, error } = await getSupabase().storage
    .from(bucket)
    .upload(path, file, {
      contentType: contentType ?? (file instanceof File ? file.type : 'application/octet-stream'),
      upsert: false,
    });

  if (error) throw new StorageError(`Upload failed: ${error.message}`, error);

  const { data: urlData } = getSupabase().storage.from(bucket).getPublicUrl(data.path);
  return { url: urlData.publicUrl, path: data.path };
}

// ─── Upload a 360° scene image ────────────────────────────────────────────────

/**
 * Upload an equirectangular image file.
 * Returns the permanent public URL to store in the Tour/Scene.
 */
export async function uploadSceneImage(
  tourId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `${tourId}/${uuidv4()}.${ext}`;

  // Supabase JS v2 doesn't expose XHR progress, so we simulate via two-step for UX
  onProgress?.(10);
  const result = await uploadFile(BUCKET_SCENES, path, file);
  onProgress?.(100);

  return result;
}

/**
 * Upload a dataURL (e.g. from Canvas / nadir-patched image) as a scene image.
 */
export async function uploadSceneDataUrl(
  tourId: string,
  dataUrl: string,
  ext: 'jpg' | 'png' = 'jpg'
): Promise<UploadResult> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${tourId}/${uuidv4()}.${ext}`;
  return uploadFile(BUCKET_SCENES, path, blob, ext === 'jpg' ? 'image/jpeg' : 'image/png');
}

// ─── Upload an asset (logo, media file) ──────────────────────────────────────

export async function uploadAsset(tourId: string, file: File): Promise<UploadResult> {
  const ext  = file.name.split('.').pop() ?? 'bin';
  const path = `${tourId}/${uuidv4()}.${ext}`;
  return uploadFile(BUCKET_ASSETS, path, file);
}

// ─── Upload a generated thumbnail ────────────────────────────────────────────

export async function uploadThumbnail(tourId: string, dataUrl: string): Promise<UploadResult> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${tourId}/${uuidv4()}.jpg`;
  return uploadFile(BUCKET_THUMBS, path, blob, 'image/jpeg');
}

// ─── Generate a thumbnail from a scene image dataURL ─────────────────────────

export function generateThumbnail(imageDataUrl: string, width = 320, height = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}

// ─── Delete a file from storage ───────────────────────────────────────────────

export async function deleteStorageFile(bucket: string, path: string): Promise<void> {
  const { error } = await getSupabase().storage.from(bucket).remove([path]);
  if (error) throw new StorageError(`Delete failed: ${error.message}`, error);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
