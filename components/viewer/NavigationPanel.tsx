'use client';

import { useState } from 'react';
import { Tour, NavPanelItem } from '@/types/tour.types';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Menu, X, ExternalLink } from 'lucide-react';

interface NavigationPanelProps {
  tour: Tour;
  currentSceneId: string;
  onNavigate: (sceneId: string) => void;
}

export function NavigationPanel({ tour, currentSceneId, onNavigate }: NavigationPanelProps) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const panel = tour.navPanel;
  if (!panel?.enabled || !panel.items?.length) return null;

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const isActiveScene = (item: NavPanelItem): boolean => {
    if (item.type === 'scene' && item.sceneId === currentSceneId) return true;
    return item.children?.some(isActiveScene) ?? false;
  };

  function NavItem({ item, depth = 0 }: { item: NavPanelItem; depth?: number }) {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded  = expanded.has(item.id);
    const isActive    = item.type === 'scene' && item.sceneId === currentSceneId;
    const parentActive = !isActive && isActiveScene(item);

    const handleClick = () => {
      if (hasChildren) {
        toggleExpand(item.id);
      } else if (item.type === 'scene' && item.sceneId) {
        onNavigate(item.sceneId);
      } else if (item.type === 'external' && item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    };

    return (
      <div>
        <button
          onClick={handleClick}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 text-left',
            depth === 0 ? 'text-[13px]' : 'text-[12px]',
            depth > 0 && 'ml-3 w-[calc(100%-12px)]',
            isActive
              ? 'text-white font-semibold'
              : parentActive
                ? 'text-white/90'
                : 'text-white/60 hover:text-white hover:bg-white/10'
          )}
          style={isActive ? { background: tour.brandColor ? `${tour.brandColor}cc` : '#1e40afcc' } : undefined}
        >
          {item.icon && (
            <span className="text-base leading-none flex-shrink-0 w-5 text-center">
              {item.icon}
            </span>
          )}
          <span className="flex-1 truncate">{item.label}</span>
          {item.type === 'external' && !hasChildren && (
            <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0" />
          )}
          {hasChildren && (
            isExpanded
              ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
              : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map((child) => (
              <NavItem key={child.id} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 h-full z-30 flex">
      {/* Panel */}
      <div
        className={cn(
          'h-full flex flex-col bg-gray-950/90 backdrop-blur-md border-r border-white/10 shadow-2xl transition-all duration-300 overflow-hidden',
          open ? 'w-56' : 'w-0'
        )}
      >
        <div className="min-w-56 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3 py-3 border-b border-white/10 flex-shrink-0">
            {tour.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tour.logoUrl} alt="" className="h-7 w-7 rounded-lg object-contain flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-white truncate leading-tight">
                {panel.title ?? tour.title}
              </p>
              {tour.brandName && panel.title && (
                <p className="text-[9px] text-white/40 truncate">{tour.brandName}</p>
              )}
            </div>
          </div>

          {/* Items */}
          <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
            {panel.items.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </nav>
        </div>
      </div>

      {/* Toggle tab */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="self-start mt-16 -ml-px flex items-center justify-center w-5 h-10 bg-gray-900/80 backdrop-blur-sm border border-white/10 border-l-0 rounded-r-lg text-white/50 hover:text-white transition-colors shadow"
        title={open ? 'Cerrar panel' : 'Abrir panel'}
      >
        {open ? <X className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
      </button>
    </div>
  );
}
