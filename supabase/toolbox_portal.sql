-- Portal público para asesores / Toolbox
-- Ejecuta este archivo una sola vez en Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS advisor_portals (
  slug          text PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       jsonb NOT NULL DEFAULT '{}'::jsonb,
  published     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE advisor_portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor portals: public reads published" ON advisor_portals;
CREATE POLICY "advisor portals: public reads published" ON advisor_portals
  FOR SELECT USING (published = true OR auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "advisor portals: owner manages" ON advisor_portals;
CREATE POLICY "advisor portals: owner manages" ON advisor_portals
  FOR ALL USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE INDEX IF NOT EXISTS advisor_portals_owner_idx
  ON advisor_portals(owner_user_id, updated_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'advisor-portal-assets',
  'advisor-portal-assets',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "advisor portal assets: public reads" ON storage.objects;
CREATE POLICY "advisor portal assets: public reads" ON storage.objects
  FOR SELECT USING (bucket_id = 'advisor-portal-assets');
