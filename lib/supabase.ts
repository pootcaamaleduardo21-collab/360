import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ─── Storage bucket names ─────────────────────────────────────────────────────
export const BUCKET_SCENES = 'tour-scenes';   // equirectangular images
export const BUCKET_ASSETS = 'tour-assets';   // logos, media files
export const BUCKET_THUMBS = 'tour-thumbs';   // thumbnails (generated)

// ─── Lazy singleton ───────────────────────────────────────────────────────────
// We don't initialize at module load so that Next.js build doesn't throw
// when env vars are absent (e.g. CI without secrets, or local without .env.local).

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[Tour360] Supabase not configured. Copy .env.local.example → .env.local and fill in your credentials.'
    );
  }

  _client = createClient(url, key);
  return _client;
}

/** Returns true when Supabase env vars are present */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Convenience re-export for callers that need the client directly */
export { getSupabase as supabase };
