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
  const { data, error } = await sb
    .from('tours')
    .select('id, title, description, is_published, share_slug, view_count, created_at, updated_at, data')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id:           row.id,
    title:        row.title,
    description:  row.description,
    is_published: row.is_published,
    share_slug:   row.share_slug,
    view_count:   row.view_count,
    created_at:   row.created_at,
    updated_at:   row.updated_at,
    thumbnail:    row.data?.scenes?.[0]?.thumbnailUrl ?? row.data?.scenes?.[0]?.imageUrl ?? null,
    scene_count:  row.data?.scenes?.length ?? 0,
  }));
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

/** Delete a tour and its storage files. */
export async function deleteTour(id: string): Promise<void> {
  const sb = getSupabase();
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
