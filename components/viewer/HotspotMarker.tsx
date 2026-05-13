'use client';

import { Hotspot, HotspotStyle, PropertyStatus } from '@/types/tour.types';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight, Info, Image as ImageIcon, User, ShoppingCart,
  Building2, MapPin, Move,
  // Icon library — kept in sync with ICON_LIBRARY in HotspotPanel
  DoorOpen, BedDouble, Bath, ChefHat, Sofa, Tv, Dumbbell, Waves,
  Wifi, Car, Trees, Flower2, Zap, Flame, Snowflake, Wind, Sun,
  Home, Key, Store, Hotel, Warehouse, Landmark, ParkingCircle,
  School, Hospital, ShoppingBag, Coffee, Church, Star, Eye,
  HelpCircle, Heart, Bookmark, Bell, Navigation2, Compass,
  CornerUpRight, Utensils, BedSingle, Armchair, MonitorPlay,
  Sword, Package, Tag, Camera, Music, Video, FileText, Globe,
  Phone, Mail, Lock, Unlock, Settings, Wrench, Hammer, Drill,
  Leaf, Mountain, Umbrella, Sunset, Bike, Bus, Train, Plane,
} from 'lucide-react';

// ─── Icon registry — name → component (used by both Marker and Panel) ──────────
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  ArrowRight, Info, ImageIcon, User, ShoppingCart, Building2, MapPin,
  DoorOpen, BedDouble, BedSingle, Bath, ChefHat, Sofa, Armchair, Tv, MonitorPlay,
  Dumbbell, Waves, Wifi, Car, Trees, Flower2, Zap, Flame, Snowflake, Wind, Sun,
  Home, Key, Store, Hotel, Warehouse, Landmark, ParkingCircle,
  School, Hospital, ShoppingBag, Coffee, Church, Star, Eye,
  HelpCircle, Heart, Bookmark, Bell, Navigation2, Compass, CornerUpRight,
  Utensils, Package, Tag, Camera, Music, Video, FileText, Globe,
  Phone, Mail, Lock, Unlock, Settings, Wrench, Hammer, Drill,
  Leaf, Mountain, Umbrella, Sunset, Bike, Bus, Train, Plane,
};

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

// ─── Size maps ────────────────────────────────────────────────────────────────
const SIZE = {
  sm: { bubble: 'w-7 h-7',  icon: 'w-3.5 h-3.5', badge: 'w-10 h-10', badgeIcon: 'w-5 h-5',  floorBubble: 'w-6 h-6',  floorIcon: 'w-3 h-3',   ring: 60,  ringInner: 44 },
  md: { bubble: 'w-10 h-10', icon: 'w-5 h-5',    badge: 'w-14 h-14', badgeIcon: 'w-7 h-7',  floorBubble: 'w-8 h-8',  floorIcon: 'w-4 h-4',   ring: 80,  ringInner: 60 },
  lg: { bubble: 'w-13 h-13', icon: 'w-6 h-6',    badge: 'w-18 h-18', badgeIcon: 'w-9 h-9',  floorBubble: 'w-10 h-10', floorIcon: 'w-5 h-5',  ring: 100, ringInner: 76 },
} as const;

interface HotspotMarkerProps {
  hotspot: Hotspot;
  x: number | string;
  y: number | string;
  isSelected?: boolean;
  isEditing?: boolean;
  onClick: (hotspot: Hotspot) => void;
  unitStatus?: PropertyStatus;
  unitLabel?: string;
  targetSceneName?: string;
  onDragStart?: (hotspotId: string, e: React.PointerEvent) => void;
}

