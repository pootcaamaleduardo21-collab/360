import 'server-only';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_TOOLBOX_CONTENT,
  TOOLBOX_SLUG,
  sanitizeToolboxContent,
  type ToolboxContent,
} from './toolbox';

export async function getPublicToolboxContent(): Promise<ToolboxContent> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return DEFAULT_TOOLBOX_CONTENT;

  try {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client
      .from('advisor_portals')
      .select('content')
      .eq('slug', TOOLBOX_SLUG)
      .eq('published', true)
      .maybeSingle();

    if (error || !data?.content) return DEFAULT_TOOLBOX_CONTENT;
    return sanitizeToolboxContent(data.content);
  } catch {
    return DEFAULT_TOOLBOX_CONTENT;
  }
}
