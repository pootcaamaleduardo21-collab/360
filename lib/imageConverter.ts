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
  | 'convert-jpeg'     // Re-encode to JPEG (PNG/WebP input) — also used for .insp to force .jpg upload
  | 'pad-to-2-1'       // Close to 2:1, add black padding
  | 'pad-and-convert'  // Both pad + re-encode
  | 'stitch-fisheye'   // Dual-fisheye .insp → equirectangular via equidistant projection
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
  insp: {
    brand: 'Insta360',
    title: 'Foto Insta360 RAW (.insp) — Requiere procesamiento',
    steps: [
      'Abre Insta360 Studio en tu PC o Mac (gratis)',
      'Importa el archivo .insp',
      'Haz clic en "Export" → selecciona "360 Photo" → JPEG',
      'Sube aquí el JPEG exportado (ya equirectangular)',
    ],
    appUrl: 'https://www.insta360.com/download/type/studio',
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

  // ── Insta360 .insp — two distinct variants ──────────────────────────────
  //
  //  1. In-camera stitched equirectangular (X3/X4 standard photo mode):
  //     XMP contains ProjectionType=equirectangular / UsePanoramaViewer=True.
  //     Action: convert-jpeg to force a proper .jpg upload (Supabase rejects .insp).
  //
  //  2. Dual-fisheye RAW (certain modes / older models):
  //     No equirectangular XMP tag — two circular fisheye images side-by-side.
  //     Action: stitch-fisheye — equidistant projection stitcher in-browser.
  //
  if (ext === 'insp') {
    if (markedEquirectangular) {
      // ── Equirectangular .insp ─────────────────────────────────────────
      const needsOptimization = width > MAX_WEB_WIDTH;
      // Always re-encode so the upload goes through as .jpg (not .insp)
      const action: ConversionAction = needsOptimization ? 'optimize-only' : 'convert-jpeg';
      return {
        ext, mime, width, height, aspectRatio: ratio,
        isEquirectangular: true, canConvert: true, action,
        cameraBrand: 'insta360', markedEquirectangular: true,
        needsOptimization,
        issueMessage: needsOptimization
          ? `${width}×${height}px → optimizado a ${MAX_WEB_WIDTH}×${MAX_WEB_WIDTH / 2}px.`
          : undefined,
      };
    } else {
      // ── Dual-fisheye .insp — stitch in-browser ────────────────────────
      const outW = Math.min(width, 4096);
      const outH = outW / 2;
      return {
        ext, mime, width, height, aspectRatio: ratio,
        isEquirectangular: false, canConvert: true, action: 'stitch-fisheye',
        cameraBrand: 'insta360', markedEquirectangular: false,
        issueMessage: `Dual-fisheye detectado → convirtiendo a equirectangular ${outW}×${outH}px…`,
      };
    }
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
 * Handles: padding, JPEG re-encoding, downscaling, and dual-fisheye stitching.
 */
export async function convertToEquirectangularJpeg(
  file: File,
  info: FormatInfo,
  quality = 0.92,
): Promise<ConversionResult> {
  // ── Dual-fisheye stitching (Insta360 .insp without equirectangular XMP) ──
  if (info.action === 'stitch-fisheye') {
    return stitchDualFisheyeInsp(file, info.width ?? 4096, info.height ?? 2048, quality);
  }

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

// ─── Dual-fisheye stitcher ────────────────────────────────────────────────────

/**
 * Convert an Insta360 dual-fisheye .insp to equirectangular JPEG using an
 * equidistant fisheye projection.
 *
 * Layout assumed (Insta360 X3/X4 dual-fisheye):
 *   Left  half (x ∈ [0, W/2])  → back-facing  lens (optical axis −Z)
 *   Right half (x ∈ [W/2, W])  → front-facing lens (optical axis +Z)
 *
 * Each circle has FOV ≈ 200° (100° from optical axis).
 * Output is capped at 4096×2048 for browser performance.
 */
async function stitchDualFisheyeInsp(
  file: File,
  srcW: number,
  srcH: number,
  quality: number,
): Promise<ConversionResult> {
  // Cap output resolution for browser performance (pixel ops)
  const outW = Math.min(4096, srcW);
  const outH = outW / 2;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      try {
        // ── 1. Downsample source onto an offscreen canvas ────────────────
        const srcCanvas = document.createElement('canvas');
        // Work at half source resolution to reduce memory footprint
        const workW = Math.min(srcW, 4096);
        const workH = Math.round(srcH * (workW / srcW));
        srcCanvas.width  = workW;
        srcCanvas.height = workH;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
        srcCtx.drawImage(img, 0, 0, workW, workH);
        const srcData = srcCtx.getImageData(0, 0, workW, workH).data;

        // ── 2. Fisheye geometry ──────────────────────────────────────────
        const halfW  = workW / 2;
        const radius = workH / 2;            // circle radius in source pixels
        const FOV_HALF = Math.PI * 100 / 180; // 100° from optical axis → 200° total

        // Circle centers in source coords
        const cxBack  = halfW / 2;            // left  circle (back  lens)
        const cxFront = halfW + halfW / 2;    // right circle (front lens)
        const cy      = workH / 2;

        // ── 3. Allocate output ───────────────────────────────────────────
        const outCanvas = document.createElement('canvas');
        outCanvas.width  = outW;
        outCanvas.height = outH;
        const outCtx  = outCanvas.getContext('2d')!;
        const outImg  = outCtx.createImageData(outW, outH);
        const out     = outImg.data;

        // ── 4. Pixel-by-pixel equirectangular → fisheye projection ───────
        for (let oy = 0; oy < outH; oy++) {
          // pitch: top row = +90°, bottom = −90°
          const pitch    = (0.5 - (oy + 0.5) / outH) * Math.PI;
          const cosPitch = Math.cos(pitch);
          const sinPitch = Math.sin(pitch);

          for (let ox = 0; ox < outW; ox++) {
            // yaw: left = −180°, right = +180°
            const yaw = ((ox + 0.5) / outW - 0.5) * 2 * Math.PI;

            // 3-D unit vector on the sphere
            const vx = cosPitch * Math.sin(yaw);
            const vy = sinPitch;
            const vz = cosPitch * Math.cos(yaw);

            let sx: number, sy: number;

            if (vz >= 0) {
              // Front-facing lens (right circle) — optical axis = +Z
              const theta = Math.acos(Math.min(1, vz));
              if (theta > FOV_HALF) {
                // Outside lens FOV — black pixel (seam / overlap gap)
                const oi = (oy * outW + ox) * 4;
                out[oi + 3] = 255;
                continue;
              }
              const phi = Math.atan2(vy, vx);
              const r   = (theta / FOV_HALF) * radius;
              sx = cxFront + r * Math.cos(phi);
              sy = cy      - r * Math.sin(phi); // canvas Y is flipped
            } else {
              // Back-facing lens (left circle) — optical axis = −Z
              const theta = Math.acos(Math.min(1, -vz));
              if (theta > FOV_HALF) {
                const oi = (oy * outW + ox) * 4;
                out[oi + 3] = 255;
                continue;
              }
              // Mirror X for back lens so East/West stay correct
              const phi = Math.atan2(vy, -vx);
              const r   = (theta / FOV_HALF) * radius;
              sx = cxBack + r * Math.cos(phi);
              sy = cy     - r * Math.sin(phi);
            }

            // ── 5. Bilinear sample from source ──────────────────────────
            const x0 = Math.floor(Math.max(0, Math.min(workW - 2, sx)));
            const y0 = Math.floor(Math.max(0, Math.min(workH - 2, sy)));
            const fx = sx - x0;
            const fy = sy - y0;

            const i00 = (y0 * workW + x0) * 4;
            const i10 = (y0 * workW + x0 + 1) * 4;
            const i01 = ((y0 + 1) * workW + x0) * 4;
            const i11 = ((y0 + 1) * workW + x0 + 1) * 4;
            const oi  = (oy * outW + ox) * 4;

            const w00 = (1 - fx) * (1 - fy);
            const w10 = fx       * (1 - fy);
            const w01 = (1 - fx) * fy;
            const w11 = fx       * fy;

            out[oi    ] = (srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11) | 0;
            out[oi + 1] = (srcData[i00 + 1] * w00 + srcData[i10 + 1] * w10 + srcData[i01 + 1] * w01 + srcData[i11 + 1] * w11) | 0;
            out[oi + 2] = (srcData[i00 + 2] * w00 + srcData[i10 + 2] * w10 + srcData[i01 + 2] * w01 + srcData[i11 + 2] * w11) | 0;
            out[oi + 3] = 255;
          }
        }

        outCtx.putImageData(outImg, 0, 0);
        outCanvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Error al generar el panorama')); return; }
            resolve({
              blob,
              width: outW, height: outH,
              wasPadded: false, wasConverted: true, wasOptimized: srcW > outW,
              originalWidth: srcW, originalHeight: srcH,
            });
          },
          'image/jpeg',
          quality,
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar el archivo .insp')); };
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
  if (info.action === 'stitch-fisheye') {
    badges.push('Dual-fisheye → Equirectangular ✓');
    if (result.wasOptimized) badges.push(`${result.width}px`);
    return badges;
  }
  if (info.action === 'use-as-is' && !result.wasOptimized) return ['Equirectangular ✓'];
  if (info.action === 'convert-jpeg' && info.ext === 'insp' && !result.wasPadded && !result.wasOptimized) return ['.insp → JPEG ✓'];
  if (result.wasPadded)    badges.push('Ajustado 2:1');
  if (result.wasConverted && !result.wasPadded) badges.push('→ JPEG');
  if (result.wasOptimized) badges.push(`Optimizado ${result.width}px`);
  return badges.length ? badges : ['Procesado ✓'];
}
