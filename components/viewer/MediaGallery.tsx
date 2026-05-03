'use client';

import { useState, useCallback } from 'react';
import { GalleryItem } from '@/types/tour.types';
import {
  X, ChevronLeft, ChevronRight, Image, Film,
  FileText, Download, ExternalLink, Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Media viewer modal ───────────────────────────────────────────────────────

interface MediaGalleryProps {
  items: GalleryItem[];
  brochureUrl?: string;
  brochureFilename?: string;
  brandColor?: string;
  onClose: () => void;
}

function isYoutube(url: string) {
  return url.includes('youtube.com/embed/') || url.includes('youtu.be/');
}

export function MediaGallery({
  items,
  brochureUrl,
  brochureFilename,
  brandColor,
  onClose,
}: MediaGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setActiveIdx((i) => (i + 1) % items.length), [items.length]);

  const active = items[activeIdx] as GalleryItem | undefined;
  const accent = brandColor ?? '#3b82f6';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">
            {active?.title ?? (active?.type === 'video' ? 'Video' : 'Imagen')}
          </span>
          {items.length > 1 && (
            <span className="text-xs text-gray-500">{activeIdx + 1} / {items.length}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Brochure download */}
          {brochureUrl && (
            <a
              href={brochureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: accent }}
            >
              <FileText className="w-3.5 h-3.5" />
              {brochureFilename ? 'Ver brochure' : 'Descargar PDF'}
            </a>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Viewer area */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          {active?.type === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.url}
              alt={active.title ?? ''}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          )}

          {active?.type === 'video' && isYoutube(active.url) && (
            <div className="w-full max-w-3xl aspect-video rounded-xl overflow-hidden">
              <iframe
                src={active.url + '?autoplay=1&rel=0'}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}

          {active?.type === 'video' && !isYoutube(active.url) && (
            <video
              src={active.url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-xl"
            />
          )}

          {!active && items.length === 0 && brochureUrl && (
            <div className="flex flex-col items-center gap-4 text-center">
              <FileText className="w-16 h-16 text-gray-600" />
              <p className="text-gray-400 text-sm">Este tour solo tiene un brochure adjunto.</p>
              <a
                href={brochureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: accent }}
              >
                <ExternalLink className="w-4 h-4" />
                Abrir brochure
              </a>
            </div>
          )}

          {/* Prev / Next arrows */}
          {items.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip (sidebar on wide, bottom row on narrow) */}
        {items.length > 1 && (
          <div className="w-24 flex-shrink-0 border-l border-white/10 overflow-y-auto flex flex-col gap-2 p-2">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setActiveIdx(idx)}
                className={cn(
                  'relative w-full aspect-video rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors',
                  idx === activeIdx ? 'border-white/60' : 'border-transparent hover:border-white/20'
                )}
              >
                {item.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    {item.thumbnail
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      : <Film className="w-4 h-4 text-gray-500" />}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile brochure bar */}
      {brochureUrl && (
        <div className="sm:hidden flex-shrink-0 border-t border-white/10 p-3">
          <a
            href={brochureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            <Download className="w-4 h-4" />
            Descargar brochure
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Trigger button (used inside Viewer360) ───────────────────────────────────

interface MediaGalleryButtonProps {
  itemCount: number;
  hasBrochure: boolean;
  brandColor?: string;
  onClick: () => void;
}

export function MediaGalleryButton({
  itemCount,
  hasBrochure,
  brandColor,
  onClick,
}: MediaGalleryButtonProps) {
  if (itemCount === 0 && !hasBrochure) return null;
  const accent = brandColor ?? '#3b82f6';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
      style={{ backgroundColor: accent + 'cc', backdropFilter: 'blur(8px)' }}
    >
      {hasBrochure && itemCount === 0
        ? <><FileText className="w-3.5 h-3.5" /> Brochure</>
        : hasBrochure
        ? <><Image    className="w-3.5 h-3.5" /> Galería · PDF</>
        : <><Image    className="w-3.5 h-3.5" /> Galería ({itemCount})</>
      }
    </button>
  );
}
