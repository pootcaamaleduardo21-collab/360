-- ═══════════════════════════════════════════════════════════════════════════
-- Tour360 · Supabase setup SQL
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Profiles table (auto-created on signup via trigger) ───────────────────
-- Stores display name and plan. Readable ONLY by the owner.
-- (If you already have a profiles table from schema.sql, skip this block.)
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  avatar_url text,
  plan       text NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'enterprise'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ⚠️  Each user can ONLY read and update their own profile.
--      The old "Profiles are publicly readable" policy in schema.sql is too broad
--      and leaks full_name + plan to other users. Replace it with this:
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;

CREATE POLICY "profiles: owner read"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
-- Creates the three public buckets required for image uploads.
-- Safe to re-run: INSERT ... ON CONFLICT DO NOTHING

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('tour-scenes', 'tour-scenes', true, 52428800, ARRAY['image/jpeg','image/png','image/webp']),
  ('tour-assets', 'tour-assets', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav']),
  ('tour-thumbs', 'tour-thumbs', true, 5242880,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── 5a. Storage RLS policies ─────────────────────────────────────────────────
-- Public read (images are served publicly)
CREATE POLICY "storage: public read scenes"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'tour-scenes' );

CREATE POLICY "storage: public read assets"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'tour-assets' );

CREATE POLICY "storage: public read thumbs"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'tour-thumbs' );

-- Authenticated users can upload/update/delete only their own files
-- Convention: files are stored under {user_id}/<filename>
CREATE POLICY "storage: owner upload scenes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tour-scenes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: owner upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tour-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: owner upload thumbs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tour-thumbs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: owner delete scenes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tour-scenes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: owner delete assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tour-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage: owner delete thumbs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tour-thumbs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

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
