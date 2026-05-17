/**
 * Email notifications via Resend.
 *
 * Setup:
 *  1. Create free account at resend.com
 *  2. Add RESEND_API_KEY to env vars
 *  3. Add RESEND_FROM_EMAIL (e.g. "Tour 360 <notificaciones@tudominio.com>")
 *     — domain must be verified in Resend dashboard.
 *     — For testing without a domain, use: onboarding@resend.dev (only sends to your own email)
 *
 * All functions fail silently so they never break the viewer/API.
 */

import { Resend } from 'resend';
import type { LeadPayload } from './leads';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'Tour 360 <onboarding@resend.dev>';
}

const BRAND_COLOR = '#3b82f6';

// ─── Shared layout ───────────────────────────────────────────────────────────

function layout(body: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Logo / brand -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <span style="display:inline-flex;align-items:center;gap:8px;">
              <span style="
                width:36px;height:36px;border-radius:10px;
                background:${BRAND_COLOR};
                display:inline-block;line-height:36px;text-align:center;
                font-size:20px;">🌐</span>
              <span style="font-size:18px;font-weight:700;color:#f1f5f9;letter-spacing:-0.5px;">Eleva360</span>
            </span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="
            background:#1e293b;border-radius:16px;
            border:1px solid #334155;overflow:hidden;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="margin:0;font-size:11px;color:#475569;">
              Eleva360 · No respondas a este correo automático.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function pill(text: string, bg: string, color: string): string {
  return `<span style="
    display:inline-block;padding:3px 10px;border-radius:999px;
    background:${bg};color:${color};font-size:11px;font-weight:600;
    letter-spacing:0.3px;">${text}</span>`;
}

function row(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#e2e8f0;font-size:13px;font-weight:500;">${value}</td>
  </tr>`;
}

// ─── Reservation status labels ───────────────────────────────────────────────

const RESERVATION_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:           { label: 'Pendiente',           color: '#f59e0b', bg: '#451a03' },
  documents_needed:  { label: 'Documentos requeridos', color: '#fb923c', bg: '#431407' },
  in_review:         { label: 'En revisión',          color: '#60a5fa', bg: '#1e3a5f' },
  approved:          { label: 'Aprobado',             color: '#34d399', bg: '#064e3b' },
  rejected:          { label: 'Rechazado',            color: '#f87171', bg: '#450a0a' },
  cancelled:         { label: 'Cancelado',            color: '#9ca3af', bg: '#1f2937' },
};

// ─── 1. Lead notification ─────────────────────────────────────────────────────

export interface LeadEmailData extends LeadPayload {
  tourTitle: string;
  sceneName?: string;
  viewerUrl?: string;
}

export async function sendLeadNotification(
  lead: LeadEmailData,
  recipientEmail: string
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const subject = `🔥 Nuevo lead: ${lead.name} — ${lead.tourTitle}`;

  const scoreItems = [
    lead.phone && lead.email ? '✅ Teléfono + email' : null,
    lead.phone && !lead.email ? '📱 Teléfono' : null,
    !lead.phone && lead.email ? '📧 Email' : null,
    lead.message ? '💬 Dejó mensaje' : null,
  ].filter(Boolean);

  const score = (lead.phone ? 3 : 0) + (lead.email ? 2 : 0) + (lead.message && lead.message.length > 10 ? 2 : 0) + (lead.phone && lead.email ? 1 : 0);
  const heat  = score >= 6 ? { label: '🔥 Caliente', bg: '#7f1d1d', color: '#fca5a5' }
              : score >= 3 ? { label: '🌡️ Tibio',    bg: '#78350f', color: '#fcd34d' }
              :              { label: '❄️ Frío',      bg: '#1e3a5f', color: '#93c5fd' };

  const waLink = lead.phone
    ? `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${lead.name}, vi tu consulta sobre ${lead.tourTitle}.`)}`
    : null;

  const body = `
    <!-- Header stripe -->
    <div style="background:linear-gradient(135deg,#1d4ed8,#4f46e5);padding:28px 32px;">
      <p style="margin:0 0 6px;font-size:12px;color:#bfdbfe;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Nuevo lead recibido</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">${lead.name}</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#bfdbfe;">Tour: <strong>${lead.tourTitle}</strong>${lead.sceneName ? ` · ${lead.sceneName}` : ''}</p>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">

      <!-- Score badge -->
      <div style="margin-bottom:20px;">
        ${pill(heat.label, heat.bg, heat.color)}
        <span style="margin-left:8px;font-size:12px;color:#64748b;">Puntuación ${score}/8 · ${scoreItems.join(' · ')}</span>
      </div>

      <!-- Contact data -->
      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#0f172a;">
          <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;">Datos de contacto</td>
        </tr>
        <tr style="background:#1e293b;">
          ${row('Nombre', lead.name)}
        </tr>
        ${lead.phone ? `<tr style="background:#1e293b;">${row('Teléfono', lead.phone)}</tr>` : ''}
        ${lead.email ? `<tr style="background:#1e293b;">${row('Email', lead.email)}</tr>` : ''}
        ${lead.message ? `<tr style="background:#1e293b;">${row('Mensaje', `<em style="color:#cbd5e1;">"${lead.message}"</em>`)}</tr>` : ''}
      </table>

      <!-- CTA buttons -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${waLink ? `<a href="${waLink}" style="
          display:inline-block;padding:12px 20px;border-radius:10px;
          background:#16a34a;color:#fff;font-size:13px;font-weight:700;
          text-decoration:none;">📱 Responder por WhatsApp</a>` : ''}
        ${lead.email ? `<a href="mailto:${lead.email}?subject=Re: ${encodeURIComponent(lead.tourTitle)}" style="
          display:inline-block;padding:12px 20px;border-radius:10px;
          background:#1d4ed8;color:#fff;font-size:13px;font-weight:700;
          text-decoration:none;">📧 Responder por email</a>` : ''}
        ${lead.viewerUrl ? `<a href="${lead.viewerUrl}" style="
          display:inline-block;padding:12px 20px;border-radius:10px;
          background:#334155;color:#e2e8f0;font-size:13px;font-weight:700;
          text-decoration:none;">🔗 Ver tour</a>` : ''}
      </div>

    </div>

    <!-- Footer note -->
    <div style="padding:16px 32px;background:#0f172a;border-top:1px solid #1e293b;">
      <p style="margin:0;font-size:11px;color:#475569;">
        Este lead fue capturado el ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })} a través del tour virtual.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from:    fromAddress(),
      to:      recipientEmail,
      subject,
      html:    layout(body, subject),
    });
  } catch (err) {
    console.error('[sendLeadNotification]', err);
  }
}

