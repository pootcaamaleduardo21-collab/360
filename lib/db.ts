/**
 * Tour CRUD — all operations against the Supabase `tours` table.
 * The full Tour object is stored as JSONB in the `data` column.
 */

import { getSupabase } from './supabase';
import { Tour } from '@/types/tour.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TourRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  data: Tour;
  is_published: boolean;
  share_slug: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface TourSummary {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  share_slug: string | null;
  view_count: number;
  thumbnail: string | null; // derived from data.scenes[0].thumbnailUrl
  scene_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Fetch all tours for the current user (summary only, no heavy JSON). */
export async function listUserTours(): Promise<TourSummary[]> {
  const sb = getSupabase();
  // Select only `data->scenes` (PostgREST JSON path) instead of the full JSONB column.
  // PostgREST returns the extracted value with key `scenes` in each row.
  const { data, error } = await sb
    .from('tours')
    .select('id, title, description, is_published, share_slug, view_count, created_at, updated_at, data->scenes')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id:           row.id,
    title:        row.title,
    description:  row.description,
    is_published: row.is_published,
    share_slug:   row.share_slug,
    view_count:   row.view_count,
    created_at:   row.created_at,
    updated_at:   row.updated_at,
    thumbnail:    row.scenes?.[0]?.thumbnailUrl ?? row.scenes?.[0]?.imageUrl ?? null,
    scene_count:  row.scenes?.length ?? 0,
  }));
}

/**
 * Fetch only scene id→name pairs for a tour. Much lighter than getTourById()
 * when you only need to resolve scene names (e.g. LeadsPanel).
 */
export async function getTourSceneNames(id: string): Promise<Map<string, string>> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tours')
    .select('data->scenes')
    .eq('id', id)
    .single();

  if (error || !data) return new Map();
  const scenes: { id: string; name: string }[] = (data as any).scenes ?? [];
  return new Map(scenes.map((s) => [s.id, s.name]));
}

/** Fetch a single tour by its UUID (requires ownership or published). */
export async function getTourById(id: string): Promise<TourRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tours')
    .select('*')
    .eq('id', id)
    .single();

  if (error?.code === 'PGRST116') return null; // not found
  if (error) throw new Error(error.message);
  return data as TourRow;
}

/** Fetch a published tour by its slug (public viewer). */
export async function getTourBySlug(slug: string): Promise<TourRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tours')
    .select('*')
    .eq('share_slug', slug)
    .eq('is_published', true)
    .single();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);

  // Increment view count (fire-and-forget)
  sb.rpc('increment_tour_views', { tour_id: data.id }).then(() => {});

  return data as TourRow;
}

/** CRM record — a unit enriched with its tour name and id for the CRM panel. */
export interface CRMUnit {
  tourId: string;
  tourTitle: string;
  unit: import('@/types/tour.types').PropertyUnit;
}

/** Fetch all tours and extract every unit, keyed by tour. Used in the CRM dashboard panel. */
export async function listToursWithUnits(): Promise<CRMUnit[]> {
  const sb = getSupabase();
  // Select only `data->units` instead of the full JSONB column.
  const { data, error } = await sb
    .from('tours')
    .select('id, title, data->units')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  const result: CRMUnit[] = [];
  for (const row of (data ?? []) as any[]) {
    const units: import('@/types/tour.types').PropertyUnit[] = row.units ?? [];
    for (const unit of units) {
      result.push({ tourId: row.id, tourTitle: row.title, unit });
    }
  }
  return result;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/** Create a new tour row. Returns the generated UUID. */
export async function createTour(tour: Tour): Promise<string> {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await sb
    .from('tours')
    .insert({
      user_id:     user.id,
      title:       tour.title,
      description: tour.description ?? null,
      data:        tour,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/** Upsert (save) a tour — creates if new, updates if exists. */
export async function saveTour(tour: Tour): Promise<void> {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await sb
    .from('tours')
    .upsert(
      {
        id:          tour.id,
        user_id:     user.id,
        title:       tour.title,
        description: tour.description ?? null,
        data:        tour,
      },
      { onConflict: 'id' }
    );

  if (error) throw new Error(error.message);
}

/** Delete a tour — verifies ownership before deleting (defense-in-depth; RLS also enforces this). */
export async function deleteTour(id: string): Promise<void> {
  const sb = getSupabase();

  // App-level ownership check: fetch the tour first and confirm it belongs to the caller.
  // Even if someone bypasses the UI, RLS on the DELETE will also block cross-user deletes.
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: row } = await sb.from('tours').select('user_id').eq('id', id).single();
  if (!row) throw new Error('Tour not found');
  if (row.user_id !== user.id) throw new Error('Forbidden: tour belongs to another user');

  const { error } = await sb.from('tours').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Publishing ───────────────────────────────────────────────────────────────

export interface PublishOptions {
  isPublished: boolean;
  shareSlug?: string;
}

export async function updateTourPublishing(id: string, opts: PublishOptions): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('tours')
    .update({
      is_published: opts.isPublished,
      share_slug:   opts.shareSlug ?? null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** Generate a URL-safe slug from a title */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}
