/**
 * imageConverter.ts — Multi-format detection and conversion for 360° images.
 *
 * Pipeline decisions:
 *   .insp (Insta360 X4/X3) → equirectangular JPEG, optimize if >8192px
 *   JPEG/PNG/WebP 2:1      → optimize if >8192px, convert to JPEG if needed
 *   JPEG/PNG/WebP ~2:1     → pad to 2:1, optimize, convert to JPEG if needed
 *   DJI sphere JPEG        → already equirectangular, optimize if needed
 *   INSV, .360, RAW, HEIC  → unsupported with step-by-step instructions
 *
 * Max output width: MAX_WEB_WIDTH (8192px) — WebGL texture limit on most GPUs.
 * Images wider than this are downscaled automatically (no visible quality loss).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum texture width safe for WebGL on most GPUs (8192×4096) */
export const MAX_WEB_WIDTH = 8192;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CameraBrand = 'insta360' | 'dji' | 'ricoh' | 'gopro' | 'generic';

export type ConversionAction =
  | 'use-as-is'        // Already equirectangular, within web size limit
  | 'optimize-only'    // Correct ratio, but needs downscaling (e.g. 72MP → 8192px)
  | 'convert-jpeg'     // Re-encode to JPEG (PNG/WebP input)
  | 'pad-to-2-1'       // Close to 2:1, add black padding
  | 'pad-and-convert'  // Both pad + re-encode
  | 'unsupported';     // Cannot convert — show instructions

export interface FormatInfo {
  ext: string;
  mime: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  isEquirectangular: boolean;
  canConvert: boolean;
  action: ConversionAction;
  cameraBrand?: CameraBrand;
  /** True if XMP metadata explicitly flags ProjectionType=equirectangular */
  markedEquirectangular: boolean;
  /** Set when image exceeds MAX_WEB_WIDTH */
  needsOptimization?: boolean;
  issueMessage?: string;
}

export interface ConversionResult {
  blob: Blob;
  width: number;
  height: number;
  wasPadded: boolean;
  wasConverted: boolean;
  /** True if the image was downscaled to fit MAX_WEB_WIDTH */
  wasOptimized: boolean;
  originalWidth?: number;
  originalHeight?: number;
}

// ─── Camera instructions for unsupported formats ──────────────────────────────

export interface CameraInstructions {
  brand: string;
  title: string;
  steps: string[];
  appUrl?: string;
}

export const FORMAT_INSTRUCTIONS: Record<string, CameraInstructions> = {
  insv: {
    brand: 'Insta360',
    title: 'Video Insta360 (.insv) — Solo se soportan fotos',
    steps: [
      'Para fotos 360°, usa el modo foto de tu cámara Insta360',
      'Conecta la cámara a tu teléfono con la app Insta360',
      'Exporta la foto como JPEG desde la app',
      'Sube aquí el archivo .insp o el JPEG exportado',
    ],
    appUrl: 'https://www.insta360.com/download',
  },
  '360': {
    brand: 'GoPro Max',
    title: 'Archivo GoPro Max (.360) — Solo se soportan fotos',
    steps: [
      'Abre GoPro Player para Mac o PC (gratis)',
      'Importa el archivo .360',
      'Menú Archivo → Exportar → Foto esférica JPEG',
      'Sube aquí el JPEG exportado',
    ],
    appUrl: 'https://community.gopro.com/s/article/GoPro-Player',
  },
  dng: {
    brand: 'RAW',
    title: 'Imagen RAW (DNG/ARW/CR2…) — Necesita convertirse',
    steps: [
      'Abre en Lightroom, Capture One o Adobe Camera Raw',
      'Exportar → Formato: JPEG, Calidad: 90–100%',
      'Verifica que sea la panorámica completa (relación 2:1)',
      'Sube aquí el JPEG exportado',
    ],
  },
  heic: {
    brand: 'iPhone / Apple',
    title: 'Formato HEIC (iPhone) — Convierte a JPEG primero',
    steps: [
      'Mac: abre en Vista previa → Archivo → Exportar → JPEG',
      'iPhone: Ajustes → Cámara → Formatos → "Compatible" (activa JPEG nativo)',
      'Alternativa rápida: cloudconvert.com/heic-to-jpg',
    ],
  },
};

// ─── Known unsupported RAW extensions ─────────────────────────────────────────

const RAW_EXTENSIONS = new Set([
  'dng', 'arw', 'cr2', 'cr3', 'nef', 'orf', 'raf',
  'rw2', 'raw', 'rwl', 'pef', 'srw', 'x3f',
]);

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function readFileHeader(file: File, bytes = 65536): Promise<string> {
  const chunk = file.slice(0, bytes);
  const buffer = await chunk.arrayBuffer();
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
}

