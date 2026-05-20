'use client';

import { AnnotationOverlay } from '@/types/tour.types';
import { cn } from '@/lib/utils';

interface ProjectedAnnotation {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  scale: number;
}

interface AnnotationsOverlayProps {
  annotations: AnnotationOverlay[];
  projectedAnnotations: ProjectedAnnotation[];
  selectedOverlayId?: string | null;
  onSelectOverlay?: (id: string) => void;
  isEditing?: boolean;
}

function isTransparentColor(color: string): boolean {
  return color === 'transparent' || /rgba\([^)]*,\s*0\)$/i.test(color.replace(/\s+/g, ''));
}

export function AnnotationsOverlay({
  annotations,
  projectedAnnotations,
  selectedOverlayId,
  onSelectOverlay,
  isEditing = false,
}: AnnotationsOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[18]">
      {annotations.map((annotation) => {
        const projected = projectedAnnotations.find((item) => item.id === annotation.id);
        if (!projected?.visible) return null;

        const selected = isEditing && selectedOverlayId === annotation.id;
        const style = annotation.style;
        const hasText = annotation.contentType !== 'image' && !!annotation.text?.trim();
        const hasImage = annotation.contentType !== 'text' && !!annotation.imageUrl?.trim();
        const transparentBackground = isTransparentColor(style.backgroundColor);
        const transparentBorder = isTransparentColor(style.borderColor);
        const floatingText = hasText && !hasImage && transparentBackground;

        return (
          <button
            key={annotation.id}
            type="button"
            onClick={(event) => {
              if (!isEditing || !onSelectOverlay) return;
              event.stopPropagation();
              onSelectOverlay(annotation.id);
            }}
            className={cn(
              'absolute origin-center -translate-x-1/2 -translate-y-1/2 text-left transition-transform',
              isEditing ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none',
              selected && 'ring-2 ring-white/80'
            )}
            style={{
              left: projected.x,
              top: projected.y,
              width: style.width,
              opacity: style.opacity,
              transform: `translate(-50%, -50%) scale(${projected.scale})`,
              borderRadius: style.radius,
              background: style.backgroundColor,
              border: transparentBorder ? 'none' : `1px solid ${style.borderColor}`,
              boxShadow: style.shadow && !floatingText ? '0 18px 45px rgba(0,0,0,0.38), 0 4px 12px rgba(0,0,0,0.28)' : undefined,
              backdropFilter: !transparentBackground && style.backgroundColor.includes('rgba') ? 'blur(10px)' : undefined,
            }}
            aria-label={annotation.label || 'Anotación'}
          >
            {hasImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={annotation.imageUrl}
                alt={annotation.label || 'Anotación'}
                className={cn('block w-full object-cover', hasText ? 'rounded-t-[inherit]' : 'rounded-[inherit]')}
                style={{ maxHeight: style.width * 0.75 }}
              />
            )}
            {hasText && (
              <div
                className={cn(
                  'whitespace-pre-wrap break-words font-semibold leading-snug',
                  floatingText ? 'px-0 py-0' : 'px-3 py-2'
                )}
                style={{
                  color: style.textColor,
                  fontSize: style.fontSize,
                  textShadow: style.shadow
                    ? '0 3px 12px rgba(0,0,0,0.92), 0 1px 2px rgba(0,0,0,0.85)'
                    : undefined,
                }}
              >
                {annotation.text}
              </div>
            )}
            {isEditing && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-gray-950/90 px-2 py-0.5 text-[10px] font-medium text-white/70 shadow-lg">
                anotación 3D
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
