'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/i18n';

interface LangSwitcherProps {
  lang: Lang;
  onChangeLang: (l: Lang) => void;
  /** Position class — defaults to bottom-left above the chat bubble area */
  className?: string;
}

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'es', flag: '🇲🇽', label: 'Español' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
];

export function LangSwitcher({ lang, onChangeLang, className }: LangSwitcherProps) {
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div className={cn('absolute z-40', className)}>
      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-2 left-0 bg-gray-900/95 border border-gray-700 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { onChangeLang(l.code); setOpen(false); }}
              className={cn(
                'flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap',
                l.code === lang
                  ? 'bg-blue-600/20 text-blue-300'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              <span className="text-base leading-none">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}

      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all text-xs font-medium"
        title="Idioma / Language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="text-sm leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{lang.toUpperCase()}</span>
      </button>

      {/* Click outside to close */}
      {open && (
        <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
