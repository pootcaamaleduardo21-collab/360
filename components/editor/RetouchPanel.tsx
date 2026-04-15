'use client';

import { useRef, useState, useCallback } from 'react';
import { Scene, ColorAdjustments } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { applyNadirPatch } from '@/lib/nadirPatch';
import { uploadSceneDataUrl, uploadAsset } from '@/lib/storage';
import { Sun, Contrast, Droplets, RotateCcw, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetouchPanelProps {
  scene: Scene;
}

const DEFAULT_ADJUSTMENTS: ColorAdjustments = {
  brightness: 0,
  contrast:   0,
  saturation: 0,
};

type NadirStatus = 'idle' | 'uploading-logo' | 'processing' | 'done' | 'error';

export function RetouchPanel({ scene }: RetouchPanelProps) {
  const updateScene   = useTourStore((s) => s.updateScene);
  const tour          = useTourStore((s) => s.tour);

  const adj = scene.colorAdjustments ?? DEFAULT_ADJUSTMENTS;

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [nadirStatus,  setNadirStatus]  = useState<NadirStatus>('idle');
  const [nadirError,   setNadirError]   = useState<string | null>(null);
  const [nadirPreview, setNadirPreview] = useState<string | null>(scene.nadirLogoUrl ?? null);

  // ── Color adjustments ──────────────────────────────────────────────────────

  const updateAdj = (patch: Partial<ColorAdjustments>) =>
    updateScene(scene.id, { colorAdjustments: { ...adj, ...patch } });

  const resetAdj = () =>
    updateScene(scene.id, { colorAdjustments: DEFAULT_ADJUSTMENTS });

  const isDefaultAdj =
    adj.brightness === 0 && adj.contrast === 0 && adj.saturation === 0;

  // ── Nadir patch ────────────────────────────────────────────────────────────

  const handleLogoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !tour) return;

      setNadirStatus('uploading-logo');
      setNadirError(null);

      try {
        // 1. Upload logo to storage
        const logoResult = await uploadAsset(tour.id, file);
        const logoUrl    = logoResult.url;

        // 2. Apply patch to current scene image using Canvas API
        setNadirStatus('processing');
        const patchResult = await applyNadirPatch({
          source: scene.imageUrl,
          logo:   logoUrl,
          radiusFraction: 0.085,
          fillColor:      '#ffffff',
          logoScale:      0.60,
        });

        // 3. Upload patched image back to storage
        const patchedResult = await uploadSceneDataUrl(tour.id, patchResult.dataUrl, 'jpg');

        // 4. Update scene with both new imageUrl and logo
        updateScene(scene.id, {
          imageUrl:      patchedResult.url,
          nadirEnabled:  true,
          nadirLogoUrl:  logoUrl,
        });

        setNadirPreview(logoUrl);
        setNadirStatus('done');
      } catch (err) {
        console.error(err);
        setNadirError('Error al aplicar el parche. Verifica la conexión.');
        setNadirStatus('error');
      }

      // Reset file input for re-upload
      if (logoInputRef.current) logoInputRef.current.value = '';
    },
    [scene, tour, updateScene]
  );

  const removeNadir = () => {
    updateScene(scene.id, { nadirEnabled: false, nadirLogoUrl: undefined });
    setNadirPreview(null);
    setNadirStatus('idle');
  };

  return (
    <div className="p-4 space-y-6">
      {/* ── Color adjustments ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Corrección de color
          </h3>
          {!isDefaultAdj && (
            <button
              onClick={resetAdj}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Restablecer
            </button>
          )}
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
        </div>
      </section>

      <div className="border-t border-gray-700/50" />

      {/* ── Nadir patch ──────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Nadir Patch (trípode)
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          Coloca un logo circular en el punto nadir para cubrir el trípode.
          La imagen 360° se procesa y re-sube automáticamente.
        </p>

        {/* Preview */}
        {nadirPreview && (
          <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-gray-800 border border-gray-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={nadirPreview}
              alt="Logo nadir"
              className="w-10 h-10 rounded-full object-cover border border-gray-600"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 font-medium">Logo aplicado</p>
              <p className="text-xs text-gray-600">Nadir patch activo</p>
            </div>
            <button
              onClick={removeNadir}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Quitar
            </button>
          </div>
        )}

        {/* Upload trigger */}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleLogoChange}
        />

        <button
          onClick={() => logoInputRef.current?.click()}
          disabled={nadirStatus === 'uploading-logo' || nadirStatus === 'processing'}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border',
            nadirStatus === 'uploading-logo' || nadirStatus === 'processing'
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300 hover:text-white'
          )}
        >
          {nadirStatus === 'uploading-logo' && (
            <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo logo…</>
          )}
          {nadirStatus === 'processing' && (
            <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando patch…</>
          )}
          {nadirStatus === 'done' && (
            <><CheckCircle className="w-4 h-4 text-green-400" /> {nadirPreview ? 'Cambiar logo' : 'Logo aplicado'}</>
          )}
          {(nadirStatus === 'idle' || nadirStatus === 'error') && (
            <><Upload className="w-4 h-4" /> {nadirPreview ? 'Cambiar logo' : 'Subir logo'}</>
          )}
        </button>

        {nadirError && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {nadirError}
          </p>
        )}

        <p className="mt-2 text-xs text-gray-700">
          PNG con transparencia recomendado. La imagen original se modifica y re-sube a Supabase.
        </p>
      </section>
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
