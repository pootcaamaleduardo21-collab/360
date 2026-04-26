/**
 * Nadir Patch — Canvas API
 *
 * An equirectangular image maps the sphere's south pole (nadir) to the
 * bottom-center strip: x ∈ [0, W], y ∈ [H * 0.85, H].
 *
 * We composite a circular logo there so the tripod/photographer is hidden.
 */

export interface NadirPatchOptions {
  /** Equirectangular image as dataURL or HTMLImageElement */
  source: string | HTMLImageElement;
  /** Logo image as dataURL or HTMLImageElement */
  logo: string | HTMLImageElement;
  /**
   * Radius of the patch as a fraction of image height (default 0.08 = 8%).
   * A value of 0.08 on a 6000-px-tall image → 480 px radius circle.
   */
  radiusFraction?: number;
  /** Fill color behind the logo (default '#ffffff') */
  fillColor?: string;
  /** Logo occupies this fraction of the circle diameter (default 0.65) */
  logoScale?: number;
  /** Output quality for JPEG (0–1, default 0.92) */
  quality?: number;
  /** Output format (default 'image/jpeg') */
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface NadirPatchResult {
  dataUrl: string;
  width: number;
  height: number;
}

/** Load an image from a dataURL or remote URL. Always sets crossOrigin to avoid tainted-canvas errors. */
function loadImage(src: string | HTMLImageElement): Promise<HTMLImageElement> {
  if (src instanceof HTMLImageElement && src.complete && src.naturalWidth > 0) {
    return Promise.resolve(src);
  }
  return new Promise((resolve, reject) => {
    const img = src instanceof HTMLImageElement ? src : new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${typeof src === 'string' ? src : 'elemento'}`));
    if (typeof src === 'string') img.src = src;
  });
}

/**
 * Apply a circular nadir patch to an equirectangular image.
 * Returns the composited image as a dataURL.
 */
export async function applyNadirPatch(options: NadirPatchOptions): Promise<NadirPatchResult> {
  const {
    source,
    logo,
    radiusFraction = 0.08,
    fillColor      = '#ffffff',
    logoScale      = 0.65,
    quality        = 0.92,
    format         = 'image/jpeg',
  } = options;

  const [baseImg, logoImg] = await Promise.all([
    loadImage(source),
    loadImage(logo),
  ]);

  const W = baseImg.naturalWidth;
  const H = baseImg.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d')!;

  // 1. Draw the equirectangular base image
  ctx.drawImage(baseImg, 0, 0, W, H);

  // 2. Compute patch geometry
  //    Nadir center in equirectangular: (W/2, H) — very bottom center
  const cx = W / 2;
  const cy = H;               // nadir is at y = H (bottom edge)
  const r  = H * radiusFraction;

  // 3. Draw a soft-edged circular background
  //    We position the circle so its center sits at cy - r (the patch sits above the bottom edge)
  const patchCy = cy - r * 0.4; // slight offset so patch bleeds into bottom

  // Radial gradient for a soft edge
  const gradient = ctx.createRadialGradient(cx, patchCy, r * 0.6, cx, patchCy, r);
  gradient.addColorStop(0, fillColor + 'ff');
  gradient.addColorStop(0.7, fillColor + 'ee');
  gradient.addColorStop(1, fillColor + '00');

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, patchCy, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  // 4. Draw the logo centered inside the patch
  const logoSize = r * 2 * logoScale;
  const logoX    = cx - logoSize / 2;
  const logoY    = patchCy - logoSize / 2;

  // Clip to a circle while drawing the logo
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, patchCy, r * 0.85, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
  ctx.restore();

  // 5. Stroke a subtle border ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, patchCy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.restore();

  return {
    dataUrl: canvas.toDataURL(format, quality),
    width:   W,
    height:  H,
  };
}

/**
 * Remove an existing nadir patch by restoring the bottom-center area
 * with a simple black fill (useful when switching logos).
 * Note: this is destructive — the original tripod area won't be recovered.
 */
export async function clearNadirArea(
  source: string | HTMLImageElement,
  radiusFraction = 0.08
): Promise<string> {
  const img = await loadImage(source);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, W, H);

  const r  = H * radiusFraction;
  const cx = W / 2;
  const cy = H - r * 0.4;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}
