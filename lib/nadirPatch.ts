/**
 * Nadir Patch — spherical polar projection
 *
 * Uses pixel-by-pixel great-circle mapping so the logo renders as a
 * perfect circle when viewed from inside the 360° sphere, correcting
 * the teardrop distortion that a naive canvas arc() creates.
 */

export interface NadirPatchOptions {
  source: string | HTMLImageElement;
  logo:   string | HTMLImageElement;
  /**
   * Angular half-radius of the patch expressed as a fraction of π.
   * patch_angle_rad = radiusFraction * π
   * default 0.08 → ~14.4° from nadir
   */
  radiusFraction?: number;
  fillColor?:  string;   // disc background (default '#ffffff')
  logoScale?:  number;   // logo occupies this fraction of the disc diameter (default 0.65)
  quality?:    number;   // JPEG quality 0–1 (default 0.92)
  format?:    'image/jpeg' | 'image/png' | 'image/webp';
  /**
   * Horizontal rotation of the patch centre in degrees.
   * 0° = same longitude as the image centre (front direction), ±180° = back.
   */
  nadirYaw?:   number;
  /**
   * Lift the patch centre up from the nadir by this many degrees.
   * Use when the camera was slightly tilted and the tripod isn't perfectly
   * at the very bottom of the image.
   */
  nadirPitch?: number;
}

export interface NadirPatchResult {
  dataUrl: string;
  width:   number;
  height:  number;
}

function loadImage(src: string | HTMLImageElement): Promise<HTMLImageElement> {
  if (src instanceof HTMLImageElement && src.complete && src.naturalWidth > 0) {
    return Promise.resolve(src);
  }
  return new Promise((resolve, reject) => {
    const img = src instanceof HTMLImageElement ? src : new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    if (typeof src === 'string') img.src = src;
  });
}

const LOGO_RES = 512;

/**
 * Render the logo inside a circular disc at LOGO_RES × LOGO_RES.
 * The logo is contained (aspect-ratio preserved) and the canvas is
 * clipped to a circle so corners are transparent.
 */
