'use client';

import { useState, useCallback, useRef } from 'react';
import { Tour } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, ShieldOff, MessageSquare, Sparkles, Mic, PlayCircle, GripVertical, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecurityPanelProps {
  tour: Tour;
}

async function sha256hex(text: string): Promise<string> {
  const buf  = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function SecurityPanel({ tour }: SecurityPanelProps) {
  const updateTour = useTourStore((s) => s.updateTour);

  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const isProtected = !!(tour.passwordEnabled && tour.passwordHash);

  const handleEnable = useCallback(async () => {
    if (!password.trim()) return;
    setSaving(true);
    const hash = await sha256hex(password.trim());
    updateTour({ passwordEnabled: true, passwordHash: hash });
    setPassword('');
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [password, updateTour]);

  const handleDisable = useCallback(() => {
    updateTour({ passwordEnabled: false, passwordHash: undefined });
  }, [updateTour]);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
        Seguridad
      </h3>

      {/* Status card */}
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-xl border',
        isProtected
          ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-400'
          : 'bg-gray-800/50 border-gray-700 text-gray-400'
      )}>
        {isProtected
          ? <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          : <ShieldOff   className="w-5 h-5 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {isProtected ? 'Tour protegido con contraseña' : 'Tour público'}
          </p>
          <p className="text-[11px] opacity-70 mt-0.5">
            {isProtected
              ? `Hash: ${tour.passwordHash!.slice(0, 8)}…`
              : 'Cualquier persona con el enlace puede acceder.'}
          </p>
        </div>
        {isProtected && (
          <button
            onClick={handleDisable}
            className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors"
            title="Quitar contraseña"
          >
            <Unlock className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Set / change password */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block px-1">
          {isProtected ? 'Cambiar contraseña' : 'Establecer contraseña'}
        </label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setSaved(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleEnable()}
            placeholder="Nueva contraseña…"
            className="w-full px-3 py-2 pr-9 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button
          onClick={handleEnable}
          disabled={!password.trim() || saving}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors',
            saved
              ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-600/40'
              : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40'
          )}
        >
          <Lock className="w-3.5 h-3.5" />
          {saving ? 'Guardando…' : saved ? '¡Contraseña guardada!' : isProtected ? 'Cambiar contraseña' : 'Activar protección'}
        </button>
        <p className="text-[10px] text-gray-600 px-1">
          La contraseña se almacena como hash SHA-256. Nunca se guarda en texto plano.
        </p>
      </div>

      {/* ── Lead capture ──────────────────────────────────────── */}
      <div className="pt-2 border-t border-gray-800 space-y-3">
        <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1">
          Captación de leads
        </h4>

        {/* Toggle */}
        <button
          onClick={() => updateTour({ leadCaptureEnabled: !tour.leadCaptureEnabled })}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
            tour.leadCaptureEnabled
              ? 'bg-teal-900/20 border-teal-700/40 text-teal-400'
              : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
          )}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">
              {tour.leadCaptureEnabled ? 'Botón activo en el tour' : 'Activar botón de contacto'}
            </p>
            <p className="text-[11px] opacity-70">
              Los visitantes podrán enviarte su información de contacto.
            </p>
          </div>
          <div className={cn(
            'w-8 h-4 rounded-full transition-colors flex-shrink-0',
            tour.leadCaptureEnabled ? 'bg-teal-500' : 'bg-gray-700'
          )}>
            <div className={cn(
              'w-3 h-3 rounded-full bg-white mt-0.5 transition-transform',
              tour.leadCaptureEnabled ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </div>
        </button>

        {/* Label customization */}
        {tour.leadCaptureEnabled && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block px-1">
              Texto del botón
            </label>
            <input
              type="text"
              value={tour.leadCaptureLabel ?? ''}
              onChange={(e) => updateTour({ leadCaptureLabel: e.target.value || undefined })}
              placeholder="Solicitar información"
              className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}
      </div>

      {/* ── AI Chat assistant ──────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-semibold text-gray-300">Asistente IA</span>
        </div>

        {/* Toggle */}
        <button
          onClick={() => updateTour({ aiChatEnabled: !tour.aiChatEnabled })}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors text-left',
            tour.aiChatEnabled
              ? 'bg-violet-500/10 border-violet-500/30'
              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
          )}
        >
          <div className={cn('w-8 h-4.5 rounded-full relative transition-colors flex-shrink-0 mt-0.5',
            tour.aiChatEnabled ? 'bg-violet-500' : 'bg-gray-700'
          )} style={{ height: 18 }}>
            <div className={cn('absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
              tour.aiChatEnabled ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-semibold leading-tight',
              tour.aiChatEnabled ? 'text-violet-300' : 'text-gray-400'
            )}>
              {tour.aiChatEnabled ? 'Chat IA activo en el tour' : 'Activar asistente IA'}
            </p>
            <p className="text-[10px] text-gray-600 leading-snug mt-0.5">
              Los visitantes pueden hacer preguntas sobre el tour.
            </p>
          </div>
        </button>

        {/* Welcome message override */}
        {tour.aiChatEnabled && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block px-1">
              Mensaje de bienvenida (opcional)
            </label>
            <textarea
              value={tour.aiChatWelcome ?? ''}
              onChange={(e) => updateTour({ aiChatWelcome: e.target.value || undefined })}
              placeholder="¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?"
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-violet-500 transition-colors resize-none"
            />
            <p className="text-[10px] text-gray-600 px-1">
              Requiere <code className="text-gray-500">ANTHROPIC_API_KEY</code> en variables de entorno.
            </p>
          </div>
        )}
      </div>

      {/* ── ElevenLabs Voice Agent ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
          <Mic className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-xs font-semibold text-gray-300">Asistente de Voz</span>
        </div>

        {/* Toggle */}
        <button
          onClick={() => updateTour({ elevenLabsEnabled: !tour.elevenLabsEnabled })}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors text-left',
            tour.elevenLabsEnabled
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-gray-800 border-gray-700 hover:border-gray-600'
          )}
        >
          <div className={cn('w-8 rounded-full relative transition-colors flex-shrink-0 mt-0.5',
            tour.elevenLabsEnabled ? 'bg-rose-500' : 'bg-gray-700'
          )} style={{ height: 18 }}>
            <div className={cn('absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
              tour.elevenLabsEnabled ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-semibold leading-tight',
              tour.elevenLabsEnabled ? 'text-rose-300' : 'text-gray-400'
            )}>
              {tour.elevenLabsEnabled ? 'Voz IA activa en el tour' : 'Activar asistente de voz'}
            </p>
            <p className="text-[10px] text-gray-600 leading-snug mt-0.5">
              Los visitantes pueden hablar por voz con el agente.
            </p>
          </div>
        </button>

        {/* First message override */}
        {tour.elevenLabsEnabled && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block px-1">
              Primer mensaje del agente (opcional)
            </label>
            <input
              type="text"
              value={tour.elevenLabsFirstMessage ?? ''}
              onChange={(e) => updateTour({ elevenLabsFirstMessage: e.target.value || undefined })}
              placeholder={`Hola, soy el asistente de ${tour.title}. ¿En qué puedo ayudarte?`}
              className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-rose-500 transition-colors"
            />
            <p className="text-[10px] text-gray-600 px-1">
              Requiere <code className="text-gray-500">ELEVENLABS_API_KEY</code> y{' '}
              <code className="text-gray-500">NEXT_PUBLIC_ELEVENLABS_AGENT_ID</code>.
            </p>
          </div>
        )}
      </div>
      {/* ── Guided Tour ───────────────────────────────────────────────────────── */}
      <GuidedTourSection tour={tour} updateTour={updateTour} />
    </div>
  );
}

