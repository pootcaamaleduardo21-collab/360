/**
 * Lead capture — stores visitor contact requests in Supabase.
 *
 * Requires a `leads` table (see supabase/migrations.sql):
 *   - Anyone (anon) can INSERT
 *   - Only the tour owner can SELECT (via RLS)
 *
 * All functions fail silently — a missing table never breaks the viewer.
 */

import { getSupabase } from './supabase';

export interface LeadPayload {
  tourId: string;
  sceneId?: string;
  name: string;
  phone?: string;
  email?: string;
  message?: string;
  // UTM attribution
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface Lead {
  id: string;
  tour_id: string;
  scene_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  created_at: string;
}

/** Fire-and-forget insert — never throws. */
export async function submitLead(payload: LeadPayload): Promise<void> {
  try {
    await getSupabase().from('leads').insert({
      tour_id:      payload.tourId,
      scene_id:     payload.sceneId    ?? null,
      name:         payload.name,
      phone:        payload.phone      ?? null,
      email:        payload.email      ?? null,
      message:      payload.message    ?? null,
      utm_source:   payload.utm_source   ?? null,
      utm_medium:   payload.utm_medium   ?? null,
      utm_campaign: payload.utm_campaign ?? null,
      utm_content:  payload.utm_content  ?? null,
      utm_term:     payload.utm_term     ?? null,
    });
  } catch {
    // Silently ignore — table may not exist yet
  }
}

/** Fetch leads for all tours owned by the current user. */
export async function getLeadsForUser(): Promise<Lead[]> {
  try {
    const { data, error } = await getSupabase()
      .from('leads')
      .select('*, tours!inner(user_id)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as Lead[];
  } catch {
    return [];
  }
}

/** Fetch leads for a specific tour (owner-only via RLS). */
export async function getLeadsForTour(tourId: string): Promise<Lead[]> {
  try {
    const { data, error } = await getSupabase()
      .from('leads')
      .select('*')
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as Lead[];
  } catch {
    return [];
  }
}
