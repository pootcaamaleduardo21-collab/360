/**
 * UTM parameter utilities.
 * Reads utm_source / utm_medium / utm_campaign / utm_content / utm_term from the URL,
 * persists them in sessionStorage, and exposes them for analytics events and leads.
 */

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  [key: string]: string | undefined;
}

const STORAGE_KEY = 'tour360_utms';

/** Read UTMs from current URL and persist to sessionStorage. Call once on viewer mount. */
export function captureUTMs(): UTMParams {
  if (typeof window === 'undefined') return {};

  const sp = new URLSearchParams(window.location.search);
  const params: UTMParams = {};

  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
  let found = false;
  for (const key of keys) {
    const val = sp.get(key);
    if (val) { params[key] = val; found = true; }
  }

  if (found) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch { /* ignore */ }
    return params;
  }

  // Fall back to previously stored UTMs (user navigated within the tour)
  return getStoredUTMs();
}

/** Retrieve UTMs stored during this session (without re-reading the URL). */
export function getStoredUTMs(): UTMParams {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
