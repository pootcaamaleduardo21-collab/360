-- ═══════════════════════════════════════════════════════════════════════════
-- Tour360 · Supabase setup SQL
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Tours table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tours (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        text NOT NULL DEFAULT 'Sin título',
  description  text,
  data         jsonb NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  share_slug   text UNIQUE,
  view_count   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Index for fast slug lookups (public viewer)
CREATE INDEX IF NOT EXISTS tours_slug_idx       ON tours(share_slug) WHERE share_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS tours_user_id_idx    ON tours(user_id);
CREATE INDEX IF NOT EXISTS tours_published_idx  ON tours(is_published) WHERE is_published = true;

-- ── 2. Increment view count (RPC used by viewer) ─────────────────────────────
CREATE OR REPLACE FUNCTION increment_tour_views(tour_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE tours SET view_count = view_count + 1 WHERE id = tour_id;
END;
$$;

-- ── 3. Analytics events table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_events (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id    uuid REFERENCES tours(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,  -- 'scene_view' | 'unit_click' | 'cta_click' | 'booking_request' | etc.
  scene_id   text,
  unit_id    text,
  metadata   jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tour_events_tour_idx ON tour_events(tour_id, created_at DESC);

-- ── 4. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

-- Owners can do everything with their tours
CREATE POLICY "tours: owner full access" ON tours
  FOR ALL USING (auth.uid() = user_id);

-- Published tours are publicly readable (viewer page)
CREATE POLICY "tours: public read if published" ON tours
  FOR SELECT USING (is_published = true);

-- Anyone (including anon) can insert analytics events
ALTER TABLE tour_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events: anyone can insert" ON tour_events
  FOR INSERT WITH CHECK (true);

-- Only tour owner can read their events
CREATE POLICY "events: owner can read" ON tour_events
  FOR SELECT USING (
    tour_id IN (SELECT id FROM tours WHERE user_id = auth.uid())
  );

-- ── 5. Storage buckets ───────────────────────────────────────────────────────
-- Run separately in Supabase Dashboard → Storage if needed:
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('tour-scenes', 'tour-scenes', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('tour-assets', 'tour-assets', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('tour-thumbs', 'tour-thumbs', true);

-- ── 6. Set a user as super_admin ─────────────────────────────────────────────
-- Replace 'tu@email.com' with your actual email, then run this query.
--
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'),
--   '{role}',
--   '"super_admin"'
-- )
-- WHERE email = 'tu@email.com';

-- ── 7. Set a user as advisor ─────────────────────────────────────────────────
-- UPDATE auth.users
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'),
--   '{role}',
--   '"advisor"'
-- )
-- WHERE email = 'asesor@email.com';

-- ── 8. Verify user roles ─────────────────────────────────────────────────────
-- SELECT email, raw_user_meta_data->>'role' AS role FROM auth.users ORDER BY created_at;
