'use client';

import { Hotspot, HotspotStyle, PropertyStatus } from '@/types/tour.types';
import { cn } from '@/lib/utils';
import {
  ArrowRight, Info, Image as ImageIcon, User, ShoppingCart,
  Building2, MapPin,
} from 'lucide-react';

interface HotspotMarkerProps {
  hotspot: Hotspot;
  x: number | string;
  y: number | string;
  isSelected?: boolean;
  isEditing?: boolean;
  onClick: (hotspot: Hotspot) => void;
  /** Passed by Viewer360 for 'unit' hotspots — drives the status color */
  unitStatus?: PropertyStatus;
}

// ─── Type → icon + default colors ─────────────────────────────────────────────
const TYPE_DEFAULTS = {
  navigation: { Icon: ArrowRight,    color: '#3b82f6', ring: '#60a5fa' },
  info:       { Icon: Info,          color: '#f59e0b', ring: '#fbbf24' },
  media:      { Icon: ImageIcon,     color: '#a855f7', ring: '#c084fc' },
  agent:      { Icon: User,          color: '#22c55e', ring: '#4ade80' },
  product:    { Icon: ShoppingCart,  color: '#f43f5e', ring: '#fb7185' },
  unit:       { Icon: Building2,     color: '#10b981', ring: '#34d399' },
  map:        { Icon: MapPin,        color: '#ef4444', ring: '#f87171' },
} as const;

const UNIT_STATUS_COLOR: Record<PropertyStatus, string> = {
  available:    '#10b981',
  reserved:     '#f59e0b',
  sold:         '#ef4444',
  'in-process': '#3b82f6',
};

const UNIT_STATUS_LABEL: Record<PropertyStatus, string> = {
  available:    'Disponible',
  reserved:     'Reservado',
  sold:         'Vendido',
  'in-process': 'En proceso',
};

// ─── Main component ───────────────────────────────────────────────────────────

