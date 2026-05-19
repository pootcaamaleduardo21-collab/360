'use client';

import { useState, useEffect } from 'react';
import { Tour, NavPanelItem } from '@/types/tour.types';
import { cn } from '@/lib/utils';
import { Building2, ChevronRight, ChevronDown, Home, Menu, X, ExternalLink } from 'lucide-react';

interface NavigationPanelProps {
  tour: Tour;
  currentSceneId: string;
  onNavigate: (sceneId: string) => void;
}

export function NavigationPanel({ tour, currentSceneId, onNavigate }: NavigationPanelProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (window.innerWidth >= 768) setOpen(true);
  }, []);

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

  const hasInitialSceneItem = (items: NavPanelItem[]): boolean =>
    items.some((item) =>
      (item.type === 'scene' && item.sceneId === tour.initialSceneId) ||
      (item.children ? hasInitialSceneItem(item.children) : false)
    );

  const showHomeQuickAction = !!tour.initialSceneId && !hasInitialSceneItem(panel.items);

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
        if (window.innerWidth < 768) setOpen(false);
      } else if (item.type === 'external' && item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    };

    return (
      <div>
        <button
          onClick={handleClick}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 text-left',
            depth === 0 ? 'text-[13px]' : 'text-[12px]',
            depth > 0 && 'ml-4 w-[calc(100%-16px)] rounded-xl py-2',
            isActive
              ? 'text-white font-semibold'
              : parentActive
                ? 'text-white/90'
                : 'text-white/60 hover:text-white hover:bg-white/10'
          )}
          style={isActive ? { background: tour.brandColor ? `${tour.brandColor}cc` : '#1e40afcc' } : undefined}
        >
          {item.icon && (
            <span className="text-base leading-none flex-shrink-0 w-6 text-center">
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
    <div className="absolute top-3 left-3 z-30">

      {/* Collapsed toggle — floating pill button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-900/90 backdrop-blur-sm border border-white/15 text-white/70 hover:text-white transition-all shadow-lg',
          open ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
        )}
        title="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Floating panel */}
      <div
        className={cn(
          'absolute top-0 left-0 flex flex-col',
          'bg-[#080f1c]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl',
          'transition-all duration-300 origin-top-left',
          open
            ? 'w-[270px] opacity-100 scale-100 pointer-events-auto'
            : 'w-[270px] opacity-0 scale-95 pointer-events-none'
        )}
        style={{ maxHeight: 'min(500px, calc(100dvh - 80px))' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 flex items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {tour.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tour.logoUrl}
                alt=""
                className="h-10 w-10 rounded-xl object-contain flex-shrink-0 bg-white/5 border border-white/10 p-1"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center border border-white/10 flex-shrink-0 text-white"
                style={{ background: tour.brandColor ? `${tour.brandColor}55` : 'rgba(37,99,235,.35)' }}
              >
                <Building2 className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white truncate leading-tight">
                {panel.title ?? tour.brandName ?? tour.title}
              </p>
              <p className="text-[11px] text-white/40 truncate mt-0.5">
                {tour.brandName && panel.title ? tour.brandName : tour.title}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Cerrar panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Home quick-action */}
        {showHomeQuickAction && (
          <div className="px-3 pt-3 flex-shrink-0">
            <button
              onClick={() => onNavigate(tour.initialSceneId)}
              className={cn(
                'w-full flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-bold text-white transition-all',
                currentSceneId === tour.initialSceneId
                  ? 'shadow-lg'
                  : 'bg-white/8 hover:bg-white/12 border border-white/10'
              )}
              style={
                currentSceneId === tour.initialSceneId
                  ? { background: tour.brandColor ?? '#1d4ed8' }
                  : undefined
              }
            >
              <Home className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Vista general</span>
            </button>
          </div>
        )}

        {/* Navigation items — fully configured by admin in editor */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-thin min-h-0">
          {panel.items.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </div>
  );
}
