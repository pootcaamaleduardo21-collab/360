import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { cookies } from 'next/headers';

// ─── Storage bucket names ─────────────────────────────────────────────────────
export const BUCKET_SCENES = 'tour-scenes';
export const BUCKET_ASSETS = 'tour-assets';
export const BUCKET_THUMBS = 'tour-thumbs';

// ─── Env helpers ─────────────────────────────────────────────────────────────

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getEnv();
  return !!(url && key);
}

// ─── Browser client (lazy singleton) ─────────────────────────────────────────
// Used in client components and hooks.

let _browserClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_browserClient) return _browserClient;

  const { url, key } = getEnv();
  if (!url || !key) {
    throw new Error(
      '[Tour360] Supabase not configured. Copy .env.local.example → .env.local'
    );
  }

  // Use @supabase/ssr browser client so cookies are synced with middleware
  _browserClient = createBrowserClient(url, key);
  return _browserClient;
}

/** Alias kept for backwards-compatibility with storage.ts */
export { getSupabase as supabase };

// ─── Server client (for Server Components & Route Handlers) ──────────────────
// Pass the cookieStore from `next/headers` so the session is available server-side.

export function createSupabaseServerClient(
  cookieStore: ReturnType<typeof cookies>
): SupabaseClient {
  const { url, key } = getEnv();
  if (!url || !key) throw new Error('[Tour360] Supabase not configured.');

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            (cookieStore as any).set(name, value, options);
          } catch {
            // Server Components can't set cookies — safe to ignore
          }
        });
      },
    },
  });
}

// ─── Middleware client (edge-compatible) ─────────────────────────────────────

export function createSupabaseMiddlewareClient(request: Request, response: Response) {
  const { url, key } = getEnv();
  if (!url || !key) throw new Error('[Tour360] Supabase not configured.');

  return createServerClient(url, key, {
    cookies: {
      getAll: () => {
        const cookieHeader = request.headers.get('cookie') ?? '';
        return cookieHeader.split(';').map((c) => {
          const [name, ...rest] = c.trim().split('=');
          return { name: name.trim(), value: rest.join('=') };
        });
      },
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          (response.headers as any).append(
            'Set-Cookie',
            `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`
          );
        });
      },
    },
  });
}