function buildLogoDisc(
  logoImg:   HTMLImageElement,
  fillColor: string,
  logoScale: number,
): ImageData {
  const c   = document.createElement('canvas');
  c.width   = LOGO_RES;
  c.height  = LOGO_RES;
  const ctx = c.getContext('2d')!;

  // Filled circle
  ctx.beginPath();
  ctx.arc(LOGO_RES / 2, LOGO_RES / 2, LOGO_RES / 2, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Logo — contain fit
  const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
  const maxDim = LOGO_RES * logoScale;
  const lw = aspect >= 1 ? maxDim : maxDim * aspect;
  const lh = aspect >= 1 ? maxDim / aspect : maxDim;
  ctx.drawImage(logoImg, (LOGO_RES - lw) / 2, (LOGO_RES - lh) / 2, lw, lh);

  // Clip to circle
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(LOGO_RES / 2, LOGO_RES / 2, LOGO_RES / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  return ctx.getImageData(0, 0, LOGO_RES, LOGO_RES);
}

/**
 * Apply a nadir patch with proper spherical polar projection.
 * The result looks like a perfect circular disc in any 360° viewer.
 */
export async function applyNadirPatch(opts: NadirPatchOptions): Promise<NadirPatchResult> {
  const {
    source,
    logo,
    radiusFraction = 0.08,
    fillColor      = '#ffffff',
    logoScale      = 0.65,
    quality        = 0.92,
    format         = 'image/jpeg',
    nadirYaw       = 0,
    nadirPitch     = 0,
  } = opts;

  const [baseImg, logoImg] = await Promise.all([loadImage(source), loadImage(logo)]);

  const W = baseImg.naturalWidth;
  const H = baseImg.naturalHeight;

  const canvas  = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(baseImg, 0, 0, W, H);

  const basePixels = ctx.getImageData(0, 0, W, H);
  const outPixels  = new ImageData(new Uint8ClampedArray(basePixels.data), W, H);

  const logoData = buildLogoDisc(logoImg, fillColor, logoScale);

  // ── Patch centre in spherical coords ──────────────────────────────────────
  const phi0   = nadirYaw   * (Math.PI / 180);           // longitude of centre
  const theta0 = -Math.PI / 2 + nadirPitch * (Math.PI / 180); // latitude of centre
  const sinT0  = Math.sin(theta0);
  const cosT0  = Math.cos(theta0);
  const isNadir = Math.abs(cosT0) < 1e-9; // true when pitch ≈ 0

  const maxBeta = Math.PI * radiusFraction; // angular radius (radians)
  const cosBetaMin = Math.cos(maxBeta);

  // ── Per-column lookup tables (sin/cos of longitude difference) ───────────
  const sinDPhi = new Float64Array(W);
  const cosDPhi = new Float64Array(W);
  for (let x = 0; x < W; x++) {
    const dPhi   = 2 * Math.PI * x / W - Math.PI - phi0;
    sinDPhi[x]   = Math.sin(dPhi);
    cosDPhi[x]   = Math.cos(dPhi);
  }

  // Only scan the strip where the patch can possibly fall
  const stripTop = Math.max(0, Math.floor(H * (1 - radiusFraction * 1.6)));

  for (let y = stripTop; y < H; y++) {
    // Latitude of this row
    const theta = Math.PI / 2 - Math.PI * y / H;
    const sinT  = Math.sin(theta);
    const cosT  = Math.cos(theta);

    for (let x = 0; x < W; x++) {
      // Great-circle distance from patch centre
      const cosBeta   = sinT * sinT0 + cosT * cosT0 * cosDPhi[x];
      if (cosBeta < cosBetaMin) continue;           // outside patch

      const beta   = Math.acos(Math.min(1, cosBeta));
      const r_norm = beta / maxBeta;                // 0 at centre, 1 at edge

      // Feather the outer 20 % of the radius
      const blendAlpha = r_norm < 0.80 ? 1.0 : (1.0 - r_norm) / 0.20;

      // Azimuth from patch centre → logo pixel direction
      let psi: number;
      const sinBeta = Math.sin(beta);
      if (sinBeta < 1e-9) {
        psi = 0;
      } else if (isNadir) {
        // Simplified: azimuth = longitude difference
        psi = Math.atan2(sinDPhi[x], cosDPhi[x]);
      } else {
        psi = Math.atan2(
          cosT * sinDPhi[x],
          (sinT - sinT0 * cosBeta) / cosT0,
        );
      }

      // Polar → logo pixel
      const logoU = (0.5 + 0.5 * r_norm * Math.cos(psi)) * (LOGO_RES - 1);
      const logoV = (0.5 + 0.5 * r_norm * Math.sin(psi)) * (LOGO_RES - 1);
      const lx    = Math.max(0, Math.min(LOGO_RES - 1, Math.round(logoU)));
      const ly    = Math.max(0, Math.min(LOGO_RES - 1, Math.round(logoV)));

      const li  = (ly * LOGO_RES + lx) * 4;
      const bi  = (y  * W        + x)  * 4;
      const inv = 1 - blendAlpha;

      outPixels.data[bi]     = (basePixels.data[bi]     * inv + logoData.data[li]     * blendAlpha) | 0;
      outPixels.data[bi + 1] = (basePixels.data[bi + 1] * inv + logoData.data[li + 1] * blendAlpha) | 0;
      outPixels.data[bi + 2] = (basePixels.data[bi + 2] * inv + logoData.data[li + 2] * blendAlpha) | 0;
      outPixels.data[bi + 3] = 255;
    }
  }

  ctx.putImageData(outPixels, 0, 0);

  return {
    dataUrl: canvas.toDataURL(format, quality),
    width:   W,
    height:  H,
  };
}

/**
 * Fill the nadir cap with black (destructive — original area not recoverable).
 */
export async function clearNadirArea(
  source:         string | HTMLImageElement,
  radiusFraction = 0.08,
): Promise<string> {
  const img = await loadImage(source);
  const W   = img.naturalWidth;
  const H   = img.naturalHeight;
  const canvas  = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, W, H);

  const maxBeta  = Math.PI * radiusFraction;
  const data     = ctx.getImageData(0, 0, W, H);
  const stripTop = Math.max(0, Math.floor(H * (1 - radiusFraction * 1.6)));

  for (let y = stripTop; y < H; y++) {
    const beta = Math.PI * (H - y) / H;
    if (beta > maxBeta) continue;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = 0;
      data.data[i + 3] = 255;
    }
  }

  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}
