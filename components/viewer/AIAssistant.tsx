'use client';

/**
 * AIAssistant — unified text-chat + voice agent bubble for the viewer.
 *
 * Single floating button (bottom-right). Opens a panel with two tabs:
 *   1. Chat   — Claude Haiku text chat (existing AIChatBubble logic)
 *   2. Voz    — ElevenLabs voice agent (existing ElevenLabsAgent logic)
 *
 * Only renders the tab that is enabled for the tour.
 * If both are enabled, shows tab switcher.
 * If only one is enabled, shows it directly without tabs.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { cn } from '@/lib/utils';
import {
  MessageCircle, X, Send, Loader2, Bot, User, Sparkles,
  Mic, MicOff, Phone, PhoneOff, Volume2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type Tab = 'chat' | 'voice';
type VoiceStatus = 'idle' | 'loading' | 'connected' | 'error';

const MAX_MESSAGES = 20;

// ─── Props ────────────────────────────────────────────────────────────────────

interface AIAssistantProps {
  tourId: string;
  tourTitle: string;
  brandColor?: string;
  welcomeMessage?: string;
  textEnabled?: boolean;    // aiChatEnabled
  voiceEnabled?: boolean;   // elevenLabsEnabled
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIAssistant({
  tourId,
  tourTitle,
  brandColor = '#3b82f6',
  welcomeMessage,
  textEnabled = false,
  voiceEnabled = false,
}: AIAssistantProps) {
  const [open,      setOpen]      = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(textEnabled ? 'chat' : 'voice');

  // ── Text chat state ──────────────────────────────────────────────────────
  const [messages,   setMessages]   = useState<Message[]>([]);
  const [input,      setInput]      = useState('');
  const [chatLoading, setChatLoad]  = useState(false);
  const [chatError,  setChatError]  = useState<string | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);

  // ── Voice state ──────────────────────────────────────────────────────────
  const [voiceStatus,    setVoiceStatus]    = useState<VoiceStatus>('idle');
  const [voiceError,     setVoiceError]     = useState<string | null>(null);
  const [muted,          setMuted]          = useState(false);
  const [transcript,     setTranscript]     = useState<{ role: 'user' | 'agent'; text: string }[]>([]);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const totalUserMsgs = messages.filter((m) => m.role === 'user').length;
  const atLimit       = totalUserMsgs >= MAX_MESSAGES;

  // ── Voice conversation hook ──────────────────────────────────────────────
  const conversation = useConversation({
    onConnect:    () => { setVoiceStatus('connected'); setVoiceError(null); },
    onDisconnect: () => { setVoiceStatus('idle'); },
    onMessage: ({ message, source }: { message: unknown; source: unknown }) => {
      if (message && typeof message === 'string') {
        setTranscript((prev) => [
          ...prev,
          { role: source === 'user' ? 'user' : 'agent', text: message },
        ]);
      }
    },
    onError: (msg: unknown) => {
      setVoiceError(typeof msg === 'string' ? msg : 'Error en la conexión de voz.');
      setVoiceStatus('error');
    },
  });

  const isSpeaking  = conversation.isSpeaking;
  const agentStatus = conversation.status;

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // ── Greet on first open (text chat) ─────────────────────────────────────
  useEffect(() => {
    if (!open || hasGreeted || activeTab !== 'chat') return;
    setHasGreeted(true);
    const greeting = welcomeMessage
      ?? `¡Hola! Soy el asistente de **${tourTitle}**. Puedo ayudarte con precios, disponibilidad, medidas y más. ¿En qué puedo ayudarte?`;
    setMessages([{ role: 'assistant', content: greeting }]);
  }, [open, hasGreeted, tourTitle, welcomeMessage, activeTab]);

  // ── Focus input ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && activeTab === 'chat') setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, activeTab]);

  // ── Send text message ────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || chatLoading || atLimit) return;

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setChatError(null);
    setChatLoad(true);

    try {
      const res  = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId, messages: next.slice(-10) }),
      });
      const data = await res.json();
      if (!res.ok) setChatError(data.error ?? 'Error al conectar.');
      else setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setChatError('Error de conexión. Intenta de nuevo.');
    } finally {
      setChatLoad(false);
    }
  }, [input, chatLoading, atLimit, messages, tourId]);

  // ── Start voice ──────────────────────────────────────────────────────────
  const startVoice = useCallback(async () => {
    setVoiceStatus('loading');
    setVoiceError(null);
    setTranscript([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res  = await fetch(`/api/elevenlabs/signed-url?tourId=${tourId}`);
      const data = await res.json();
      if (!res.ok) { setVoiceError(data.error ?? 'No se pudo iniciar.'); setVoiceStatus('error'); return; }
      await conversation.startSession({
        signedUrl: data.signedUrl,
        overrides: {
          agent: {
            prompt:       { prompt: data.systemPrompt },
            firstMessage: data.firstMessage,
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error.';
      setVoiceError(
        msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
          ? 'Necesitas permitir el acceso al micrófono.'
          : msg
      );
      setVoiceStatus('error');
    }
  }, [tourId, conversation]);

  const endVoice = useCallback(async () => {
    await conversation.endSession();
    setVoiceStatus('idle');
    setTranscript([]);
  }, [conversation]);

  // ── Close panel ──────────────────────────────────────────────────────────
  const handleClose = useCallback(async () => {
    if (agentStatus === 'connected') await endVoice();
    setOpen(false);
  }, [agentStatus, endVoice]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part.split('\n').map((line, j) => (
        <span key={`${i}-${j}`}>{line}{j < part.split('\n').length - 1 && <br />}</span>
      ));
    });
  };

  const voiceStatusLabel = () => {
    if (voiceStatus === 'loading' || agentStatus === 'connecting') return 'Conectando…';
    if (voiceStatus === 'error') return 'Error';
    if (isSpeaking) return 'Hablando…';
    if (agentStatus === 'connected') return 'Escuchando';
    return 'Inactivo';
  };

  const voiceDot = () => {
    if (voiceStatus === 'error') return 'bg-red-500';
    if (agentStatus === 'connected') return 'bg-emerald-400 animate-pulse';
    if (voiceStatus === 'loading') return 'bg-amber-400 animate-pulse';
    return 'bg-gray-600';
  };

  if (!textEnabled && !voiceEnabled) return null;
  const hasBoth = textEnabled && voiceEnabled;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Panel ──────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute bottom-20 right-4 z-50 w-80 sm:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-slide-up"
          style={{ maxHeight: '72vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: brandColor }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {activeTab === 'voice' && agentStatus === 'connected'
                  ? <Volume2 className="w-3.5 h-3.5 text-white" />
                  : <Sparkles className="w-3.5 h-3.5 text-white" />}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Asistente Virtual</p>
                <p className="text-[10px] text-white/70 leading-tight">{tourTitle}</p>
              </div>
            </div>

            {/* Tab switcher (only if both enabled) */}
            {hasBoth && (
              <div className="flex bg-white/10 rounded-lg p-0.5 mx-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={cn('px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors',
                    activeTab === 'chat' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white')}
                >
                  <MessageCircle className="w-3 h-3 inline mr-1" />Chat
                </button>
                <button
                  onClick={() => setActiveTab('voice')}
                  className={cn('px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors',
                    activeTab === 'voice' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white')}
                >
                  <Mic className="w-3 h-3 inline mr-1" />Voz
                </button>
              </div>
            )}

            <button onClick={handleClose} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── TEXT CHAT TAB ─────────────────────────────────────────────── */}
          {activeTab === 'chat' && textEnabled && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-950 min-h-0" style={{ minHeight: 180, maxHeight: 'calc(72vh - 130px)' }}>
                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex items-start gap-2', msg.role === 'user' && 'flex-row-reverse')}>
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      msg.role === 'assistant' ? 'bg-gray-800' : 'bg-blue-600')}>
                      {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5 text-gray-400" /> : <User className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className={cn('max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed',
                      msg.role === 'assistant' ? 'bg-gray-800 text-gray-200 rounded-tl-sm' : 'text-white rounded-tr-sm')}
                      style={msg.role === 'user' ? { backgroundColor: brandColor } : undefined}>
                      {renderText(msg.content)}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2.5">
                      <div className="flex gap-1">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {chatError && <p className="text-xs text-red-400 text-center px-2">{chatError}</p>}
                {atLimit && <p className="text-[11px] text-gray-600 text-center">Límite de {MAX_MESSAGES} mensajes alcanzado.</p>}
                <div ref={bottomRef} />
              </div>

              <div className="flex items-end gap-2 p-3 bg-gray-900 border-t border-gray-800 flex-shrink-0">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder={atLimit ? 'Límite alcanzado' : 'Escribe tu pregunta…'}
                  disabled={chatLoading || atLimit}
                  rows={1}
                  className="flex-1 resize-none text-xs bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:opacity-40 max-h-24 overflow-y-auto"
                  style={{ lineHeight: '1.5' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || chatLoading || atLimit}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: brandColor }}
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}

          {/* ── VOICE TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'voice' && voiceEnabled && (
            <>
              {/* Status + visualizer */}
              <div className="bg-gray-950 flex items-center justify-center py-5 border-b border-gray-800 flex-shrink-0">
                {voiceStatus === 'loading' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-[11px] text-gray-500">Iniciando asistente…</p>
                  </div>
                ) : voiceStatus === 'error' ? (
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <MicOff className="w-8 h-8 text-red-400" />
                    <p className="text-[11px] text-red-400">{voiceError}</p>
                    <button onClick={startVoice}
                      className="mt-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold">
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    {/* Waveform bars */}
                    <div className="flex items-end gap-1 h-8">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <span key={i} className="w-1.5 rounded-full transition-all"
                          style={{
                            backgroundColor: brandColor,
                            height: isSpeaking ? `${8 + (i % 3) * 8}px` : '4px',
                            opacity: isSpeaking ? 0.8 : 0.3,
                            animation: isSpeaking ? `voice-bar 0.8s ease-in-out ${i * 80}ms infinite alternate` : 'none',
                          }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', voiceDot())} />
                      <p className="text-[11px] text-gray-400">{voiceStatusLabel()}</p>
                    </div>
                    {agentStatus !== 'connected' && voiceStatus === 'idle' && (
                      <button onClick={startVoice}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-colors"
                        style={{ backgroundColor: brandColor }}>
                        <Mic className="w-3.5 h-3.5" /> Iniciar conversación
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Transcript */}
              {transcript.length > 0 && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-950 min-h-0" style={{ maxHeight: 180 }}>
                  {transcript.map((msg, i) => (
                    <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <p className={cn('max-w-[85%] px-3 py-1.5 rounded-xl text-[11px] leading-relaxed',
                        msg.role === 'agent' ? 'bg-gray-800 text-gray-300 rounded-tl-sm' : 'text-white rounded-tr-sm')}
                        style={msg.role === 'user' ? { backgroundColor: brandColor } : undefined}>
                        {msg.text}
                      </p>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 border-t border-gray-800 flex-shrink-0">
                <button
                  onClick={() => { setMuted((v) => { conversation.setVolume({ volume: v ? 1 : 0 }); return !v; }); }}
                  disabled={agentStatus !== 'connected'}
                  className={cn('w-10 h-10 flex items-center justify-center rounded-full border transition-colors disabled:opacity-40',
                    muted ? 'bg-red-900/30 border-red-700/50 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white')}
                >
                  {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={agentStatus === 'connected' ? endVoice : () => {}}
                  disabled={agentStatus !== 'connected' && voiceStatus !== 'error'}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors shadow-lg"
                  title="Terminar"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Floating trigger button ─────────────────────────────────────────── */}
      <button
        onClick={() => {
          if (open) { handleClose(); }
          else {
            setOpen(true);
            // Auto-start voice if voice-only
            if (!textEnabled && voiceEnabled && voiceStatus === 'idle') {
              setTimeout(startVoice, 300);
            }
          }
        }}
        className={cn(
          'absolute bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all',
          'text-white text-sm font-semibold',
          open && 'scale-95 opacity-80'
        )}
        style={{ backgroundColor: brandColor }}
        aria-label="Asistente virtual"
      >
        {open
          ? <X className="w-5 h-5" />
          : <>
              {textEnabled
                ? <MessageCircle className="w-5 h-5" />
                : <Mic className="w-5 h-5" />}
              <span className="hidden sm:inline">
                {hasBoth ? 'Asistente' : textEnabled ? '¿Tienes preguntas?' : 'Habla con nosotros'}
              </span>
            </>}
      </button>

      <style>{`
        @keyframes voice-bar { from { transform: scaleY(0.4); } to { transform: scaleY(1.2); } }
      `}</style>
    </>
  );
}
