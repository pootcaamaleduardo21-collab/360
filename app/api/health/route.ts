import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/health
 * Temporary diagnostic endpoint — checks Supabase connectivity from Vercel.
 * Safe: only returns connectivity status, never exposes secrets.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: 'env_missing',
      has_url: !!url,
      has_key: !!key,
    }, { status: 500 });
  }

  try {
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Lightweight auth check — doesn't require a real account
    const { error } = await sb.auth.signInWithPassword({
      email: 'health-check@tour360.internal',
      password: 'not-a-real-password',
    });

    // "Invalid login credentials" means Supabase IS reachable — that's success
    const reachable = !error || error.message.toLowerCase().includes('invalid');

    return NextResponse.json({
      ok: reachable,
      supabase_url: url.slice(0, 40) + '…',
      anon_key_prefix: key.slice(0, 20) + '…',
      supabase_response: error?.message ?? 'no error (unexpected)',
    });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      error: 'fetch_failed',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
