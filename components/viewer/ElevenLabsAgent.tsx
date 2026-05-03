'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { cn } from '@/lib/utils';
import { Mic, MicOff, X, Loader2, Volume2, Phone, PhoneOff } from 'lucide-react';

interface ElevenLabsAgentProps {
  tourId: string;
  tourTitle: string;
  brandColor?: string;
}

type AgentStatus = 'idle' | 'loading' | 'connected' | 'error';

// Animated waveform bars shown while agent is speaking
function SpeakingBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full bg-white transition-all',
            active ? 'animate-voice-bar' : 'h-1 opacity-40'
          )}
          style={
            active
              ? {
                  animationDelay: `${i * 100}ms`,
                  height: `${8 + Math.random() * 12}px`,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

export function ElevenLabsAgent({
  tourId,
  tourTitle,
  brandColor = '#3b82f6',
}: ElevenLabsAgentProps) {
  const [open,   setOpen]   = useState(false);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error,  setError]  = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
  const [muted,  setMuted]  = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const conversation = useConversation({
    onConnect: () => {
      setStatus('connected');
      setError(null);
    },
    onDisconnect: () => {
      setStatus('idle');
    },
    onMessage: ({ message, source }) => {
      if (message && typeof message === 'string') {
        setTranscript((prev) => [
          ...prev,
          { role: source === 'user' ? 'user' : 'agent', text: message },
        ]);
      }
    },
    onError: (msg) => {
      console.error('[ElevenLabsAgent]', msg);
      setError(typeof msg === 'string' ? msg : 'Error en la conexión de voz.');
      setStatus('error');
    },
  });

  const isSpeaking   = conversation.isSpeaking;
  const agentStatus  = conversation.status; // 'connected' | 'connecting' | 'disconnected'

  const startCall = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setTranscript([]);

    try {
      // Request microphone access first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Fetch signed URL + system prompt from our server
      const res  = await fetch(`/api/elevenlabs/signed-url?tourId=${tourId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'No se pudo iniciar el asistente de voz.');
        setStatus('error');
        return;
      }

      const { signedUrl, systemPrompt, firstMessage } = data as {
        signedUrl: string;
        systemPrompt: string;
        firstMessage: string;
      };

      await conversation.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: systemPrompt },
            firstMessage,
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar.';
      // Friendly message for mic permission denial
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        setError('Necesitas permitir el acceso al micrófono para usar el asistente de voz.');
      } else {
        setError(msg);
      }
      setStatus('error');
    }
  }, [tourId, conversation]);

  const endCall = useCallback(async () => {
    await conversation.endSession();
    setStatus('idle');
  }, [conversation]);

  const handleOpen = () => {
    setOpen(true);
    if (status === 'idle') startCall();
  };

  const handleClose = async () => {
    if (agentStatus === 'connected') await endCall();
    setOpen(false);
    setStatus('idle');
    setError(null);
    setTranscript([]);
  };

  const toggleMute = () => {
    setMuted((v) => {
      conversation.setVolume({ volume: v ? 1 : 0 });
      return !v;
    });
  };

  // Status label shown in the header
  const statusLabel = () => {
    if (status === 'loading' || agentStatus === 'connecting') return 'Conectando…';
    if (status === 'error') return 'Error de conexión';
    if (isSpeaking) return 'Hablando…';
    if (agentStatus === 'connected') return 'Escuchando';
    return 'Desconectado';
  };

  // Dot color next to status
  const dotColor = () => {
    if (status === 'error') return 'bg-red-500';
    if (agentStatus === 'connected') return 'bg-emerald-400 animate-pulse';
    if (status === 'loading') return 'bg-amber-400 animate-pulse';
    return 'bg-gray-600';
  };

  return (
    <>
      {/* ── Expanded voice panel ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute bottom-20 right-20 z-50 w-72 sm:w-80 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-slide-up"
          style={{ maxHeight: '60vh' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: brandColor }}
          >
            <div className="flex items-center gap-2">
              {/* Speaking waveform or mic icon */}
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {isSpeaking ? (
                  <Volume2 className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Asistente de Voz</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColor())} />
                  <p className="text-[10px] text-white/70 leading-tight">{statusLabel()}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Visualizer / loading area */}
          <div className="bg-gray-950 flex items-center justify-center py-4 border-b border-gray-800 flex-shrink-0">
            {status === 'loading' ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-[11px] text-gray-500">Iniciando asistente…</p>
              </div>
            ) : status === 'error' ? (
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <MicOff className="w-8 h-8 text-red-400" />
                <p className="text-[11px] text-red-400">{error}</p>
                <button
                  onClick={startCall}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {/* Waveform */}
                <div className="flex items-end gap-1 h-8">
                  {[...Array(9)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: brandColor,
                        height: isSpeaking ? `${8 + (i % 3) * 8}px` : '4px',
                        opacity: isSpeaking ? 0.8 : 0.3,
                        animation: isSpeaking ? `voice-bar 0.8s ease-in-out ${i * 80}ms infinite alternate` : 'none',
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-gray-500">
                  {isSpeaking
                    ? 'El asistente está hablando…'
                    : agentStatus === 'connected'
                    ? 'Habla ahora, te estoy escuchando'
                    : 'Conectando…'}
                </p>
              </div>
            )}
          </div>

          {/* Transcript (scrollable) */}
          {transcript.length > 0 && (
            <div
              className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-950 min-h-0"
              style={{ maxHeight: 180 }}
            >
              {transcript.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <p
                    className={cn(
                      'max-w-[85%] px-3 py-1.5 rounded-xl text-[11px] leading-relaxed',
                      msg.role === 'agent'
                        ? 'bg-gray-800 text-gray-300 rounded-tl-sm'
                        : 'text-white rounded-tr-sm'
                    )}
                    style={msg.role === 'user' ? { backgroundColor: brandColor } : undefined}
                  >
                    {msg.text}
                  </p>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 border-t border-gray-800 flex-shrink-0">
            {/* Mute */}
            <button
              onClick={toggleMute}
              disabled={agentStatus !== 'connected'}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-full border transition-colors disabled:opacity-40',
                muted
                  ? 'bg-red-900/30 border-red-700/50 text-red-400'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              )}
              title={muted ? 'Activar sonido' : 'Silenciar'}
            >
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* End call */}
            <button
              onClick={handleClose}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg"
              title="Terminar llamada"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Floating trigger button ──────────────────────────────────────────── */}
      <button
        onClick={open ? handleClose : handleOpen}
        className={cn(
          'absolute bottom-4 right-20 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all',
          'text-white text-sm font-semibold',
          open && 'scale-95 opacity-80'
        )}
        style={{ backgroundColor: brandColor }}
        title="Asistente de voz"
        aria-label="Abrir asistente de voz"
      >
        {open ? (
          <Phone className="w-5 h-5" />
        ) : (
          <>
            <Mic className="w-5 h-5" />
            <span className="hidden sm:inline">Habla con nosotros</span>
          </>
        )}
      </button>

      {/* ── Keyframe for waveform animation ─────────────────────────────────── */}
      <style>{`
        @keyframes voice-bar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.2); }
        }
        .animate-voice-bar {
          animation: voice-bar 0.6s ease-in-out infinite alternate;
        }
      `}</style>
    </>
  );
}
