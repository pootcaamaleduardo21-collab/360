'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatBubbleProps {
  tourId: string;
  tourTitle: string;
  brandColor?: string;
  welcomeMessage?: string;
}

const MAX_MESSAGES = 20; // per session

export function AIChatBubble({
  tourId,
  tourTitle,
  brandColor = '#3b82f6',
  welcomeMessage,
}: AIChatBubbleProps) {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasGreeted, setHasGreeted] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const totalMsgs  = messages.filter((m) => m.role === 'user').length;
  const atLimit    = totalMsgs >= MAX_MESSAGES;

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Show greeting when panel opens for first time
  useEffect(() => {
    if (!open || hasGreeted) return;
    setHasGreeted(true);
    const greeting = welcomeMessage
      ?? `¡Hola! Soy el asistente virtual de **${tourTitle}**. Puedo responderte preguntas sobre espacios, disponibilidad, precios y más. ¿En qué puedo ayudarte?`;
    setMessages([{ role: 'assistant', content: greeting }]);
  }, [open, hasGreeted, tourTitle, welcomeMessage]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || atLimit) return;

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          messages: next.slice(-10), // send last 10 for context
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Error al conectar con el asistente.');
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render markdown-ish formatting (bold + line breaks)
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

  return (
    <>
      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute bottom-20 right-4 z-50 w-80 sm:w-96 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-slide-up"
          style={{ maxHeight: '70vh' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: brandColor }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Asistente Virtual</p>
                <p className="text-[10px] text-white/70 leading-tight">{tourTitle}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-950 min-h-0"
            style={{ minHeight: 200, maxHeight: 'calc(70vh - 130px)' }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex items-start gap-2', msg.role === 'user' && 'flex-row-reverse')}
              >
                {/* Avatar */}
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  msg.role === 'assistant' ? 'bg-gray-800' : 'bg-blue-600'
                )}>
                  {msg.role === 'assistant'
                    ? <Bot className="w-3.5 h-3.5 text-gray-400" />
                    : <User className="w-3.5 h-3.5 text-white" />
                  }
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    'max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed',
                    msg.role === 'assistant'
                      ? 'bg-gray-800 text-gray-200 rounded-tl-sm'
                      : 'text-white rounded-tr-sm'
                  )}
                  style={msg.role === 'user' ? { backgroundColor: brandColor } : undefined}
                >
                  {renderText(msg.content)}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 text-center px-2">{error}</p>
            )}

            {/* Limit reached */}
            {atLimit && (
              <p className="text-[11px] text-gray-600 text-center">
                Límite de {MAX_MESSAGES} mensajes alcanzado en esta sesión.
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2 p-3 bg-gray-900 border-t border-gray-800 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={atLimit ? 'Límite alcanzado' : 'Escribe tu pregunta…'}
              disabled={loading || atLimit}
              rows={1}
              className="flex-1 resize-none text-xs bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-colors disabled:opacity-40 max-h-24 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading || atLimit}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: brandColor }}
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Floating trigger button ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'absolute bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all',
          'text-white text-sm font-semibold',
          open && 'scale-95 opacity-80'
        )}
        style={{ backgroundColor: brandColor }}
        title="Asistente virtual"
        aria-label="Abrir asistente virtual"
      >
        {open
          ? <X className="w-5 h-5" />
          : <>
              <MessageCircle className="w-5 h-5" />
              <span className="hidden sm:inline">¿Tienes preguntas?</span>
            </>
        }
      </button>
    </>
  );
}