function parseXmp(text: string, ext: string): {
  cameraBrand?: CameraBrand;
  markedEquirectangular: boolean;
} {
  const lo = text.toLowerCase();
  const markedEquirectangular =
    lo.includes('projectiontype>equirectangular') ||
    lo.includes('projectiontype="equirectangular') ||
    lo.includes("projectiontype='equirectangular") ||
    lo.includes('usepanoramaviewer>true') ||
    lo.includes('croppedareaimagewidthpixels'); // Google Photosphere

  let cameraBrand: CameraBrand | undefined;
  if (ext === 'insp' || lo.includes('insta360'))       cameraBrand = 'insta360';
  else if (lo.includes('dji panorama') || lo.includes('dji:') || lo.includes('make>dji')) cameraBrand = 'dji';
  else if (lo.includes('ricoh') || lo.includes('theta'))   cameraBrand = 'ricoh';
  else if (lo.includes('gopro'))                            cameraBrand = 'gopro';

  return { cameraBrand, markedEquirectangular };
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo decodificar la imagen')); };
    img.src = url;
  });
}

// ─── Main detection ───────────────────────────────────────────────────────────

export async function detectFormat(file: File): Promise<FormatInfo> {
  const ext  = (file.name.split('.').pop() ?? '').toLowerCase();
  const mime = file.type.toLowerCase();

  // ── Hard-unsupported ────────────────────────────────────────────────────

  if (ext === 'insv') {
    return {
      ext, mime, isEquirectangular: false, canConvert: false,
      action: 'unsupported', markedEquirectangular: false,
      issueMessage: 'Video Insta360 (.insv). Solo se soportan fotos (.insp o JPEG).',
    };
  }
  if (ext === '360') {
    return {
      ext, mime, isEquirectangular: false, canConvert: false,
      action: 'unsupported', markedEquirectangular: false,
      issueMessage: 'Archivo GoPro Max (.360). Exporta la foto desde GoPro Player.',
    };
  }
  if (RAW_EXTENSIONS.has(ext)) {
    return {
      ext, mime, isEquirectangular: false, canConvert: false,
      action: 'unsupported', markedEquirectangular: false,
      issueMessage: 'Imagen RAW. Exporta como JPEG desde Lightroom o Camera Raw.',
    };
  }
  if (ext === 'heic' || ext === 'heif' || mime === 'image/heic' || mime === 'image/heif') {
    return {
      ext, mime, isEquirectangular: false, canConvert: false,
      action: 'unsupported', markedEquirectangular: false,
      issueMessage: 'Formato HEIC (iPhone). Convierte a JPEG primero.',
    };
  }

  // ── Read XMP metadata ───────────────────────────────────────────────────

  const headerText = await readFileHeader(file);
  const { cameraBrand, markedEquirectangular } = parseXmp(headerText, ext);

  // ── Load dimensions ─────────────────────────────────────────────────────

  let width: number, height: number;
  try {
    ({ width, height } = await getImageDimensions(file));
  } catch {
    return {
      ext, mime, isEquirectangular: false, canConvert: false,
      action: 'unsupported', cameraBrand, markedEquirectangular,
      issueMessage: 'No se pudo leer la imagen. Verifica que el archivo no esté dañado.',
    };
  }

  const ratio = width / height;

  // ── Insta360 X4 / X3 .insp — in-camera stitched equirectangular ─────────
  // .insp from X3/X4 IS equirectangular. Treat as JPEG and optimize if >8192px.
  if (ext === 'insp') {
    const needsOptimization = width > MAX_WEB_WIDTH;
    const action: ConversionAction = needsOptimization ? 'optimize-only' : 'use-as-is';
    const msg = needsOptimization
      ? `${width}×${height}px (${Math.round(width * height / 1_000_000)}MP) → optimizado a ${MAX_WEB_WIDTH}×${MAX_WEB_WIDTH / 2}px para web.`
      : undefined;
    return {
      ext, mime, width, height, aspectRatio: ratio,
      isEquirectangular: true, canConvert: true, action,
      cameraBrand: 'insta360', markedEquirectangular: true,
      needsOptimization, issueMessage: msg,
    };
  }

  // ── Evaluate aspect ratio ────────────────────────────────────────────────

  const isExact  = Math.abs(ratio - 2) <= 0.06;  // ±3% → 1.94–2.06
  const isClose  = ratio >= 1.65 && ratio <= 2.35; // ±17.5% — covers DJI/GoPro slight variance
  const needsJpeg = mime === 'image/png' || mime === 'image/webp' || ext === 'png' || ext === 'webp';
  const needsOptimization = width > MAX_WEB_WIDTH;
  const isEquirectangular = isExact || (markedEquirectangular && isClose);

  let action: ConversionAction;
  let issueMessage: string | undefined;

  if (isExact && !needsJpeg && !needsOptimization) {
    action = 'use-as-is';
  } else if (isExact && !needsJpeg && needsOptimization) {
    action = 'optimize-only';
    issueMessage = `${width}×${height}px → optimizado a ${MAX_WEB_WIDTH}×${MAX_WEB_WIDTH / 2}px para web.`;
  } else if (isExact && needsJpeg) {
    action = 'convert-jpeg';
    if (needsOptimization) issueMessage = `PNG/WebP → JPEG + optimizado a ${MAX_WEB_WIDTH}px.`;
  } else if (isClose && !needsJpeg) {
    action = 'pad-to-2-1';
    issueMessage = `Relación ${ratio.toFixed(2)}:1 → barras negras al ${ratio > 2 ? 'top/bottom' : 'lados'} para llegar a 2:1.`;
  } else if (isClose && needsJpeg) {
    action = 'pad-and-convert';
    issueMessage = `Relación ${ratio.toFixed(2)}:1 → convertido a JPEG y ajustado a 2:1.`;
  } else {
    action = 'unsupported';
    issueMessage = `Relación ${ratio.toFixed(2)}:1 — se requiere imagen equirectangular (2:1). Esta imagen mide ${width}×${height}px.`;
  }

  return {
    ext, mime, width, height, aspectRatio: ratio,
    isEquirectangular,
    canConvert: action !== 'unsupported',
    action, cameraBrand, markedEquirectangular,
    needsOptimization,
    issueMessage,
  };
}