// ─── 2. Booking notification ──────────────────────────────────────────────────

export interface BookingEmailData {
  tourTitle: string;
  brandColor?: string;
  // Visitor data
  visitorName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  viewerUrl?: string;
}

// ─── 3. Reservation request → admin ──────────────────────────────────────────

export interface ReservationRequestEmailData {
  tourTitle:    string;
  unitLabel:    string;
  advisorName:  string;
  clientName:   string;
  clientPhone?: string;
  clientEmail?: string;
  notes?:       string;
  dashboardUrl?: string;
}

export async function sendReservationRequestToAdmin(
  data: ReservationRequestEmailData,
  recipientEmail: string
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const subject = `🏠 Solicitud de reserva — ${data.unitLabel} · ${data.tourTitle}`;

  const waLink = data.clientPhone
    ? `https://wa.me/${data.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${data.clientName}, recibimos tu solicitud de reserva para ${data.unitLabel}.`)}`
    : null;

  const body = `
    <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 32px;">
      <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.75);font-weight:600;letter-spacing:1px;text-transform:uppercase;">Nueva solicitud de reserva</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">${data.unitLabel}</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Tour: <strong>${data.tourTitle}</strong></p>
    </div>

    <div style="padding:28px 32px;">
      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#0f172a;">
          <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;">Detalles del cliente</td>
        </tr>
        <tr style="background:#1e293b;">${row('Asesor', data.advisorName)}</tr>
        <tr style="background:#1e293b;">${row('Cliente', data.clientName)}</tr>
        ${data.clientPhone ? `<tr style="background:#1e293b;">${row('Teléfono', data.clientPhone)}</tr>` : ''}
        ${data.clientEmail ? `<tr style="background:#1e293b;">${row('Email', data.clientEmail)}</tr>` : ''}
        ${data.notes ? `<tr style="background:#1e293b;">${row('Notas', `<em style="color:#cbd5e1;">"${data.notes}"</em>`)}</tr>` : ''}
      </table>

      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${waLink ? `<a href="${waLink}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#16a34a;color:#fff;font-size:13px;font-weight:700;text-decoration:none;">📱 Contactar cliente</a>` : ''}
        ${data.dashboardUrl ? `<a href="${data.dashboardUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#334155;color:#e2e8f0;font-size:13px;font-weight:700;text-decoration:none;">📋 Ver en dashboard</a>` : ''}
      </div>
    </div>

    <div style="padding:16px 32px;background:#0f172a;border-top:1px solid #1e293b;">
      <p style="margin:0;font-size:11px;color:#475569;">
        Solicitud enviada el ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({ from: fromAddress(), to: recipientEmail, subject, html: layout(body, subject) });
  } catch (err) {
    console.error('[sendReservationRequestToAdmin]', err);
  }
}

