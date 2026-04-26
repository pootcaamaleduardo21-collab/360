'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Scene, ColorAdjustments } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { applyNadirPatch } from '@/lib/nadirPatch';
import { uploadSceneDataUrl, uploadAsset } from '@/lib/storage';
import {
  Sun, Contrast, Droplets, RotateCcw, Upload, Loader2,
  CheckCircle, AlertCircle, Trash2, RefreshCw,
  Thermometer, Eye, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RetouchPanelProps {
  scene: Scene;
}

const DEFAULT_ADJUSTMENTS: ColorAdjustments = {
  brightness:  0,
  contrast:    0,
  saturation:  0,
  temperature: 0,
  vignette:    0,
};

type NadirStatus = 'idle' | 'uploading-logo' | 'processing' | 'done' | 'error';

// ─── Patch color presets ──────────────────────────────────────────────────────

const PATCH_COLORS: { label: string; value: string }[] = [
  { label: 'Blanco',   value: '#ffffff' },
  { label: 'Negro',    value: '#111111' },
  { label: 'Gris',     value: '#374151' },
  { label: 'Azul',     value: '#1e3a8a' },
  { label: 'Personalizado', value: 'custom' },
];

// ─── Patch radius presets ─────────────────────────────────────────────────────

const RADIUS_SIZES: { label: string; value: number }[] = [
  { label: 'S', value: 0.065 },
  { label: 'M', value: 0.090 },
  { label: 'L', value: 0.120 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function RetouchPanel({ scene }: RetouchPanelProps) {
  const updateScene = useTourStore((s) => s.updateScene);
  const tour        = useTourStore((s) => s.tour);

  const adj = scene.colorAdjustments ?? DEFAULT_ADJUSTMENTS;

  // Nadir logo state
  const logoInputRef   = useRef<HTMLInputElement>(null);
  const [nadirStatus,  setNadirStatus]  = useState<NadirStatus>('idle');
  const [nadirError,   setNadirError]   = useState<string | null>(null);
  const [logoPreview,  setLogoPreview]  = useState<string | null>(scene.nadirLogoUrl ?? null);

  // Patch settings — initialized from persisted scene data
  const [patchColor,   setPatchColor]   = useState(scene.nadirPatchColor ?? '#ffffff');
  const [customColor,  setCustomColor]  = useState(
    PATCH_COLORS.some((c) => c.value === scene.nadirPatchColor) ? '#ffffff' : (scene.nadirPatchColor ?? '#ffffff')
  );
  const [useCustom,    setUseCustom]    = useState(
    !!scene.nadirPatchColor && !PATCH_COLORS.slice(0, -1).some((c) => c.value === scene.nadirPatchColor)
  );
  const [patchRadius,  setPatchRadius]  = useState(scene.nadirPatchRadius ?? 0.090);
  const [applyToAll,   setApplyToAll]   = useState(false);
  const [allProgress,  setAllProgress]  = useState<{ current: number; total: number } | null>(null);

  // Sync logoPreview when scene changes (navigating between scenes)
  useEffect(() => {
    setLogoPreview(scene.nadirLogoUrl ?? null);
    setPatchColor(scene.nadirPatchColor ?? '#ffffff');
    setPatchRadius(scene.nadirPatchRadius ?? 0.090);
    setNadirStatus('idle');
    setNadirError(null);
  }, [scene.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveColor = useCustom ? customColor : patchColor;

  // ── Color adjustments ──────────────────────────────────────────────────────

  const updateAdj = (patch: Partial<ColorAdjustments>) =>
    updateScene(scene.id, { colorAdjustments: { ...adj, ...patch } });

  const resetAdj = () =>
    updateScene(scene.id, { colorAdjustments: DEFAULT_ADJUSTMENTS });

  const autoEnhance = useCallback(async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = scene.imageUrl;
    });
    if (!img.naturalWidth) return;

    const W = 200, H = 100;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    try { ctx.drawImage(img, 0, 0, W, H); } catch { return; }

    const { data } = ctx.getImageData(0, 0, W, H);
    const n = W * H;
    let sumLuma = 0, sumSat = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      sumLuma += 0.299 * r + 0.587 * g + 0.114 * b;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      sumSat += max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    }
    const avgLuma = sumLuma / n;
    const avgSat  = sumSat  / n;

    let brightness = 0, contrast = 0, saturation = 0;
    if (avgLuma < 0.38) brightness = Math.min(50,  Math.round((0.45 - avgLuma) * 110));
    else if (avgLuma > 0.62) brightness = Math.max(-40, Math.round((0.45 - avgLuma) * 80));
    if (avgSat < 0.25) { contrast = 15; saturation = Math.round((0.35 - avgSat) * 60); }
    else if (avgSat > 0.55) saturation = -10;
    else saturation = Math.round((0.35 - avgSat) * 40);

    updateScene(scene.id, {
      colorAdjustments: { ...DEFAULT_ADJUSTMENTS, brightness, contrast, saturation },
    });
  }, [scene.id, scene.imageUrl, updateScene]);

  const isDefaultAdj =
    adj.brightness === 0 &&
    adj.contrast === 0 &&
    adj.saturation === 0 &&
    (adj.temperature ?? 0) === 0 &&
    (adj.vignette ?? 0) === 0;

  // ── Core nadir processing ──────────────────────────────────────────────────

  const processSingleScene = useCallback(
    async (sc: typeof scene, logoUrl: string): Promise<void> => {
      // Always patch from the original image (pre-patch), so re-applying is safe
      const sourceUrl = sc.originalImageUrl || sc.imageUrl;

      const patchResult = await applyNadirPatch({
        source:         sourceUrl,
        logo:           logoUrl,
        radiusFraction: patchRadius,
        fillColor:      effectiveColor,
        logoScale:      0.60,
      });

      const uploaded = await uploadSceneDataUrl(tour!.id, patchResult.dataUrl, 'jpg');

      updateScene(sc.id, {
        imageUrl:         uploaded.url,
        nadirEnabled:     true,
        nadirLogoUrl:     logoUrl,
        nadirPatchColor:  effectiveColor,
        nadirPatchRadius: patchRadius,
        originalImageUrl: sourceUrl,
      });
    },
    [patchRadius, effectiveColor, tour, updateScene]
  );

  // ── File upload handler ────────────────────────────────────────────────────

  const handleLogoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !tour) return;

      setNadirStatus('uploading-logo');
      setNadirError(null);

      try {
        // 1. Upload logo asset once
        const logoResult = await uploadAsset(tour.id, file);
        const logoUrl    = logoResult.url;
        setLogoPreview(logoUrl);

        setNadirStatus('processing');

        if (applyToAll && tour.scenes.length > 1) {
          // 2a. Apply to every scene
          const scenes = tour.scenes;
          for (let i = 0; i < scenes.length; i++) {
            setAllProgress({ current: i + 1, total: scenes.length });
            await processSingleScene(scenes[i], logoUrl);
          }
          setAllProgress(null);
        } else {
          // 2b. Apply to current scene only
          await processSingleScene(scene, logoUrl);
        }

        setNadirStatus('done');
      } catch (err) {
        console.error(err);
        setNadirError('Error al aplicar el parche. Verifica la conexión.');
        setNadirStatus('error');
        setAllProgress(null);
      }

      if (logoInputRef.current) logoInputRef.current.value = '';
    },
    [scene, tour, applyToAll, processSingleScene]
  );

  // ── Re-apply with current settings (logo already uploaded) ────────────────

  const reapplyPatch = useCallback(async () => {
    const logoUrl = scene.nadirLogoUrl;
    if (!logoUrl || !tour) return;

    setNadirStatus('processing');
    setNadirError(null);

    try {
      if (applyToAll && tour.scenes.length > 1) {
        const scenes = tour.scenes;
        for (let i = 0; i < scenes.length; i++) {
          setAllProgress({ current: i + 1, total: scenes.length });
          await processSingleScene(scenes[i], logoUrl);
        }
        setAllProgress(null);
      } else {
        await processSingleScene(scene, logoUrl);
      }
      setNadirStatus('done');
    } catch (err) {
      console.error(err);
      setNadirError('Error al reaplicar el parche.');
      setNadirStatus('error');
      setAllProgress(null);
    }
  }, [scene, tour, applyToAll, processSingleScene]);

  // ── Remove nadir patch ────────────────────────────────────────────────────

  const removeNadir = () => {
    // Restore original image if we saved it
    const restoreUrl = scene.originalImageUrl;
    updateScene(scene.id, {
      nadirEnabled:     false,
      nadirLogoUrl:     undefined,
      nadirPatchColor:  undefined,
      nadirPatchRadius: undefined,
      originalImageUrl: undefined,
      ...(restoreUrl ? { imageUrl: restoreUrl } : {}),
    });
    setLogoPreview(null);
    setNadirStatus('idle');
    setNadirError(null);
  };

  const isBusy = nadirStatus === 'uploading-logo' || nadirStatus === 'processing';
  const hasNadir = !!scene.nadirLogoUrl && scene.nadirEnabled;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-6">

      {/* ── Color adjustments ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Corrección de color
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={autoEnhance}
              title="Auto-mejorar imagen"
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors"
            >
              <Wand2 className="w-3 h-3" /> Auto
            </button>
            {!isDefaultAdj && (
              <button
                onClick={resetAdj}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Slider
            label="Brillo"
            icon={<Sun className="w-3.5 h-3.5" />}
            value={adj.brightness}
            onChange={(v) => updateAdj({ brightness: v })}
          />
          <Slider
            label="Contraste"
            icon={<Contrast className="w-3.5 h-3.5" />}
            value={adj.contrast}
            onChange={(v) => updateAdj({ contrast: v })}
          />
          <Slider
            label="Saturación"
            icon={<Droplets className="w-3.5 h-3.5" />}
            value={adj.saturation}
            onChange={(v) => updateAdj({ saturation: v })}
          />
          <Slider
            label="Temperatura"
            icon={<Thermometer className="w-3.5 h-3.5" />}
            value={adj.temperature ?? 0}
            onChange={(v) => updateAdj({ temperature: v })}
          />
          <Slider
            label="Viñeta"
            icon={<Eye className="w-3.5 h-3.5" />}
            value={adj.vignette ?? 0}
            onChange={(v) => updateAdj({ vignette: v })}
            min={0}
            max={100}
          />
        </div>
      </section>

      <div className="border-t border-gray-700/50" />

      {/* ── Nadir Patch ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Nadir Patch — Logo del cliente
          </h3>
          <p className="text-xs text-gray-600">
            Reemplaza el trípode con el logo del cliente. La imagen 360° se procesa y re-sube automáticamente.
          </p>
        </div>

        {/* ── Patch preview ──────────────────────────────────────────── */}
        {logoPreview && (
          <NadirPreview
            logoUrl={logoPreview}
            fillColor={effectiveColor}
            radius={patchRadius}
          />
        )}

        {/* ── Color selector ─────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Color de fondo del parche</p>
          <div className="flex gap-2 flex-wrap">
            {PATCH_COLORS.slice(0, -1).map((c) => (
              <button
                key={c.value}
                onClick={() => { setPatchColor(c.value); setUseCustom(false); }}
                title={c.label}
                className={cn(
                  'w-7 h-7 rounded-full border-2 transition-all',
                  !useCustom && patchColor === c.value
                    ? 'border-blue-400 scale-110 ring-2 ring-blue-400/30'
                    : 'border-gray-600 hover:border-gray-400'
                )}
                style={{ background: c.value }}
              />
            ))}
            {/* Custom color swatch */}
            <label
              title="Personalizado"
              className={cn(
                'w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden',
                useCustom
                  ? 'border-blue-400 scale-110 ring-2 ring-blue-400/30'
                  : 'border-gray-600 hover:border-gray-400'
              )}
              style={{ background: useCustom ? customColor : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
            >
              <input
                type="color"
                value={customColor}
                onChange={(e) => { setCustomColor(e.target.value); setUseCustom(true); }}
                className="opacity-0 absolute w-px h-px"
              />
            </label>
          </div>
        </div>

        {/* ── Radius selector ────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-gray-500 mb-2">Tamaño del parche</p>
          <div className="flex gap-1.5">
            {RADIUS_SIZES.map((s) => (
              <button
                key={s.label}
                onClick={() => setPatchRadius(s.value)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  patchRadius === s.value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Apply to all scenes toggle ──────────────────────────────── */}
        {(tour?.scenes.length ?? 0) > 1 && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setApplyToAll((v) => !v)}
              className={cn(
                'relative w-9 h-5 rounded-full transition-colors',
                applyToAll ? 'bg-blue-600' : 'bg-gray-700'
              )}
            >
              <div className={cn(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                applyToAll ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </div>
            <span className="text-xs text-gray-400">
              Aplicar a las {tour?.scenes.length} escenas del tour
            </span>
          </label>
        )}

        {/* ── Status / progress ───────────────────────────────────────── */}
        {allProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Procesando escena {allProgress.current} de {allProgress.total}…
              </span>
              <span>{Math.round((allProgress.current / allProgress.total) * 100)}%</span>
            </div>
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${(allProgress.current / allProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Action buttons ──────────────────────────────────────────── */}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleLogoChange}
        />

        <div className="flex gap-2">
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={isBusy}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border',
              isBusy
                ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300 hover:text-white'
            )}
          >
            {nadirStatus === 'uploading-logo' && <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo logo…</>}
            {nadirStatus === 'processing'     && !allProgress && <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</>}
            {nadirStatus === 'processing'     && allProgress  && <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando…</>}
            {nadirStatus === 'done'           && <><CheckCircle className="w-4 h-4 text-green-400" /> {logoPreview ? 'Cambiar logo' : 'Listo'}</>}
            {(nadirStatus === 'idle' || nadirStatus === 'error') && (
              <><Upload className="w-4 h-4" /> {logoPreview ? 'Cambiar logo' : 'Subir logo'}</>
            )}
          </button>

          {/* Re-apply with current settings */}
          {hasNadir && (
            <button
              onClick={reapplyPatch}
              disabled={isBusy}
              title="Reaplicar con configuración actual"
              className="w-10 flex items-center justify-center rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Remove nadir */}
          {hasNadir && (
            <button
              onClick={removeNadir}
              disabled={isBusy}
              title={scene.originalImageUrl ? 'Quitar patch y restaurar imagen original' : 'Quitar patch'}
              className="w-10 flex items-center justify-center rounded-xl border border-gray-700 bg-gray-800 hover:bg-red-900/40 hover:border-red-700 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Restore note */}
        {hasNadir && scene.originalImageUrl && (
          <p className="text-xs text-gray-700">
            La imagen original está guardada. Quitar el patch la restaurará.
          </p>
        )}

        {/* All-scenes applied note */}
        {nadirStatus === 'done' && applyToAll && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Aplicado a todas las escenas del tour.
          </p>
        )}

        {nadirError && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {nadirError}
          </p>
        )}

        <p className="text-xs text-gray-700">
          PNG con transparencia recomendado para mejores resultados.
        </p>
      </section>
    </div>
  );
}

// ─── Nadir preview (CSS-based, no canvas) ─────────────────────────────────────

function NadirPreview({
  logoUrl,
  fillColor,
  radius,
}: {
  logoUrl: string;
  fillColor: string;
  radius: number;
}) {
  // Map radiusFraction (0.065–0.12) to preview circle size (48–72px)
  const sizePx = Math.round(48 + ((radius - 0.065) / (0.12 - 0.065)) * 24);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/60 border border-gray-700/50">
      {/* Simulated nadir patch */}
      <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 72, height: 72 }}>
        <div
          className="rounded-full flex items-center justify-center shadow-lg border border-white/10"
          style={{
            width: sizePx,
            height: sizePx,
            background: `radial-gradient(circle, ${fillColor}ff 55%, ${fillColor}cc 75%, ${fillColor}22 100%)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Logo nadir"
            className="object-contain rounded-full"
            style={{ width: sizePx * 0.6, height: sizePx * 0.6 }}
          />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-200">Vista previa del parche</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Tamaño {Math.round(radius * 100)}% · Color aplicado
        </p>
        {/* Swatch showing actual applied color */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <div
            className="w-3 h-3 rounded-full border border-gray-600"
            style={{ background: fillColor }}
          />
          <span className="text-[10px] font-mono text-gray-600">{fillColor}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Slider sub-component ─────────────────────────────────────────────────────

function Slider({
  label,
  icon,
  value,
  onChange,
  min = -100,
  max = 100,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          {icon} {label}
        </span>
        <span
          className={cn(
            'text-xs font-mono tabular-nums',
            value === 0 ? 'text-gray-600' : 'text-gray-300'
          )}
        >
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                     bg-gray-700
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3.5
                     [&::-webkit-slider-thumb]:h-3.5
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:shadow
                     [&::-webkit-slider-thumb]:cursor-grab"
          style={{
            background: `linear-gradient(to right, #3b82f6 ${pct}%, #374151 ${pct}%)`,
          }}
        />
        {/* Center tick */}
        <div className="absolute top-1/2 left-1/2 -translate-x-px -translate-y-1/2 w-px h-2.5 bg-gray-600 pointer-events-none" />
      </div>
    </div>
  );
}