// ─── Conversion + optimization pipeline ──────────────────────────────────────

/**
 * Convert a renderable image to an equirectangular JPEG optimized for web.
 * Handles: padding, JPEG re-encoding, and downscaling to MAX_WEB_WIDTH.
 */
export async function convertToEquirectangularJpeg(
  file: File,
  info: FormatInfo,
  quality = 0.92,
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;

      // ── 1. Determine canvas size (padding logic) ───────────────────────

      let canvasW: number;
      let canvasH: number;
      let drawX: number, drawY: number, drawW: number, drawH: number;
      let wasPadded = false;

      const needsPad = info.action === 'pad-to-2-1' || info.action === 'pad-and-convert';

      if (!needsPad) {
        canvasW = srcW;
        canvasH = srcH;
        drawX = 0; drawY = 0; drawW = srcW; drawH = srcH;
      } else {
        wasPadded = true;
        const ratio = srcW / srcH;
        if (ratio > 2) {
          canvasW = srcW;
          canvasH = Math.round(srcW / 2);
        } else {
          canvasH = srcH;
          canvasW = srcH * 2;
        }
        // Fit image inside canvas preserving aspect ratio
        const scale = Math.min(canvasW / srcW, canvasH / srcH);
        drawW = Math.round(srcW * scale);
        drawH = Math.round(srcH * scale);
        drawX = Math.round((canvasW - drawW) / 2);
        drawY = Math.round((canvasH - drawH) / 2);
      }

      // ── 2. Apply max-width optimization ───────────────────────────────

      let wasOptimized = false;
      const originalWidth  = canvasW;
      const originalHeight = canvasH;

      if (canvasW > MAX_WEB_WIDTH) {
        wasOptimized = true;
        const scale  = MAX_WEB_WIDTH / canvasW;
        drawW  = Math.round(drawW  * scale);
        drawH  = Math.round(drawH  * scale);
        drawX  = Math.round(drawX  * scale);
        drawY  = Math.round(drawY  * scale);
        canvasW = MAX_WEB_WIDTH;
        canvasH = MAX_WEB_WIDTH / 2;
      }

      // ── 3. Draw on canvas ──────────────────────────────────────────────

      const canvas = document.createElement('canvas');
      canvas.width  = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Error al generar la imagen')); return; }
          resolve({
            blob,
            width:  canvasW,
            height: canvasH,
            wasPadded,
            wasConverted: info.action !== 'use-as-is',
            wasOptimized,
            originalWidth,
            originalHeight,
          });
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen para convertir'));
    };

    img.src = url;
  });
}

// ─── UI label helpers ─────────────────────────────────────────────────────────

export function getCameraLabel(brand: CameraBrand | undefined): string {
  switch (brand) {
    case 'insta360': return 'Insta360';
    case 'dji':      return 'DJI';
    case 'ricoh':    return 'Ricoh Theta';
    case 'gopro':    return 'GoPro';
    default:         return '';
  }
}

export function getActionBadges(result: ConversionResult, info: FormatInfo): string[] {
  const badges: string[] = [];
  if (info.action === 'use-as-is' && !result.wasOptimized) return ['Equirectangular ✓'];
  if (result.wasPadded)    badges.push('Ajustado 2:1');
  if (result.wasConverted && !result.wasPadded) badges.push('→ JPEG');
  if (result.wasOptimized) badges.push(`Optimizado ${result.width}px`);
  return badges.length ? badges : ['Procesado ✓'];
}
