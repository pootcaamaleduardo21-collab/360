'use client';

import { Hotspot } from '@/types/tour.types';
import { useTourStore } from '@/store/tourStore';
import { formatCurrency } from '@/lib/utils';
import { X, Phone, Mail, Globe, ShoppingCart, ExternalLink } from 'lucide-react';

interface HotspotModalProps {
  hotspot: Hotspot;
  currentSceneId: string;
  onClose: () => void;
  onNavigate?: (sceneId: string) => void;
}

export function HotspotModal({ hotspot, currentSceneId, onClose, onNavigate }: HotspotModalProps) {
  const addToCart = useTourStore((s) => s.addToCart);

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content per type */}
        {hotspot.type === 'navigation' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">Navegar a</h3>
            <p className="text-gray-600 mb-4">{hotspot.label}</p>
            <button
              onClick={() => {
                if (hotspot.targetSceneId) onNavigate?.(hotspot.targetSceneId);
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
            >
              Ir a esta habitación
            </button>
          </div>
        )}

        {hotspot.type === 'info' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-3">{hotspot.label}</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {hotspot.infoText ?? 'Sin descripción.'}
            </p>
          </div>
        )}

        {hotspot.type === 'media' && hotspot.media && (
          <div>
            {hotspot.media.type === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hotspot.media.url}
                alt={hotspot.media.title ?? hotspot.label}
                className="w-full object-cover max-h-64"
              />
            )}
            {hotspot.media.type === 'video' && (
              <video
                src={hotspot.media.url}
                controls
                className="w-full max-h-64 bg-black"
              />
            )}
            {hotspot.media.type === 'audio' && (
              <div className="p-6 pb-0">
                <audio src={hotspot.media.url} controls className="w-full" />
              </div>
            )}
            <div className="p-5">
              {hotspot.media.title && (
                <h3 className="font-semibold text-base mb-1">{hotspot.media.title}</h3>
              )}
              {hotspot.media.description && (
                <p className="text-sm text-gray-600">{hotspot.media.description}</p>
              )}
            </div>
          </div>
        )}

        {hotspot.type === 'agent' && hotspot.agent && (
          <div className="p-6 flex gap-4">
            {hotspot.agent.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hotspot.agent.photoUrl}
                alt={hotspot.agent.name}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-gray-500">
                  {hotspot.agent.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight">{hotspot.agent.name}</h3>
              {hotspot.agent.title && (
                <p className="text-sm text-gray-500 mb-3">{hotspot.agent.title}</p>
              )}
              {hotspot.agent.agency && (
                <p className="text-sm font-medium text-gray-700 mb-2">{hotspot.agent.agency}</p>
              )}
              <div className="space-y-1.5">
                {hotspot.agent.phone && (
                  <a
                    href={`tel:${hotspot.agent.phone}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {hotspot.agent.phone}
                  </a>
                )}
                {hotspot.agent.email && (
                  <a
                    href={`mailto:${hotspot.agent.email}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {hotspot.agent.email}
                  </a>
                )}
                {hotspot.agent.website && (
                  <a
                    href={hotspot.agent.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <ExternalLink className="w-3 h-3" />
                    Sitio web
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {hotspot.type === 'product' && hotspot.product && (
          <div>
            {hotspot.product.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hotspot.product.imageUrl}
                alt={hotspot.product.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-base">{hotspot.product.name}</h3>
                <span className="text-lg font-bold text-rose-600 whitespace-nowrap">
                  {formatCurrency(hotspot.product.price, hotspot.product.currency)}
                </span>
              </div>
              {hotspot.product.description && (
                <p className="text-sm text-gray-600 mb-4">{hotspot.product.description}</p>
              )}
              <button
                onClick={() => {
                  addToCart(hotspot.product!, currentSceneId, hotspot.id);
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Agregar a cotización
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
