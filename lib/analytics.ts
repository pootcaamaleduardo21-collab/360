/**
 * Lightweight analytics layer.
 *
 * Requires a `tour_events` table in Supabase:
 *   CREATE TABLE tour_events (
 *     id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     tour_id     uuid REFERENCES tours(id) ON DELETE CASCADE,
 *     event_type  text NOT NULL,
 *     scene_id    text,
 *     unit_id     text,
 *     metadata    jsonb,
 *     created_at  timestamptz DEFAULT now()
 *   );
 *   CREATE INDEX tour_events_tour_idx ON tour_events(tour_id, created_at DESC);
 *
 * All functions fail silently — missing table or auth errors never break the viewer.
 */

import { getSupabase } from './supabase';

export type AnalyticsEvent =
  | 'scene_view'
  | 'unit_click'
  | 'cta_click'
  | 'booking_request'
  | 'brochure_download'
  | 'gallery_open'
  | 'share_click';

interface TrackPayload {
  tourId: string;
  event: AnalyticsEvent;
  sceneId?: string;
  unitId?: string;
  metadata?: Record<string, unknown>;
}

/** Fire-and-forget event tracking. Never throws. */
export async function trackEvent(payload: TrackPayload): Promise<void> {
  try {
    const sb = getSupabase();
    await sb.from('tour_events').insert({
      tour_id:    payload.tourId,
      event_type: payload.event,
      scene_id:   payload.sceneId ?? null,
      unit_id:    payload.unitId  ?? null,
      metadata:   payload.metadata ?? null,
    });
  } catch {
    // Silently ignore — table may not exist yet
  }
}

// ─── Read / Aggregation ───────────────────────────────────────────────────────

export interface TourAnalytics {
  totalViews: number;
  last30Days: DayCount[];
  topScenes: SceneStat[];
  eventCounts: Record<AnalyticsEvent, number>;
}

export interface DayCount  { date: string; count: number }
export interface SceneStat { sceneId: string; count: number }

export async function getTourAnalytics(tourId: string): Promise<TourAnalytics> {
  try {
    const sb = getSupabase();

    // All events for this tour in the last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await sb
      .from('tour_events')
      .select('event_type, scene_id, created_at')
      .eq('tour_id', tourId)
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (error || !rows) {
      return emptyAnalytics();
    }

    // Total views from tours table
    const { data: tourRow } = await sb
      .from('tours')
      .select('view_count')
      .eq('id', tourId)
      .single();

    const totalViews = tourRow?.view_count ?? 0;

    // Daily counts (last 30 days)
    const dayMap: Record<string, number> = {};
    for (const row of rows) {
      const day = row.created_at.slice(0, 10);
      dayMap[day] = (dayMap[day] ?? 0) + 1;
    }
    const last30Days: DayCount[] = Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top scenes
    const sceneMap: Record<string, number> = {};
    for (const row of rows) {
      if (row.event_type === 'scene_view' && row.scene_id) {
        sceneMap[row.scene_id] = (sceneMap[row.scene_id] ?? 0) + 1;
      }
    }
    const topScenes: SceneStat[] = Object.entries(sceneMap)
      .map(([sceneId, count]) => ({ sceneId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Event type counts
    const eventCounts = emptyEventCounts();
    for (const row of rows) {
      const et = row.event_type as AnalyticsEvent;
      if (et in eventCounts) eventCounts[et]++;
    }

    return { totalViews, last30Days, topScenes, eventCounts };
  } catch {
    return emptyAnalytics();
  }
}

function emptyEventCounts(): Record<AnalyticsEvent, number> {
  return {
    scene_view:       0,
    unit_click:       0,
    cta_click:        0,
    booking_request:  0,
    brochure_download: 0,
    gallery_open:     0,
    share_click:      0,
  };
}

function emptyAnalytics(): TourAnalytics {
  return { totalViews: 0, last30Days: [], topScenes: [], eventCounts: emptyEventCounts() };
}
