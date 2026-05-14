'use client';

import { useState, useEffect } from 'react';
import { Tour, NavPanelItem } from '@/types/tour.types';
import { cn } from '@/lib/utils';
import { Building2, ChevronRight, ChevronDown, Eye, Home, Layers, Menu, X, ExternalLink } from 'lucide-react';

interface NavigationPanelProps {
  tour: Tour;
  currentSceneId: string;
  onNavigate: (sceneId: string) => void;
}

export function NavigationPanel({ tour, currentSceneId, onNavigate }: NavigationPanelProps) {
  // Start closed — open on desktop after mount (SSR-safe)
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (window.innerWidth >= 768) setOpen(true);
  }, []);

  const panel = tour.navPanel;
  const prototypeGroups = (tour.unitPrototypes ?? [])
    .map((prototype) => ({
      prototype,
      units: (tour.units ?? []).filter((unit) => unit.prototypeId === prototype.id && unit.sceneId),
    }))
    .filter((group) => group.units.length > 0);

  if (!panel?.enabled || (!panel.items?.length && prototypeGroups.length === 0)) return null;

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
        // Auto-close on mobile after navigating
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
    <div className="absolute top-0 left-0 h-full z-30 flex">
      {/* Panel */}
      <div
        className={cn(
          'h-full flex flex-col bg-[#080f1c]/95 backdrop-blur-xl border-r border-white/10 shadow-2xl transition-all duration-300 overflow-hidden',
          open ? 'w-[280px]' : 'w-0'
        )}
      >
        <div className="min-w-[280px] flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              {tour.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tour.logoUrl} alt="" className="h-11 w-11 rounded-2xl object-contain flex-shrink-0 bg-white/5 border border-white/10 p-1.5" />
              ) : (
                <div
                  className="h-11 w-11 rounded-2xl flex items-center justify-center border border-white/10 text-white"
                  style={{ background: tour.brandColor ? `${tour.brandColor}55` : 'rgba(37,99,235,.35)' }}
                >
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate leading-tight">
                  {panel.title ?? tour.brandName ?? tour.title}
                </p>
                <p className="text-[11px] text-white/45 truncate mt-0.5">{tour.brandName && panel.title ? tour.brandName : tour.title}</p>
              </div>
            </div>
          </div>

          {/* Hero quick action */}
          {tour.initialSceneId && (
            <div className="px-4 pt-4">
              <button
                onClick={() => onNavigate(tour.initialSceneId)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-white transition-all',
                  currentSceneId === tour.initialSceneId ? 'shadow-lg' : 'bg-white/8 hover:bg-white/12 border border-white/10'
                )}
                style={currentSceneId === tour.initialSceneId ? { background: tour.brandColor ?? '#1d4ed8' } : undefined}
              >
                <Home className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">General view</span>
              </button>
            </div>
          )}

          {/* Items */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin">
            {panel.items.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                  <Eye className="w-3.5 h-3.5" />
                  Views generales
                </div>
                <div className="space-y-1">
                  {panel.items.map((item) => (
                    <NavItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {prototypeGroups.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                  <Layers className="w-3.5 h-3.5" />
                  Prototipos
                </div>
                <div className="space-y-2">
                  {prototypeGroups.map(({ prototype, units }) => (
                    <div key={prototype.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-2">
                      <div className="px-2 pb-1.5 text-xs font-bold text-white/70">{prototype.name}</div>
                      <div className="space-y-1">
                        {units.map((unit) => {
                          const active = unit.sceneId === currentSceneId;
                          return (
                            <button
                              key={unit.id}
                              onClick={() => unit.sceneId && onNavigate(unit.sceneId)}
                              className={cn(
                                'w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold transition-colors',
                                active ? 'text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                              )}
                              style={active ? { background: tour.brandColor ? `${tour.brandColor}cc` : '#1e40afcc' } : undefined}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                              <span className="flex-1 truncate">{unit.label}</span>
                              <ChevronRight className="w-3 h-3 opacity-50" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </nav>
        </div>
      </div>

      {/* Toggle tab — min 44px tap target on mobile */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="self-start mt-20 -ml-px flex items-center justify-center w-9 h-14 md:w-8 md:h-12 bg-gray-900/90 backdrop-blur-sm border border-white/15 border-l-0 rounded-r-2xl text-white/70 hover:text-white transition-colors shadow-lg"
        title={open ? 'Cerrar panel' : 'Abrir panel'}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </div>
  );
}
