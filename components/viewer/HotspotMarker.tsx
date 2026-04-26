'use client';

import { Hotspot, PropertyStatus } from '@/types/tour.types';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Info,
  Image,
  User,
  ShoppingCart,
  Building2,
} from 'lucide-react';

interface HotspotMarkerProps {
  hotspot: Hotspot;
  x: number;
  y: number;
  isSelected?: boolean;
  isEditing?: boolean;
  onClick: (hotspot: Hotspot) => void;
  /** Passed by Viewer360 for 'unit' hotspots — drives the status color */
  unitStatus?: PropertyStatus;
}

const TYPE_CONFIG = {
  navigation: {
    icon: ArrowRight,
    bg: 'bg-blue-500 hover:bg-blue-400',
    border: 'border-blue-300',
  },
  info: {
    icon: Info,
    bg: 'bg-amber-500 hover:bg-amber-400',
    border: 'border-amber-300',
  },
  media: {
    icon: Image,
    bg: 'bg-purple-500 hover:bg-purple-400',
    border: 'border-purple-300',
  },
  agent: {
    icon: User,
    bg: 'bg-green-500 hover:bg-green-400',
    border: 'border-green-300',
  },
  product: {
    icon: ShoppingCart,
    bg: 'bg-rose-500 hover:bg-rose-400',
    border: 'border-rose-300',
  },
  unit: {
    icon: Building2,
    bg: 'bg-emerald-500 hover:bg-emerald-400', // default (overridden by status)
    border: 'border-emerald-300',
  },
} as const;

const UNIT_STATUS_BG: Record<PropertyStatus, string> = {
  available:    'bg-emerald-500 hover:bg-emerald-400',
  reserved:     'bg-amber-500  hover:bg-amber-400',
  sold:         'bg-red-500    hover:bg-red-400',
  'in-process': 'bg-blue-500   hover:bg-blue-400',
};

const UNIT_STATUS_BORDER: Record<PropertyStatus, string> = {
  available:    'border-emerald-300',
  reserved:     'border-amber-300',
  sold:         'border-red-300',
  'in-process': 'border-blue-300',
};

export function HotspotMarker({
  hotspot,
  x,
  y,
  isSelected,
  isEditing,
  onClick,
  unitStatus,
}: HotspotMarkerProps) {
  const cfg  = TYPE_CONFIG[hotspot.type] ?? TYPE_CONFIG.info;
  const Icon = cfg.icon;

  // For unit hotspots, override colors based on unit availability status
  const bg     = hotspot.type === 'unit' && unitStatus ? UNIT_STATUS_BG[unitStatus]     : cfg.bg;
  const border = hotspot.type === 'unit' && unitStatus ? UNIT_STATUS_BORDER[unitStatus] : cfg.border;

  return (
    <button
      className={cn(
        'absolute -translate-x-1/2 -translate-y-1/2 z-20',
        'flex flex-col items-center gap-1',
        'group focus:outline-none'
      )}
      style={{ left: x, top: y }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(hotspot);
      }}
      title={hotspot.label}
      aria-label={`Hotspot: ${hotspot.label}`}
    >
      {/* Pulse ring */}
      <span
        className={cn(
          'absolute inline-flex h-10 w-10 rounded-full opacity-60 animate-ping',
          bg.split(' ')[0]
        )}
      />

      {/* Main button */}
      <span
        className={cn(
          'relative flex items-center justify-center',
          'w-10 h-10 rounded-full border-2 shadow-lg',
          'transition-all duration-200',
          bg,
          border,
          isSelected && 'ring-4 ring-white ring-offset-1 ring-offset-black/50 scale-110',
          isEditing && 'cursor-crosshair'
        )}
      >
        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
      </span>

      {/* Label tooltip */}
      <span
        className={cn(
          'px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap',
          'bg-black/70 text-white backdrop-blur-sm',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          'pointer-events-none select-none'
        )}
      >
        {hotspot.label}
      </span>
    </button>
  );
}
