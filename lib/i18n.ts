/**
 * Viewer i18n — lightweight translation for visitor-facing UI.
 * Admin/editor UI is always in Spanish.
 *
 * Usage (client-side):
 *   const { t, lang, setLang } = useViewerLang();
 *   <button>{t('share')}</button>
 */

export type Lang = 'es' | 'en';

export const VIEWER_STRINGS = {
  es: {
    // Navigation
    compare:        'Comparar',
    exitCompare:    'Salir comparación',
    share:          'Compartir',
    copyLink:       'Copiar enlace',
    linkCopied:     '¡Enlace copiado!',
    sendWhatsapp:   'Enviar por WhatsApp',

    // AI / voice
    chatQuestion:   '¿Tienes preguntas?',
    voiceTalk:      'Habla con nosotros',

    // Lead / booking
    requestInfo:    'Solicitar información',
    scheduleVisit:  'Agendar visita',

    // Password gate
    passwordTitle:  'Tour privado',
    passwordHint:   'Ingresa la contraseña para acceder.',
    passwordLabel:  'Contraseña',
    passwordCta:    'Acceder',
    passwordWrong:  'Contraseña incorrecta. Intenta de nuevo.',

    // General
    loading:        'Cargando…',
    notFound:       'Tour no encontrado',
    notFoundSub:    'Este tour no existe o no está publicado.',
    scenes:         'escenas',
    available:      'disponibles',
    explore:        'Explorar →',
  },
  en: {
    compare:        'Compare',
    exitCompare:    'Exit comparison',
    share:          'Share',
    copyLink:       'Copy link',
    linkCopied:     'Link copied!',
    sendWhatsapp:   'Send via WhatsApp',

    chatQuestion:   'Any questions?',
    voiceTalk:      'Talk to us',

    requestInfo:    'Request info',
    scheduleVisit:  'Schedule visit',

    passwordTitle:  'Private tour',
    passwordHint:   'Enter the password to access this tour.',
    passwordLabel:  'Password',
    passwordCta:    'Access',
    passwordWrong:  'Wrong password. Please try again.',

    loading:        'Loading…',
    notFound:       'Tour not found',
    notFoundSub:    'This tour does not exist or is not published.',
    scenes:         'scenes',
    available:      'available',
    explore:        'Explore →',
  },
} as const;

export type ViewerStringKey = keyof typeof VIEWER_STRINGS['es'];

/** Read language preference from localStorage (client only). */
export function getStoredLang(): Lang {
  if (typeof window === 'undefined') return 'es';
  const stored = localStorage.getItem('eleva360_lang');
  return stored === 'en' ? 'en' : 'es';
}

/** Persist language preference. */
export function storeLang(lang: Lang): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('eleva360_lang', lang);
}