// ─── 4. Reservation status update → advisor ───────────────────────────────────

export interface ReservationStatusEmailData {
  tourTitle:      string;
  unitLabel:      string;
  status:         string;
  clientName:     string;
  internalNotes?: string;
  missingDocuments?: string[];
  dashboardUrl?:  string;
}

export async function sendReservationStatusToAdvisor(
  data: ReservationStatusEmailData,
  recipientEmail: string
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const statusCfg = RESERVATION_STATUS_LABELS[data.status] ?? { label: data.status, color: '#9ca3af', bg: '#1f2937' };
  const subject = `${statusCfg.label} — Reserva ${data.unitLabel} · ${data.tourTitle}`;

  const body = `
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:28px 32px;border-bottom:3px solid ${statusCfg.color};">
      <p style="margin:0 0 8px;">${pill(statusCfg.label, statusCfg.bg, statusCfg.color)}</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">Actualización de reserva</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">${data.unitLabel} · ${data.tourTitle}</p>
    </div>

    <div style="padding:28px 32px;">
      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#0f172a;">
          <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;">Detalle</td>
        </tr>
        <tr style="background:#1e293b;">${row('Cliente', data.clientName)}</tr>
        <tr style="background:#1e293b;">${row('Unidad', data.unitLabel)}</tr>
        <tr style="background:#1e293b;">${row('Nuevo estado', `<span style="color:${statusCfg.color};font-weight:700;">${statusCfg.label}</span>`)}</tr>
        ${data.internalNotes ? `<tr style="background:#1e293b;">${row('Notas del admin', `<em style="color:#cbd5e1;">"${data.internalNotes}"</em>`)}</tr>` : ''}
      </table>

      ${data.missingDocuments?.length ? `
      <div style="padding:16px;background:#451a03;border:1px solid #92400e;border-radius:10px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#fb923c;">📄 Documentos requeridos:</p>
        <ul style="margin:0;padding-left:18px;color:#fcd34d;font-size:13px;">
          ${data.missingDocuments.map((d) => `<li style="margin-bottom:4px;">${d}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${data.dashboardUrl ? `<a href="${data.dashboardUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#1d4ed8;color:#fff;font-size:13px;font-weight:700;text-decoration:none;">📋 Ver mis reservas</a>` : ''}
    </div>

    <div style="padding:16px 32px;background:#0f172a;border-top:1px solid #1e293b;">
      <p style="margin:0;font-size:11px;color:#475569;">
        Actualización registrada el ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({ from: fromAddress(), to: recipientEmail, subject, html: layout(body, subject) });
  } catch (err) {
    console.error('[sendReservationStatusToAdvisor]', err);
  }
}

// ─── 5. Booking notification ──────────────────────────────────────────────────

export async function sendBookingNotification(
  booking: BookingEmailData,
  recipientEmail: string
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const subject = `📅 Nueva solicitud de cita — ${booking.tourTitle}`;
  const color   = booking.brandColor ?? BRAND_COLOR;

  const waLink = booking.visitorPhone
    ? `https://wa.me/${booking.visitorPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${booking.visitorName}, recibimos tu solicitud de visita para ${booking.tourTitle}.`)}`
    : null;

  const body = `
    <!-- Header -->
    <div style="background:linear-gradient(135deg,${color},${color}cc);padding:28px 32px;">
      <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.75);font-weight:600;letter-spacing:1px;text-transform:uppercase;">Solicitud de cita</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">${booking.visitorName}</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Tour: <strong>${booking.tourTitle}</strong></p>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">

      <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #334155;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#0f172a;">
          <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;">Detalles de la solicitud</td>
        </tr>
        <tr style="background:#1e293b;">${row('Nombre', booking.visitorName)}</tr>
        ${booking.visitorPhone ? `<tr style="background:#1e293b;">${row('Teléfono', booking.visitorPhone)}</tr>` : ''}
        ${booking.visitorEmail ? `<tr style="background:#1e293b;">${row('Email', booking.visitorEmail)}</tr>` : ''}
        ${booking.preferredDate ? `<tr style="background:#1e293b;">${row('Fecha preferida', booking.preferredDate)}</tr>` : ''}
        ${booking.preferredTime ? `<tr style="background:#1e293b;">${row('Hora preferida', booking.preferredTime)}</tr>` : ''}
        ${booking.notes ? `<tr style="background:#1e293b;">${row('Notas', `<em style="color:#cbd5e1;">"${booking.notes}"</em>`)}</tr>` : ''}
      </table>

      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        ${waLink ? `<a href="${waLink}" style="
          display:inline-block;padding:12px 20px;border-radius:10px;
          background:#16a34a;color:#fff;font-size:13px;font-weight:700;
          text-decoration:none;">📱 Confirmar por WhatsApp</a>` : ''}
        ${booking.visitorEmail ? `<a href="mailto:${booking.visitorEmail}?subject=${encodeURIComponent('Tu cita en ' + booking.tourTitle)}" style="
          display:inline-block;padding:12px 20px;border-radius:10px;
          background:#1d4ed8;color:#fff;font-size:13px;font-weight:700;
          text-decoration:none;">📧 Confirmar por email</a>` : ''}
        ${booking.viewerUrl ? `<a href="${booking.viewerUrl}" style="
          display:inline-block;padding:12px 20px;border-radius:10px;
          background:#334155;color:#e2e8f0;font-size:13px;font-weight:700;
          text-decoration:none;">🔗 Ver tour</a>` : ''}
      </div>
    </div>

    <div style="padding:16px 32px;background:#0f172a;border-top:1px solid #1e293b;">
      <p style="margin:0;font-size:11px;color:#475569;">
        Solicitud recibida el ${new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}.
      </p>
    </div>
  `;

  try {
    await resend.emails.send({
      from:    fromAddress(),
      to:      recipientEmail,
      subject,
      html:    layout(body, subject),
    });
  } catch (err) {
    console.error('[sendBookingNotification]', err);
  }
}
