'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  type Lang, type ViewerStringKey,
  VIEWER_STRINGS, getStoredLang, storeLang,
} from '@/lib/i18n';

export function useViewerLang() {
  const [lang, setLangState] = useState<Lang>('es');

  // Hydrate from localStorage after mount
  useEffect(() => {
    setLangState(getStoredLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storeLang(l);
  }, []);

  const t = useCallback(
    (key: ViewerStringKey): string => VIEWER_STRINGS[lang][key],
    [lang]
  );

  return { lang, setLang, t };
}
