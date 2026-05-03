'use client';

import Link from 'next/link';
import { TourSummary } from '@/lib/db';
import {
  Globe, Lock, Eye, Layers, MoreVertical, Pencil, Trash2,
  Copy, ExternalLink, BarChart2, QrCode, Share2, Check,
  MessageCircle, X, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useCallback } from 'react';
import QRCodeLib from 'qrcode';

interface TourCardProps {
  tour: TourSummary;
  onDelete:    (id: string) => void;
  onDuplicate?: (id: string) => void;
}

// ─── Share / QR Modal ─────────────────────────────────────────────────────────

function ShareModal({ tour, onClose }: { tour: TourSummary; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied,    setCopied]    = useState(false);

  const tourUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/viewer/${tour.id}`
    : `/viewer/${tour.id}`;

  // Generate QR code on mount
  useEffect(() => {
    QRCodeLib.toDataURL(tourUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => {});
  }, [tourUrl]);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(tourUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tourUrl]);

  const shareWhatsApp = useCallback(() => {
    const text = `🏠 *${tour.title}*\n\nExplora el recorrido virtual 360° aquí:\n${tourUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [tour.title, tourUrl]);

  const downloadQR = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href     = qrDataUrl;
    a.download = `qr-${tour.title.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }, [qrDataUrl, tour.title]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-white text-sm">Compartir tour</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Tour title */}
          <p className="text-sm text-gray-300 font-medium truncate">{tour.title}</p>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white rounded-2xl p-3 shadow-lg">
              {qrDataUrl
                ? <img src={qrDataUrl} alt="QR Code" className="w-52 h-52" />
                : <div className="w-52 h-52 flex items-center justify-center bg-gray-100 rounded-xl">
                    <QrCode className="w-10 h-10 text-gray-300 animate-pulse" />
                  </div>
              }
            </div>
            <p className="text-xs text-gray-500 text-center">
              Escanea para abrir el tour en cualquier dispositivo
            </p>
            <button
              onClick={downloadQR}
              disabled={!qrDataUrl}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> Descargar QR (PNG)
            </button>
          </div>

          {/* URL + copy */}
          <div className="flex items-center gap-2 p-2.5 bg-gray-800 rounded-xl border border-gray-700">
            <span className="flex-1 text-xs text-gray-400 truncate font-mono">{tourUrl}</span>
            <button
              onClick={copyLink}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0',
                copied
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
              )}
            >
              {copied ? <><Check className="w-3 h-3" /> Copiado</> : <><Copy className="w-3 h-3" /> Copiar</>}
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* WhatsApp */}
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-sm font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>

            {/* Ver tour */}
            <Link
              href={`/viewer/${tour.id}`}
              target="_blank"
              onClick={onClose}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 text-sm font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver tour
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tour Card ────────────────────────────────────────────────────────────────

export function TourCard({ tour, onDelete, onDuplicate }: TourCardProps) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formattedDate = new Date(tour.updated_at).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <>
      {shareOpen && <ShareModal tour={tour} onClose={() => setShareOpen(false)} />}

      <div className="group relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all hover:shadow-xl hover:shadow-black/20">
        {/* Thumbnail */}
        <Link href={`/editor?id=${tour.id}`} className="block">
          <div className="w-full h-40 bg-gray-800 overflow-hidden">
            {tour.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tour.thumbnail}
                alt={tour.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Layers className="w-10 h-10 text-gray-700" />
              </div>
            )}
          </div>
        </Link>

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
              tour.is_published
                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : 'bg-gray-800/80 border-gray-700 text-gray-500'
            )}
          >
            {tour.is_published
              ? <><Globe className="w-2.5 h-2.5" /> Publicado</>
              : <><Lock className="w-2.5 h-2.5" /> Borrador</>
            }
          </span>
        </div>

        {/* Share button — quick access, always visible on published tours */}
        {tour.is_published && (
          <button
            onClick={() => setShareOpen(true)}
            className="absolute top-3 right-10 w-7 h-7 flex items-center justify-center rounded-lg bg-black/50 hover:bg-[#25D366]/70 text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            title="Compartir"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Menu button */}
        <div ref={menuRef} className="absolute top-3 right-3">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
              <Link
                href={`/editor?id=${tour.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Link>

              {/* Share / QR */}
              <button
                onClick={() => { setShareOpen(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" /> QR + Compartir
              </button>

              {tour.is_published && (
                <Link
                  href={`/viewer/${tour.id}`}
                  target="_blank"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver publicado
                </Link>
              )}
              {onDuplicate && (
                <button
                  onClick={() => { onDuplicate(tour.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </button>
              )}
              <Link
                href={`/dashboard/analytics/${tour.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Analytics
              </Link>
              <div className="border-t border-gray-800 my-1" />
              <button
                onClick={() => { onDelete(tour.id); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <Link href={`/editor?id=${tour.id}`}>
            <h3 className="font-semibold text-gray-100 truncate hover:text-blue-400 transition-colors">
              {tour.title}
            </h3>
          </Link>
          {tour.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tour.description}</p>
          )}

          <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" /> {tour.scene_count} escena{tour.scene_count !== 1 ? 's' : ''}
            </span>
            {tour.is_published ? (
              <Link
                href={`/dashboard/analytics/${tour.id}`}
                className="flex items-center gap-1 hover:text-blue-400 transition-colors"
                title="Ver analytics"
              >
                <Eye className="w-3 h-3" /> {tour.view_count.toLocaleString()}
              </Link>
            ) : null}
            <span>{formattedDate}</span>
          </div>

          {/* Share row — compact, always visible for published */}
          {tour.is_published && (
            <button
              onClick={() => setShareOpen(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartir · QR Code
            </button>
          )}
        </div>
      </div>
    </>
  );
}