export function HotspotMarker({
  hotspot,
  x,
  y,
  isSelected,
  isEditing,
  onClick,
  unitStatus,
}: HotspotMarkerProps) {
  const style   = hotspot.style ?? 'bubble';
  const anim    = hotspot.animation ?? (style === 'floor' ? 'ping' : 'ping');
  const showLbl = hotspot.showLabel ?? (style === 'label' ? 'always' : 'hover');

  const defaults = TYPE_DEFAULTS[hotspot.type] ?? TYPE_DEFAULTS.info;
  const { Icon } = defaults;

  // Unit hotspots inherit color from availability status
  const color     = hotspot.iconColor ?? (hotspot.type === 'unit' && unitStatus ? UNIT_STATUS_COLOR[unitStatus] : defaults.color);
  const ringColor = hotspot.iconColor ?? (hotspot.type === 'unit' && unitStatus ? UNIT_STATUS_COLOR[unitStatus] : defaults.ring);

  const statusLabel = hotspot.type === 'unit' && unitStatus ? UNIT_STATUS_LABEL[unitStatus] : null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(hotspot);
  };

  const cursor = isEditing ? 'cursor-crosshair' : 'cursor-pointer';

  // Shared icon node
  const IconNode = hotspot.customIcon
    ? <span className="leading-none select-none">{hotspot.customIcon}</span>
    : <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />;

  // ─── FLOOR STYLE ────────────────────────────────────────────────────────────
  if (style === 'floor') {
    return (
      <button
        className={cn('absolute z-20 group focus:outline-none', cursor)}
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
        onClick={handleClick}
        aria-label={hotspot.label}
      >
        {/* Perspective-squished ring — looks flat on the floor */}
        <div style={{ transform: 'scaleY(0.38)', transformOrigin: 'center center' }}>
          {/* Outer animated ping rings */}
          {anim === 'ping' && (
            <>
              <div
                className="absolute rounded-full animate-ping pointer-events-none"
                style={{
                  width: 80, height: 80,
                  top: -40, left: -40,
                  border: `2px solid ${ringColor}`,
                  opacity: 0.45,
                }}
              />
              <div
                className="absolute rounded-full animate-ping pointer-events-none"
                style={{
                  width: 60, height: 60,
                  top: -30, left: -30,
                  border: `2px solid ${ringColor}`,
                  opacity: 0.6,
                  animationDelay: '0.35s',
                }}
              />
            </>
          )}

          {/* Main ring */}
          <div
            className={cn('absolute rounded-full', isSelected && 'ring-4 ring-white/60')}
            style={{
              width: 44, height: 44,
              top: -22, left: -22,
              border: `3px solid ${color}`,
              backgroundColor: `${color}25`,
            }}
          />

          {/* Center dot */}
          <div
            className="absolute rounded-full"
            style={{
              width: 10, height: 10,
              top: -5, left: -5,
              backgroundColor: color,
            }}
          />
        </div>

        {/* Icon + label float above — NOT transformed */}
        <div
          className="absolute flex flex-col items-center gap-1 pointer-events-none"
          style={{ bottom: '50%', left: '50%', transform: 'translate(-50%, -14px)' }}
        >
          {/* Mini icon bubble */}
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border border-white/20"
            style={{ backgroundColor: color }}
          >
            {hotspot.customIcon
              ? <span className="text-sm leading-none select-none">{hotspot.customIcon}</span>
              : <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
            }
          </div>

          {/* Label */}
          {showLbl !== 'never' && (
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap bg-black/75 text-white shadow',
                showLbl === 'hover' && 'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
              )}
            >
              {hotspot.label}
            </span>
          )}
        </div>
      </button>
    );
  }

  // ─── WALL STYLE ──────────────────────────────────────────────────────────────
  if (style === 'wall') {
    return (
      <button
        className={cn('absolute z-20 group focus:outline-none', cursor)}
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
        onClick={handleClick}
        aria-label={hotspot.label}
      >
        {/* Ping / glow decorations behind the badge */}
        {anim === 'ping' && (
          <div
            className="absolute inset-0 rounded-xl animate-ping pointer-events-none"
            style={{ border: `2px solid ${ringColor}`, opacity: 0.35 }}
          />
        )}

        {/* Badge */}
        <div
          className={cn(
            'flex items-center rounded-xl overflow-hidden shadow-xl border transition-transform',
            'group-hover:scale-105',
            isSelected && 'ring-2 ring-white scale-105'
          )}
          style={{
            borderColor: `${color}55`,
            boxShadow: anim === 'glow' ? `0 0 14px 4px ${color}55` : undefined,
          }}
        >
          {/* Left: colored icon block */}
          <div
            className="flex items-center justify-center w-10 h-10 flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {hotspot.customIcon
              ? <span className="text-base leading-none select-none">{hotspot.customIcon}</span>
              : <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
            }
          </div>

          {/* Right: text block */}
          <div className="flex flex-col justify-center px-2.5 py-1.5 bg-gray-950/88 backdrop-blur-sm">
            <span className="text-xs font-semibold text-white whitespace-nowrap leading-tight">
              {hotspot.label}
            </span>
            {statusLabel && (
              <span className="text-[10px] leading-tight mt-0.5 font-medium" style={{ color }}>
                {statusLabel}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  // ─── LABEL STYLE (Google Maps POI) ───────────────────────────────────────────
  if (style === 'label') {
    return (
      <button
        className={cn('absolute z-20 group focus:outline-none', cursor)}
        style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}
        onClick={handleClick}
        aria-label={hotspot.label}
      >
        <div
          className={cn(
            'flex flex-col items-center transition-transform group-hover:scale-105',
            isSelected && 'scale-110'
          )}
        >
          {/* Text pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-xl bg-white/95 backdrop-blur-sm border border-black/10"
          >
            {hotspot.customIcon
              ? <span className="text-sm leading-none select-none">{hotspot.customIcon}</span>
              : <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
            }
            <span className="text-[11px] font-semibold text-gray-800 whitespace-nowrap">
              {hotspot.label}
            </span>
            {hotspot.mapDistance && (
              <span className="text-[10px] text-gray-500 whitespace-nowrap ml-0.5">
                · {hotspot.mapDistance}
              </span>
            )}
          </div>

          {/* Downward-pointing triangle */}
          <div
            className="w-0 h-0"
            style={{
              borderLeft:  '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop:   '8px solid rgba(255,255,255,0.95)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
              marginTop: -1,
            }}
          />

          {/* Pin anchor dot */}
          <div
            className="w-2.5 h-2.5 rounded-full mt-[-2px] shadow"
            style={{ backgroundColor: color }}
          />
        </div>
      </button>
    );
  }

  // ─── ICON-BADGE STYLE ────────────────────────────────────────────────────────
  if (style === 'icon-badge') {
    return (
      <button
        className={cn('absolute z-20 group focus:outline-none flex flex-col items-center gap-1.5', cursor)}
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
        onClick={handleClick}
        aria-label={hotspot.label}
      >
        {/* Ping rings */}
        {anim === 'ping' && (
          <div
            className="absolute w-14 h-14 rounded-2xl animate-ping pointer-events-none"
            style={{ border: `2px solid ${ringColor}`, opacity: 0.45 }}
          />
        )}

        {/* Large icon square */}
        <div
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl border-2 transition-transform group-hover:scale-105',
            isSelected && 'ring-4 ring-white scale-110',
            anim === 'pulse' && 'animate-pulse'
          )}
          style={{
            backgroundColor: color,
            borderColor: `${ringColor}80`,
            boxShadow: anim === 'glow' ? `0 0 18px 6px ${color}55` : undefined,
          }}
        >
          {hotspot.customIcon
            ? <span className="text-2xl leading-none select-none">{hotspot.customIcon}</span>
            : <Icon className="w-7 h-7 text-white" strokeWidth={2} />
          }
        </div>

        {/* Label */}
        {showLbl !== 'never' && (
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap bg-black/75 text-white shadow pointer-events-none select-none',
              showLbl === 'hover' && 'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
            )}
          >
            {hotspot.label}
          </span>
        )}
      </button>
    );
  }

  // ─── BUBBLE STYLE (default) ───────────────────────────────────────────────────
  return (
    <button
      className={cn('absolute z-20 group focus:outline-none flex flex-col items-center gap-1', cursor)}
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      onClick={handleClick}
      aria-label={hotspot.label}
      title={hotspot.label}
    >
      {/* Animated ring behind bubble */}
      {anim === 'ping' && (
        <span
          className="absolute inline-flex h-10 w-10 rounded-full animate-ping pointer-events-none"
          style={{ backgroundColor: `${ringColor}55` }}
        />
      )}
      {anim === 'pulse' && (
        <span
          className="absolute inline-flex h-12 w-12 rounded-full animate-pulse pointer-events-none"
          style={{ backgroundColor: `${ringColor}30` }}
        />
      )}

      {/* Main circle */}
      <span
        className={cn(
          'relative flex items-center justify-center w-10 h-10 rounded-full border-2 shadow-lg transition-all duration-200',
          isSelected && 'ring-4 ring-white ring-offset-1 ring-offset-black/40 scale-110'
        )}
        style={{
          backgroundColor: color,
          borderColor: `${ringColor}80`,
          boxShadow: anim === 'glow' ? `0 0 14px 5px ${color}70` : undefined,
        }}
      >
        {hotspot.customIcon
          ? <span className="text-base leading-none select-none">{hotspot.customIcon}</span>
          : <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
        }
      </span>

      {/* Label */}
      {showLbl !== 'never' && (
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap bg-black/70 text-white backdrop-blur-sm pointer-events-none select-none',
            showLbl === 'hover' && 'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
          )}
        >
          {hotspot.label}
        </span>
      )}
    </button>
  );
}
