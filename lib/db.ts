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
  thumbnail_url: string | null;
  first_scene_url: string | null;
  scene_count: number;
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

function getTourLightFields(tour: Tour) {
  const firstScene = tour.scenes?.[0];
  return {
    thumbnail_url:    firstScene?.thumbnailUrl ?? null,
    first_scene_url:  firstScene?.imageUrl ?? null,
    scene_count:      tour.scenes?.length ?? 0,
  };
}

function getTourWritePayload(tour: Tour, userId: string, includeLightFields = true) {
  return {
    user_id:     userId,
    title:       tour.title,
    description: tour.description ?? null,
    data:        tour,
    ...(includeLightFields ? getTourLightFields(tour) : {}),
  };
}

function toTourSummary(row: any): TourSummary {
  return {
    id:           row.id,
    title:        row.title,
    description:  row.description,
    is_published: row.is_published,
    share_slug:   row.share_slug,
    view_count:   row.view_count,
    created_at:   row.created_at,
    updated_at:   row.updated_at,
    thumbnail:    row.thumbnail_url ?? row.first_scene_url ?? null,
    scene_count:  row.scene_count ?? 0,
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Fetch lightweight tour rows for the dashboard; avoid transferring heavy tour JSON. */
export async function listUserTours(): Promise<TourSummary[]> {
  const sb = getSupabase();
  const lightResult = await sb
    .from('tours')
    .select('id, title, description, is_published, share_slug, view_count, thumbnail_url, first_scene_url, scene_count, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (!lightResult.error) {
    return (lightResult.data ?? []).map(toTourSummary);
  }

  // Migration-safe fallback: keeps the dashboard working before light columns
  // have been applied in Supabase, without fetching heavy tour JSON.
  const { data, error } = await sb
    .from('tours')
    .select('id, title, description, is_published, share_slug, view_count, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map(toTourSummary);
}

/**
 * Fetch only scene id→name pairs for a tour. Lighter than getTourById()
 * because it skips all metadata columns — only the data JSONB is transferred.
 */
export async function getTourSceneNames(id: string): Promise<Map<string, string>> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('tours')
    .select('data')
    .eq('id', id)
    .single();

  if (error || !data) return new Map();
  const scenes: { id: string; name: string }[] = data.data?.scenes ?? [];
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
  const { data, error } = await sb
    .from('tours')
    .select('id, title, data')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  const result: CRMUnit[] = [];
  for (const row of data ?? []) {
    const units: import('@/types/tour.types').PropertyUnit[] = row.data?.units ?? [];
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
  const { data: { session } } = await sb.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  let result = await sb
    .from('tours')
    .insert(getTourWritePayload(tour, user.id))
    .select('id')
    .single();

  if (result.error) {
    result = await sb
      .from('tours')
      .insert(getTourWritePayload(tour, user.id, false))
      .select('id')
      .single();
  }

  const { data, error } = result;
  if (error) throw new Error(error.message);
  return data.id;
}

/** Upsert (save) a tour — creates if new, updates if exists. */
export async function saveTour(tour: Tour): Promise<void> {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  let result = await sb
    .from('tours')
    .upsert(
      {
        id:          tour.id,
        ...getTourWritePayload(tour, user.id),
      },
      { onConflict: 'id' }
    );

  if (result.error) {
    result = await sb
      .from('tours')
      .upsert(
        {
          id:          tour.id,
          ...getTourWritePayload(tour, user.id, false),
        },
        { onConflict: 'id' }
      );
  }

  const { error } = result;
  if (error) throw new Error(error.message);
}

/** Delete a tour — verifies ownership before deleting (defense-in-depth; RLS also enforces this). */
export async function deleteTour(id: string): Promise<void> {
  const sb = getSupabase();

  // App-level ownership check: fetch the tour first and confirm it belongs to the caller.
  // Even if someone bypasses the UI, RLS on the DELETE will also block cross-user deletes.
  const { data: { session } } = await sb.auth.getSession();
  const user = session?.user;
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
