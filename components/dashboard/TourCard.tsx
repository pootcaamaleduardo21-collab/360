'use client';

import Link from 'next/link';
import { TourSummary } from '@/lib/db';
import { Globe, Lock, Eye, Layers, MoreVertical, Pencil, Trash2, Copy, ExternalLink, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';

interface TourCardProps {
  tour: TourSummary;
  onDelete:  (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function TourCard({ tour, onDelete, onDuplicate }: TourCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
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
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
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
          {tour.is_published ? (
            <><Globe className="w-2.5 h-2.5" /> Publicado</>
          ) : (
            <><Lock className="w-2.5 h-2.5" /> Borrador</>
          )}
        </span>
      </div>

      {/* Menu button */}
      <div ref={menuRef} className="absolute top-3 right-3">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 z-20 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <Link
              href={`/editor?id=${tour.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Link>
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
          {tour.is_published && (
            <Link
              href={`/dashboard/analytics/${tour.id}`}
              className="flex items-center gap-1 hover:text-blue-400 transition-colors"
              title="Ver analytics"
            >
              <Eye className="w-3 h-3" /> {tour.view_count.toLocaleString()}
            </Link>
          )}
          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}
