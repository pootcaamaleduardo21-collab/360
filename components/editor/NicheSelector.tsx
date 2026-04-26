'use client';

import { NICHE_LIST, NicheType } from '@/lib/niches';
import { cn } from '@/lib/utils';

interface NicheSelectorProps {
  value?: string;
  onChange: (niche: NicheType) => void;
}

export function NicheSelector({ value, onChange }: NicheSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-300">Tipo de negocio</p>
        {value && (
          <span className="text-[10px] text-blue-400 font-medium">
            {NICHE_LIST.find(([id]) => id === value)?.[1].emoji}{' '}
            {NICHE_LIST.find(([id]) => id === value)?.[1].label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {NICHE_LIST.map(([id, cfg]) => {
          const selected = value === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                'flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all',
                selected
                  ? 'border-blue-500 bg-blue-600/15 ring-1 ring-blue-500/50'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800'
              )}
            >
              <span className="text-xl leading-none flex-shrink-0 mt-0.5">{cfg.emoji}</span>
              <div className="min-w-0">
                <p className={cn(
                  'text-xs font-semibold leading-tight truncate',
                  selected ? 'text-blue-300' : 'text-gray-300'
                )}>
                  {cfg.label}
                </p>
                <p className="text-[9px] text-gray-500 leading-tight mt-0.5 line-clamp-2">
                  {cfg.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {!value && (
        <p className="text-[10px] text-amber-500/80 text-center pt-1">
          Selecciona un nicho para personalizar el vocabulario del tour
        </p>
      )}
    </div>
  );
}