// ─── Guided Tour sub-component (keeps drag state local) ──────────────────────

function GuidedTourSection({
  tour,
  updateTour,
}: {
  tour: Tour;
  updateTour: (patch: Partial<Omit<Tour, 'id' | 'scenes'>>) => void;
}) {
  // Build ordered list: use saved custom order first, fall back to scenes array
  const buildOrder = () => {
    const custom = tour.guidedTourSceneOrder ?? [];
    if (custom.length > 0) {
      const mapped = custom
        .map((id) => tour.scenes.find((s) => s.id === id))
        .filter(Boolean) as Tour['scenes'];
      // append any scenes not yet in the custom order
      const rest = tour.scenes.filter((s) => !custom.includes(s.id));
      return [...mapped, ...rest];
    }
    return [...tour.scenes];
  };

  const [order, setOrder] = useState<Tour['scenes']>(buildOrder);
  const dragIdx = useRef<number | null>(null);

  // Sync when scenes list changes externally (e.g. scene added/removed)
  const prevScenesLen = useRef(tour.scenes.length);
  if (tour.scenes.length !== prevScenesLen.current) {
    prevScenesLen.current = tour.scenes.length;
    setOrder(buildOrder());
  }

  const save = (newOrder: Tour['scenes']) => {
    setOrder(newOrder);
    updateTour({ guidedTourSceneOrder: newOrder.map((s) => s.id) });
  };

  const handleDragStart = (idx: number) => { dragIdx.current = idx; };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    const next = [...order];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(idx, 0, moved);
    dragIdx.current = idx;
    setOrder(next);
  };

  const handleDrop = () => {
    if (dragIdx.current === null) return;
    dragIdx.current = null;
    updateTour({ guidedTourSceneOrder: order.map((s) => s.id) });
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...order];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    save(next);
  };

  const moveDown = (idx: number) => {
    if (idx === order.length - 1) return;
    const next = [...order];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    save(next);
  };

  const resetOrder = () => {
    const defaultOrder = [...tour.scenes];
    save(defaultOrder);
  };

  const hasCustomOrder = (tour.guidedTourSceneOrder ?? []).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-t border-gray-800 pt-3">
        <PlayCircle className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-semibold text-gray-300">Recorrido Guiado</span>
      </div>

      {/* Enable toggle */}
      <button
        onClick={() => updateTour({ guidedTourEnabled: !tour.guidedTourEnabled })}
        disabled={tour.scenes.length < 2}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors text-left',
          tour.guidedTourEnabled
            ? 'bg-blue-500/10 border-blue-500/30'
            : 'bg-gray-800 border-gray-700 hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        <div className={cn('w-8 rounded-full relative transition-colors flex-shrink-0 mt-0.5',
          tour.guidedTourEnabled ? 'bg-blue-500' : 'bg-gray-700'
        )} style={{ height: 18 }}>
          <div className={cn('absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
            tour.guidedTourEnabled ? 'translate-x-4' : 'translate-x-0.5'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold leading-tight',
            tour.guidedTourEnabled ? 'text-blue-300' : 'text-gray-400'
          )}>
            {tour.guidedTourEnabled ? 'Recorrido automático activo' : 'Activar recorrido guiado'}
          </p>
          <p className="text-[10px] text-gray-600 leading-snug mt-0.5">
            {tour.scenes.length < 2
              ? 'Requiere al menos 2 escenas.'
              : 'Avanza automáticamente por cada escena.'}
          </p>
        </div>
      </button>

      {tour.guidedTourEnabled && (
        <>
          {/* Seconds per scene */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block px-1">
              Segundos por escena
            </label>
            <input
              type="number"
              min={3}
              max={60}
              value={tour.guidedTourAutoAdvanceSec ?? 8}
              onChange={(e) => updateTour({ guidedTourAutoAdvanceSec: Number(e.target.value) || 8 })}
              className="w-full px-3 py-2 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Scene order — drag and drop */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                Orden de escenas
              </label>
              {hasCustomOrder && (
                <button
                  onClick={resetOrder}
                  className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                  title="Restaurar orden original"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restaurar
                </button>
              )}
            </div>

            <ul className="space-y-1">
              {order.map((scene, idx) => (
                <li
                  key={scene.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 cursor-grab active:cursor-grabbing select-none group"
                >
                  <GripVertical className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  <span className="w-4 text-[10px] font-bold text-gray-600 text-right flex-shrink-0">
                    {idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="w-10 h-5 rounded overflow-hidden bg-gray-900 flex-shrink-0">
                    {(scene.thumbnailUrl ?? scene.imageUrl) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={scene.thumbnailUrl ?? scene.imageUrl}
                        alt={scene.name}
                        className="w-full h-full object-cover opacity-80"
                      />
                    )}
                  </div>

                  <span className="flex-1 text-xs text-gray-300 truncate">{scene.name}</span>

                  {/* Up / down arrows (fallback for touch) */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors leading-none"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === order.length - 1}
                      className="text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors leading-none"
                    >
                      ▼
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-[10px] text-gray-600 px-1">
              Arrastra para reordenar. El recorrido seguirá este orden.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
