'use client';

import Link from 'next/link';
import { TourSummary } from '@/lib/db';
import {
  Globe, Lock, Eye, Layers, ExternalLink,
  MessageCircle, BarChart2, CheckCircle,
  Clock, XCircle, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdvisorViewProps {
  tours:   TourSummary[];
  userName?: string;
}

const UNIT_STATUS_STYLE = {
  available:  { label: 'Disponible',   icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  reserved:   { label: 'Reservado',    icon: <Clock       className="w-3.5 h-3.5" />, color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30'   },
  sold:       { label: 'Vendido',      icon: <XCircle     className="w-3.5 h-3.5" />, color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30'       },
  'in-process': { label: 'En proceso', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30'     },
};

export function AdvisorView({ tours, userName }: AdvisorViewProps) {
  const published = tours.filter((t) => t.is_published);
  const drafts    = tours.filter((t) => !t.is_published);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600/15 to-blue-600/10 border border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-xl font-black text-white">
            {userName?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              Hola{userName ? `, ${userName.split(' ')[0]}` : ''}
            </h2>
            <p className="text-sm text-gray-400">
              Tienes <strong className="text-emerald-400">{published.length}</strong> tour{published.length !== 1 ? 's' : ''} activo{published.length !== 1 ? 's' : ''} para compartir con clientes.
            </p>
          </div>
        </div>
      </div>

      {/* Quick-share list */}
      {published.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Tours listos para compartir
          </h3>
          {published.map((tour) => (
            <AdvisorTourRow key={tour.id} tour={tour} />
          ))}
        </div>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Borradores
          </h3>
          {drafts.map((tour) => (
            <AdvisorTourRow key={tour.id} tour={tour} />
          ))}
        </div>
      )}

      {tours.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Globe className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-sm">No hay tours asignados aún.</p>
          <p className="text-xs mt-1">Contacta a tu administrador para que publique un tour.</p>
        </div>
      )}

      {/* Tips */}
      <div className="p-5 rounded-2xl bg-gray-900 border border-gray-800 space-y-3">
        <h3 className="text-sm font-bold text-gray-300">Consejos para asesores</h3>
        <ul className="space-y-2">
          {[
            'Comparte el link del tour antes de la visita para generar expectativa.',
            'Usa el botón "Enviar info" en cada unidad para mandar specs por WhatsApp.',
            'El link ?unit=ID abre directamente la ficha de una unidad específica.',
            'El QR del tour es ideal para imprimir en material de venta físico.',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-gray-500">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Tour row for advisors ────────────────────────────────────────────────────

function AdvisorTourRow({ tour }: { tour: TourSummary }) {
  const baseUrl  = typeof window !== 'undefined' ? window.location.origin : '';
  const viewerUrl = `${baseUrl}/viewer/${tour.share_slug ?? tour.id}`;

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`🏠 *${tour.title}*\nTour virtual 360° completo:\n${viewerUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(viewerUrl);
  };

  return (
    <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800 flex items-center gap-4">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
        {tour.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tour.thumbnail} alt={tour.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-5 h-5 text-gray-600" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-200 truncate">{tour.title}</p>
          <span className={cn(
            'flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
            tour.is_published ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-700 border-gray-600 text-gray-500'
          )}>
            {tour.is_published ? <><Globe className="w-2.5 h-2.5" /> Activo</> : <><Lock className="w-2.5 h-2.5" /> Borrador</>}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span><Layers className="w-3 h-3 inline mr-0.5" />{tour.scene_count} escenas</span>
          {tour.is_published && <span><Eye className="w-3 h-3 inline mr-0.5" />{tour.view_count} vistas</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {tour.is_published && (
          <>
            <button
              onClick={handleWhatsApp}
              title="Compartir por WhatsApp"
              className="w-8 h-8 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] flex items-center justify-center transition-colors border border-[#25D366]/20"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <a
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver tour"
              className="w-8 h-8 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition-colors border border-blue-500/20"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <Link
              href={`/dashboard/analytics/${tour.id}`}
              title="Analytics"
              className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors border border-gray-700"
            >
              <BarChart2 className="w-4 h-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
