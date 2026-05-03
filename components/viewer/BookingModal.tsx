'use client';

import { useState } from 'react';
import { BookingConfig } from '@/types/tour.types';
import { X, Calendar, Phone, Mail, MessageCircle, User, ExternalLink, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingModalProps {
  tourId?: string;           // needed for email notification
  tourTitle: string;
  brandColor?: string;
  logoUrl?: string;
  bookingConfig: BookingConfig;
  onClose: () => void;
  onBooked?: () => void; // fires after successful submission
}

interface FormData {
  name:    string;
  phone:   string;
  email:   string;
  date:    string;
  message: string;
}

const EMPTY: FormData = { name: '', phone: '', email: '', date: '', message: '' };

export function BookingModal({
  tourId, tourTitle, brandColor, logoUrl, bookingConfig, onClose, onBooked,
}: BookingModalProps) {
  const [form,    setForm]    = useState<FormData>(EMPTY);
  const [sent,    setSent]    = useState(false);

  const accent  = brandColor ?? '#2563eb';
  const ctaText = bookingConfig.ctaLabel ?? 'Agendar visita';

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lines = [
      `📅 *Solicitud de cita — ${tourTitle}*`,
      `👤 Nombre: ${form.name}`,
      form.phone   && `📱 Teléfono: ${form.phone}`,
      form.email   && `✉️ Email: ${form.email}`,
      form.date    && `🗓 Fecha preferida: ${form.date}`,
      form.message && `💬 ${form.message}`,
    ].filter(Boolean).join('\n');

    switch (bookingConfig.method) {
      case 'whatsapp': {
        const phone = bookingConfig.phone?.replace(/\D/g, '') ?? '';
        if (phone) {
          window.open(
            `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`,
            '_blank',
          );
        }
        break;
      }
      case 'email': {
        // Send structured email via server route (includes notification to owner)
        if (tourId) {
          fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tourId,
              visitorName:   form.name,
              visitorPhone:  form.phone  || undefined,
              visitorEmail:  form.email  || undefined,
              preferredDate: form.date   || undefined,
              notes:         form.message || undefined,
            }),
          }).catch(() => {/* silent */});
        } else {
          // Fallback: open mailto if no tourId
          const recipient = bookingConfig.email ?? '';
          const subject   = encodeURIComponent(`Solicitud de cita — ${tourTitle}`);
          const body      = encodeURIComponent(lines.replace(/\*/g, ''));
          window.open(`mailto:${recipient}?subject=${subject}&body=${body}`, '_blank');
        }
        break;
      }
      case 'calendly': {
        if (bookingConfig.calendlyUrl) {
          window.open(bookingConfig.calendlyUrl, '_blank');
        }
        break;
      }
    }

    setSent(true);
    onBooked?.();
    setTimeout(() => { setSent(false); onClose(); }, 2500);
  };

  return (
    <div
      className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="h-1.5 flex-shrink-0" style={{ background: accent }} />

        <div className="overflow-y-auto flex-1">
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: accent }}>
                  <Calendar className="w-4 h-4 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-base font-black text-gray-900">{ctaText}</h2>
                <p className="text-xs text-gray-500 truncate max-w-[180px]">{tourTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Calendly shortcut */}
          {bookingConfig.method === 'calendly' && bookingConfig.calendlyUrl ? (
            <div className="px-5 pb-6 space-y-3">
              <p className="text-sm text-gray-600">
                Selecciona un horario disponible en nuestro calendario.
              </p>
              <a
                href={bookingConfig.calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ background: accent }}
                onClick={() => { onBooked?.(); onClose(); }}
              >
                <ExternalLink className="w-4 h-4" />
                Abrir calendario
              </a>
            </div>
          ) : sent ? (
            /* Success state */
            <div className="px-5 pb-8 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-semibold text-gray-900">¡Solicitud enviada!</p>
              <p className="text-sm text-gray-500">Nos pondremos en contacto contigo pronto.</p>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">

              <Field label="Nombre completo" icon={<User className="w-3.5 h-3.5" />}>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Tu nombre"
                  className="booking-input"
                />
              </Field>

              <Field label="Teléfono / WhatsApp" icon={<Phone className="w-3.5 h-3.5" />}>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+52 55 1234 5678"
                  className="booking-input"
                />
              </Field>

              <Field label="Correo electrónico" icon={<Mail className="w-3.5 h-3.5" />}>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="tu@email.com"
                  className="booking-input"
                />
              </Field>

              <Field label="Fecha preferida" icon={<Calendar className="w-3.5 h-3.5" />}>
                <input
                  type="date"
                  value={form.date}
                  onChange={set('date')}
                  className="booking-input"
                />
              </Field>

              <Field label="Mensaje (opcional)" icon={<MessageCircle className="w-3.5 h-3.5" />}>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  rows={2}
                  placeholder="¿Alguna pregunta o preferencia?"
                  className="booking-input resize-none"
                />
              </Field>

              <button
                type="submit"
                disabled={!form.name.trim()}
                className="w-full py-3 rounded-2xl text-white font-semibold text-sm transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: accent }}
              >
                {bookingConfig.method === 'whatsapp'
                  ? <><MessageCircle className="w-4 h-4" /> Enviar por WhatsApp</>
                  : bookingConfig.method === 'email'
                  ? <><Mail className="w-4 h-4" /> Enviar solicitud</>
                  : <><Calendar className="w-4 h-4" /> Confirmar</>}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Scoped input styles */}
      <style jsx>{`
        :global(.booking-input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.booking-input:focus) {
          border-color: #3b82f6;
          background: #fff;
        }
      `}</style>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className={cn('flex items-center gap-1.5 text-xs font-semibold text-gray-500')}>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}
