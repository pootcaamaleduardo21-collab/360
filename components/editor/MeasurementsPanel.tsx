'use client';

import { useCallback } from 'react';
import { Scene, SceneMeasurements } from '@/types/tour.types';
import { useTourStore, selectCurrentScene } from '@/store/tourStore';
import { Ruler, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Small numeric input ──────────────────────────────────────────────────────

function MeasureInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block px-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={0.01}
          value={value ?? ''}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(isNaN(v) || v <= 0 ? undefined : v);
          }}
          placeholder={placeholder ?? '0.00'}
          className="w-full px-3 py-2 pr-9 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">
          {unit}
        </span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MeasurementsPanel() {
  const tour         = useTourStore((s) => s.tour);
  const currentScene = useTourStore(selectCurrentScene);
  const updateScene  = useTourStore((s) => s.updateScene);

  const patch = useCallback(
    (partial: Partial<SceneMeasurements>) => {
      if (!currentScene) return;
      const prev = currentScene.measurements ?? {};
      const next: SceneMeasurements = { ...prev, ...partial };

      // Auto-calculate area if both width and length are set and area isn't overridden
      if (
        partial.area === undefined &&
        next.width !== undefined &&
        next.length !== undefined
      ) {
        next.area = parseFloat((next.width * next.length).toFixed(2));
      }

      updateScene(currentScene.id, { measurements: next });
    },
    [currentScene, updateScene]
  );

  const clear = useCallback(() => {
    if (!currentScene) return;
    updateScene(currentScene.id, { measurements: undefined });
  }, [currentScene, updateScene]);

  if (!tour || !currentScene) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600 gap-2">
        <Ruler className="w-8 h-8" />
        <p className="text-xs text-center">Selecciona o crea una escena para agregar medidas.</p>
      </div>
    );
  }

  const m     = currentScene.measurements;
  const hasMeasures = m && (m.width || m.length || m.height || m.area);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
          Medidas del espacio
        </h3>
        <p className="text-[11px] text-gray-600 mt-1 px-1">
          Se muestran como overlay en el recorrido virtual al pasar por esta escena.
        </p>
      </div>

      {/* Current scene badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-900/20 border border-blue-700/30">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
        <span className="text-xs text-blue-300 font-medium truncate">{currentScene.name}</span>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block px-1">
          Nombre del espacio (opcional)
        </label>
        <input
          type="text"
          value={m?.label ?? ''}
          onChange={(e) => patch({ label: e.target.value || undefined })}
          placeholder="Recámara principal, Suite Deluxe…"
          className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Dimensions grid */}
      <div className="grid grid-cols-2 gap-3">
        <MeasureInput
          label="Ancho"
          unit="m"
          value={m?.width}
          onChange={(v) => patch({ width: v })}
        />
        <MeasureInput
          label="Largo"
          unit="m"
          value={m?.length}
          onChange={(v) => patch({ length: v })}
        />
        <MeasureInput
          label="Alto (techo)"
          unit="m"
          value={m?.height}
          onChange={(v) => patch({ height: v })}
        />
        <MeasureInput
          label="Superficie"
          unit="m²"
          value={m?.area}
          onChange={(v) => patch({ area: v })}
          placeholder="Auto"
        />
      </div>

      {/* Auto-area note */}
      {m?.width && m?.length && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50">
          <Info className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-gray-500">
            Superficie calculada: <span className="text-gray-300 font-semibold">{(m.width * m.length).toFixed(2)} m²</span>.
            Edita "Superficie" para sobrescribir.
          </p>
        </div>
      )}

      {/* Preview badge */}
      {hasMeasures && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1">
            Vista previa en el recorrido
          </p>
          <div className="flex flex-wrap gap-2 px-1">
            {m?.label && (
              <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-white text-[11px] font-semibold backdrop-blur-sm">
                {m.label}
              </span>
            )}
            {(m?.width || m?.length) && (
              <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-gray-200 text-[11px] backdrop-blur-sm">
                {m?.width && m?.length
                  ? `${m.width}m × ${m.length}m`
                  : m?.width
                  ? `Ancho: ${m.width}m`
                  : `Largo: ${m.length}m`}
              </span>
            )}
            {m?.area && (
              <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-gray-200 text-[11px] backdrop-blur-sm">
                {m.area} m²
              </span>
            )}
            {m?.height && (
              <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-gray-200 text-[11px] backdrop-blur-sm">
                Alto: {m.height}m
              </span>
            )}
          </div>
        </div>
      )}

      {/* Clear */}
      {hasMeasures && (
        <button
          onClick={clear}
          className="w-full py-2 rounded-xl text-xs text-gray-500 hover:text-red-400 border border-gray-800 hover:border-red-900/50 transition-colors"
        >
          Eliminar medidas de esta escena
        </button>
      )}

      {/* All scenes summary */}
      {tour.scenes.length > 1 && (
        <div className="pt-2 border-t border-gray-800 space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1">
            Resumen del tour
          </p>
          <div className="space-y-1">
            {tour.scenes.map((sc) => {
              const sm = sc.measurements;
              return (
                <div key={sc.id} className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-xs',
                  sc.id === currentScene.id ? 'bg-gray-800 border border-gray-700' : 'text-gray-600'
                )}>
                  <span className="truncate font-medium text-gray-400 max-w-[120px]">{sc.name}</span>
                  {sm && (sm.area || (sm.width && sm.length)) ? (
                    <span className="text-[10px] text-gray-500">
                      {sm.area ?? (sm.width! * sm.length!).toFixed(1)} m²
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-700">sin medidas</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