export function HotspotMarker({
  hotspot, x, y, isSelected, isEditing, onClick, unitStatus, unitLabel, targetSceneName, onDragStart,
}: HotspotMarkerProps) {
  const style   = hotspot.style ?? 'bubble';
  const anim    = hotspot.animation ?? 'ping';
  const showLbl = hotspot.showLabel ?? (style === 'label' ? 'always' : 'hover');
  const sz      = SIZE[hotspot.iconSize ?? 'md'];

  const defaults = TYPE_DEFAULTS[hotspot.type] ?? TYPE_DEFAULTS.info;

  // Resolve custom icon: name from registry, fallback to type default
  const ResolvedIcon: LucideIcon =
    (hotspot.customIcon && ICON_REGISTRY[hotspot.customIcon])
      ? ICON_REGISTRY[hotspot.customIcon]
      : defaults.Icon;

  const color     = hotspot.iconColor ?? (hotspot.type === 'unit' && unitStatus ? UNIT_STATUS_COLOR[unitStatus] : defaults.color);
  const ringColor = hotspot.iconColor ?? (hotspot.type === 'unit' && unitStatus ? UNIT_STATUS_COLOR[unitStatus] : defaults.ring);
  const statusLabel = hotspot.type === 'unit' && unitStatus ? UNIT_STATUS_LABEL[unitStatus] : null;
  const displayLabel = (hotspot.type === 'unit' && unitLabel) ? unitLabel : hotspot.label;

  const handleClick = (e: React.MouseEvent) => { e.stopPropagation(); onClick(hotspot); };
  const cursor = isEditing ? (isSelected ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer') : 'cursor-pointer';

  // Drop-shadow filter applied to the whole marker so it floats above any background
  const markerShadow = 'drop-shadow(0 4px 12px rgba(0,0,0,0.55)) drop-shadow(0 1px 3px rgba(0,0,0,0.8))';

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isEditing || !isSelected || !onDragStart) return;
    e.stopPropagation(); e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onDragStart(hotspot.id, e);
  };

  const EditOverlay = isEditing && isSelected ? (
    <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-900/90 border border-white/20 text-white whitespace-nowrap pointer-events-none z-30">
      <Move className="w-3 h-3 text-white/60" />
      {hotspot.type === 'navigation' && targetSceneName
        ? <span className="text-[10px] font-medium text-blue-300">→ {targetSceneName}</span>
        : <span className="text-[10px] text-white/50">arrastrar</span>}
    </div>
  ) : null;

  const showIcon = !hotspot.noIcon;

  // ─── FLOOR STYLE ──────────────────────────────────────────────────────────────
  if (style === 'floor') {
    const ringOuter = sz.ring;
    const ringInner = sz.ringInner;
    return (
      <button
        className={cn('absolute z-20 group focus:outline-none', cursor)}
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)', filter: markerShadow }}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        aria-label={displayLabel}
      >
        {EditOverlay}
        {/* Perspective-squished ring — looks flat on the floor */}
        <div style={{ transform: 'scaleY(0.38)', transformOrigin: 'center center' }}>
          {anim === 'ping' && (
            <>
              <div className="absolute rounded-full animate-ping pointer-events-none"
                style={{ width: ringOuter, height: ringOuter, top: -ringOuter/2, left: -ringOuter/2, border: `2px solid ${ringColor}`, opacity: 0.45 }} />
              <div className="absolute rounded-full animate-ping pointer-events-none"
                style={{ width: ringInner, height: ringInner, top: -ringInner/2, left: -ringInner/2, border: `2px solid ${ringColor}`, opacity: 0.6, animationDelay: '0.35s' }} />
            </>
          )}
          {anim === 'pulse' && (
            <div className="absolute rounded-full animate-pulse pointer-events-none"
              style={{ width: ringOuter, height: ringOuter, top: -ringOuter/2, left: -ringOuter/2, backgroundColor: `${ringColor}30` }} />
          )}
          {anim === 'glow' && (
            <div className="absolute rounded-full pointer-events-none"
              style={{ width: ringInner, height: ringInner, top: -ringInner/2, left: -ringInner/2, boxShadow: `0 0 18px 8px ${color}60` }} />
          )}
          {/* Main ring */}
          <div className={cn('absolute rounded-full', isSelected && 'ring-4 ring-white/60')}
            style={{ width: sz.ringInner, height: sz.ringInner, top: -sz.ringInner/2, left: -sz.ringInner/2, border: `3px solid ${color}`, backgroundColor: `${color}25` }} />
          {/* Center dot */}
          <div className="absolute rounded-full" style={{ width: sz.ringInner * 0.23, height: sz.ringInner * 0.23, top: -sz.ringInner * 0.115, left: -sz.ringInner * 0.115, backgroundColor: color }} />
        </div>

        {/* Icon bubble + label above — only when noIcon is false */}
        {!hotspot.noIcon && (
          <div className="absolute flex flex-col items-center gap-1 pointer-events-none"
            style={{ bottom: '50%', left: '50%', transform: 'translate(-50%, -14px)' }}>
            <div className={cn('flex items-center justify-center rounded-full border border-white/30', sz.floorBubble)}
              style={{ backgroundColor: color, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}>
              <ResolvedIcon className={cn(sz.floorIcon, 'text-white')} strokeWidth={2.5} />
            </div>
            {showLbl !== 'never' && (
              <span className={cn('px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap bg-gray-950/85 text-white border border-white/10',
                showLbl === 'hover' && 'opacity-0 group-hover:opacity-100 transition-opacity duration-150')}
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {displayLabel}
              </span>
            )}
          </div>
        )}

        {/* Label only (no icon bubble) */}
        {hotspot.noIcon && showLbl !== 'never' && (
          <div className="absolute flex flex-col items-center pointer-events-none"
            style={{ bottom: '50%', left: '50%', transform: 'translate(-50%, -8px)' }}>
            <span className={cn('px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap bg-gray-950/85 text-white border border-white/10',
              showLbl === 'hover' && 'opacity-0 group-hover:opacity-100 transition-opacity duration-150')}
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {displayLabel}
            </span>
          </div>
        )}
      </button>
    );
  }

  // ─── WALL STYLE ───────────────────────────────────────────────────────────────
  if (style === 'wall') {
    return (
      <button
        className={cn('absolute z-20 group focus:outline-none', cursor)}
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)', filter: markerShadow }}
        onClick={handleClick} onPointerDown={handlePointerDown} aria-label={displayLabel}
      >
        {EditOverlay}
        {anim === 'ping' && (
          <div className="absolute inset-0 rounded-xl animate-ping pointer-events-none"
            style={{ border: `2px solid ${ringColor}`, opacity: 0.35 }} />
        )}
        <div className={cn('flex items-center rounded-xl overflow-hidden shadow-xl border transition-transform group-hover:scale-105', isSelected && 'ring-2 ring-white scale-105')}
          style={{ borderColor: `${color}55`, boxShadow: anim === 'glow' ? `0 0 14px 4px ${color}55` : undefined }}>
          {!hotspot.noIcon && (
            <div className="flex items-center justify-center w-10 h-10 flex-shrink-0" style={{ backgroundColor: color }}>
              <ResolvedIcon className={cn(sz.icon, 'text-white')} strokeWidth={2.5} />
            </div>
          )}
          <div className="flex flex-col justify-center px-2.5 py-1.5 bg-gray-950/88 backdrop-blur-sm">
            <span className="text-xs font-semibold text-white whitespace-nowrap leading-tight">{displayLabel}</span>
            {statusLabel && <span className="text-[10px] leading-tight mt-0.5 font-medium" style={{ color }}>{statusLabel}</span>}
          </div>
        </div>
      </button>
    );
  }

  // ─── LABEL STYLE ──────────────────────────────────────────────────────────────
  if (style === 'label') {
    return (
      <button
        className={cn('absolute z-20 group focus:outline-none', cursor)}
        style={{ left: x, top: y, transform: 'translate(-50%, -100%)', filter: markerShadow }}
        onClick={handleClick} onPointerDown={handlePointerDown} aria-label={displayLabel}
      >
        {EditOverlay}
        <div className={cn('flex flex-col items-center transition-transform group-hover:scale-105', isSelected && 'scale-110')}>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-xl bg-white/95 backdrop-blur-sm border border-black/10">
            {!hotspot.noIcon && <ResolvedIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />}
            <span className="text-[11px] font-semibold text-gray-800 whitespace-nowrap">{displayLabel}</span>
            {hotspot.mapDistance && <span className="text-[10px] text-gray-500 whitespace-nowrap ml-0.5">· {hotspot.mapDistance}</span>}
          </div>
          <div className="w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid rgba(255,255,255,0.95)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))', marginTop: -1 }} />
          <div className="w-2.5 h-2.5 rounded-full mt-[-2px] shadow" style={{ backgroundColor: color }} />
        </div>
      </button>
    );
  }

  // ─── ICON-BADGE STYLE ─────────────────────────────────────────────────────────
  if (style === 'icon-badge') {
    return (
      <button
        className={cn('absolute z-20 group focus:outline-none flex flex-col items-center gap-1.5', cursor)}
        style={{ left: x, top: y, transform: 'translate(-50%, -50%)', filter: markerShadow }}
        onClick={handleClick} onPointerDown={handlePointerDown} aria-label={displayLabel}
      >
        {EditOverlay}
        {anim === 'ping' && (
          <div className="absolute w-14 h-14 rounded-2xl animate-ping pointer-events-none"
            style={{ border: `2px solid ${ringColor}`, opacity: 0.45 }} />
        )}
        <div className={cn('flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl border-2 transition-transform group-hover:scale-105',
          isSelected && 'ring-4 ring-white scale-110', anim === 'pulse' && 'animate-pulse')}
          style={{ backgroundColor: color, borderColor: `${ringColor}80`, boxShadow: anim === 'glow' ? `0 0 18px 6px ${color}55` : undefined }}>
          {showIcon && <ResolvedIcon className="w-7 h-7 text-white" strokeWidth={2} />}
        </div>
        {showLbl !== 'never' && (
          <span className={cn('px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap bg-black/75 text-white shadow pointer-events-none select-none',
            showLbl === 'hover' && 'opacity-0 group-hover:opacity-100 transition-opacity duration-150')}>
            {displayLabel}
          </span>
        )}
      </button>
    );
  }

  // ─── BUBBLE STYLE (default) ───────────────────────────────────────────────────
  return (
    <button
      className={cn('absolute z-20 group focus:outline-none flex flex-col items-center gap-1', cursor)}
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)', filter: markerShadow }}
      onClick={handleClick} onPointerDown={handlePointerDown} aria-label={displayLabel} title={displayLabel}
    >
      {EditOverlay}
      {anim === 'ping' && (
        <span className="absolute inline-flex h-10 w-10 rounded-full animate-ping pointer-events-none"
          style={{ backgroundColor: `${ringColor}55` }} />
      )}
      {anim === 'pulse' && (
        <span className="absolute inline-flex h-12 w-12 rounded-full animate-pulse pointer-events-none"
          style={{ backgroundColor: `${ringColor}30` }} />
      )}
      <span className={cn('relative flex items-center justify-center rounded-full border-2 transition-all duration-200', sz.bubble,
        isSelected && 'ring-4 ring-white ring-offset-1 ring-offset-black/40 scale-110')}
        style={{
          backgroundColor: color,
          borderColor: `${ringColor}80`,
          boxShadow: anim === 'glow'
            ? `0 0 14px 5px ${color}70, inset 0 1px 0 rgba(255,255,255,0.35)`
            : 'inset 0 1px 0 rgba(255,255,255,0.35)',
        }}>
        {showIcon && <ResolvedIcon className={cn(sz.icon, 'text-white')} strokeWidth={2.5} />}
      </span>
      {showLbl !== 'never' && (
        <span className={cn('px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap bg-gray-950/85 text-white backdrop-blur-sm pointer-events-none select-none border border-white/10',
          showLbl === 'hover' && 'opacity-0 group-hover:opacity-100 transition-opacity duration-150')}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
          {displayLabel}
        </span>
      )}
    </button>
  );
}
