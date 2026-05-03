'use client';

import { useState, useCallback } from 'react';
import { X, Send, CheckCircle, MessageSquare, Loader2 } from 'lucide-react';
// submitLead kept as fallback; primary submission goes through /api/leads for email notifications
import { cn } from '@/lib/utils';

interface LeadCaptureModalProps {
  tourId: string;
  sceneId?: string;
  brandColor?: string;
  logoUrl?: string;
  tourTitle?: string;
  ctaLabel?: string;
  onClose: () => void;
}

export function LeadCaptureModal({
  tourId,
  sceneId,
  brandColor,
  logoUrl,
  tourTitle,
  ctaLabel = 'Solicitar información',
  onClose,
}: LeadCaptureModalProps) {
  const accent = brandColor ?? '#2563eb';

  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [email,   setEmail]   = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    if (!phone.trim() && !email.trim()) { setError('Ingresa al menos un teléfono o correo.'); return; }

    setSending(true);
    setError('');
    try {
      // POST to server route → inserts lead + sends email notification to owner/advisor
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId, sceneId,
          name:    name.trim(),
          phone:   phone.trim()   || undefined,
          email:   email.trim()   || undefined,
          message: message.trim() || undefined,
        }),
      });
    } catch {
      // fail silently — never block the visitor
    }
    setSending(false);
    setSent(true);
  }, [tourId, sceneId, name, phone, email, message]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: accent }}>
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">{ctaLabel}</h2>
            {tourTitle && <p className="text-xs text-gray-500 truncate">{tourTitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-10 px-5 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <h3 className="font-bold text-white">¡Mensaje enviado!</h3>
            <p className="text-sm text-gray-400">Nos pondremos en contacto contigo pronto.</p>
            <button onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: accent }}>
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            <Field label="Nombre *" value={name} onChange={setName}
              placeholder="Tu nombre completo" />
            <Field label="Teléfono" value={phone} onChange={setPhone}
              placeholder="+52 55 0000 0000" type="tel" />
            <Field label="Correo electrónico" value={email} onChange={setEmail}
              placeholder="correo@ejemplo.com" type="email" />
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Mensaje</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="¿Qué te gustaría saber?"
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-xl bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={sending}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50'
              )}
              style={{ background: accent }}
            >
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                : <><Send className="w-4 h-4" /> Enviar mensaje</>}
            </button>
            <p className="text-[10px] text-gray-600 text-center">
              Tu información es confidencial y no se comparte con terceros.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-xl bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  );
}
