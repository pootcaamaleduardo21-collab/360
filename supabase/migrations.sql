-- ══════════════════════════════════════════════════════════════════════════════
-- Tour360 — DB Migrations
-- Corre esto en: Supabase Dashboard → SQL Editor → New query → Run
--
-- Estas migraciones son IDEMPOTENTES: pueden correrse varias veces sin error.
-- ══════════════════════════════════════════════════════════════════════════════


-- ─── Migration 1: Leads table (Feature: Lead Capture Form) ───────────────────
--
-- Almacena los datos de contacto que los visitantes envían desde el viewer.
-- Política RLS: cualquier visitante (anon) puede insertar;
--               solo el dueño del tour puede leer sus leads.

CREATE TABLE IF NOT EXISTS leads (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id    uuid        REFERENCES tours(id) ON DELETE CASCADE NOT NULL,
  scene_id   text,
  name       text        NOT NULL,
  phone      text,
  email      text,
  message    text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_tour_idx
  ON leads(tour_id, created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Cualquier visitante (incluyendo anónimos) puede enviar un lead
DROP POLICY IF EXISTS "leads: anyone can insert" ON leads;
CREATE POLICY "leads: anyone can insert"
  ON leads FOR INSERT
  WITH CHECK (true);

-- Solo el dueño del tour puede leer sus leads
DROP POLICY IF EXISTS "leads: owner can read" ON leads;
CREATE POLICY "leads: owner can read"
  ON leads FOR SELECT
  USING (
    tour_id IN (
      SELECT id FROM tours WHERE user_id = auth.uid()
    )
  );


-- ─── Migration 2: Hotspot analytics column (Feature: Hotspot Analytics) ──────
--
-- Agrega la columna hotspot_id a la tabla tour_events existente para rastrear
-- qué hotspot fue clickeado.

ALTER TABLE tour_events
  ADD COLUMN IF NOT EXISTS hotspot_id text;

CREATE INDEX IF NOT EXISTS tour_events_hotspot_idx
  ON tour_events(tour_id, hotspot_id)
  WHERE hotspot_id IS NOT NULL;


-- ─── Migration 3: Team invitations (Feature: Team Panel) ─────────────────────
--
-- Registra invitaciones enviadas por administradores a sus asesores.
-- El callback de auth (/auth/callback) actualiza el status a 'accepted'
-- cuando el asesor acepta la invitación y crea su cuenta.

CREATE TABLE IF NOT EXISTS team_invites (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id   uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email      text        NOT NULL,
  status     text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(admin_id, email)
);

CREATE INDEX IF NOT EXISTS team_invites_admin_idx
  ON team_invites(admin_id, created_at DESC);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Solo el admin dueño puede ver y gestionar sus invitaciones
DROP POLICY IF EXISTS "team_invites: admin can manage" ON team_invites;
CREATE POLICY "team_invites: admin can manage"
  ON team_invites FOR ALL
  USING (admin_id = auth.uid());


-- ─── Migration 4: Add role column to team_invites ────────────────────────────
--
-- Stores whether an invited user should become an admin or an advisor.

ALTER TABLE team_invites
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'advisor'
    CHECK (role IN ('admin', 'advisor'));


-- ─── Migration 5: Lightweight tour list fields ──────────────────────────────
--
-- Avoids loading the heavy JSONB `data` field for dashboards/cards. These
-- columns are derived from the first scene and kept in sync automatically.

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS first_scene_url text,
  ADD COLUMN IF NOT EXISTS scene_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_tour_light_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  first_scene jsonb;
  scenes jsonb;
BEGIN
  scenes := CASE
    WHEN jsonb_typeof(new.data->'scenes') = 'array' THEN new.data->'scenes'
    ELSE '[]'::jsonb
  END;
  first_scene := scenes->0;

  new.thumbnail_url := nullif(first_scene->>'thumbnailUrl', '');
  new.first_scene_url := nullif(first_scene->>'imageUrl', '');
  new.scene_count := jsonb_array_length(scenes);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS tours_sync_light_fields ON tours;
CREATE TRIGGER tours_sync_light_fields
  BEFORE INSERT OR UPDATE OF data
  ON tours
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_tour_light_fields();

UPDATE tours
SET data = data
WHERE data IS NOT NULL;

CREATE INDEX IF NOT EXISTS tours_user_updated_light_idx
  ON tours(user_id, updated_at DESC);


-- ─── Migration 6: Storage policies for tour-based upload paths ──────────────
--
-- App uploads files under {tour_id}/{file}. Policies must authorize the owner
-- of that tour, not auth.uid() as the first path segment.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('tour-scenes', 'tour-scenes', true, 52428800, ARRAY['image/jpeg','image/png','image/webp']),
  ('tour-assets', 'tour-assets', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/wav','application/pdf']),
  ('tour-thumbs', 'tour-thumbs', true, 5242880,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "storage: public read scenes" ON storage.objects;
DROP POLICY IF EXISTS "storage: public read assets" ON storage.objects;
DROP POLICY IF EXISTS "storage: public read thumbs" ON storage.objects;
DROP POLICY IF EXISTS "storage: owner upload scenes" ON storage.objects;
DROP POLICY IF EXISTS "storage: owner upload assets" ON storage.objects;
DROP POLICY IF EXISTS "storage: owner upload thumbs" ON storage.objects;
DROP POLICY IF EXISTS "storage: owner update scenes" ON storage.objects;
DROP POLICY IF EXISTS "storage: owner update assets" ON storage.objects;
DROP POLICY IF EXISTS "storage: owner update thumbs" ON storage.objects;
DROP POLICY IF EXISTS "storage: owner delete scenes" ON storage.objects;
DROP POLICY IF EXISTS "storage: owner delete assets" ON storage.objects;
DROP POLICY IF EXISTS "storage: owner delete thumbs" ON storage.objects;

CREATE POLICY "storage: public read scenes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tour-scenes');

CREATE POLICY "storage: public read assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tour-assets');

CREATE POLICY "storage: public read thumbs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tour-thumbs');

CREATE POLICY "storage: owner upload scenes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tour-scenes'
    AND EXISTS (
      SELECT 1 FROM public.tours
      WHERE id = ((storage.foldername(name))[1])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "storage: owner upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tour-assets'
    AND EXISTS (
      SELECT 1 FROM public.tours
      WHERE id = ((storage.foldername(name))[1])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "storage: owner upload thumbs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tour-thumbs'
    AND EXISTS (
      SELECT 1 FROM public.tours
      WHERE id = ((storage.foldername(name))[1])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "storage: owner update scenes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tour-scenes'
    AND EXISTS (
      SELECT 1 FROM public.tours
      WHERE id = ((storage.foldername(name))[1])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "storage: owner update assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tour-assets'
    AND EXISTS (
      SELECT 1 FROM public.tours
      WHERE id = ((storage.foldername(name))[1])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "storage: owner update thumbs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tour-thumbs'
    AND EXISTS (
      SELECT 1 FROM public.tours
      WHERE id = ((storage.foldername(name))[1])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "storage: owner delete scenes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tour-scenes'
    AND EXISTS (
      SELECT 1 FROM public.tours
      WHERE id = ((storage.foldername(name))[1])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "storage: owner delete assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tour-assets'
    AND EXISTS (
      SELECT 1 FROM public.tours
      WHERE id = ((storage.foldername(name))[1])::uuid
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "storage: owner delete thumbs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tour-thumbs'
    AND EXISTS (
      SELECT 1 FROM public.tours
      WHERE id = ((storage.foldername(name))[1])::uuid
        AND user_id = auth.uid()
    )
  );


-- ─── Migration 7: Advisor tour access + account isolation ────────────────────

ALTER TABLE team_invites
  ADD COLUMN IF NOT EXISTS advisor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS team_invites_advisor_idx
  ON team_invites(advisor_user_id)
  WHERE advisor_user_id IS NOT NULL;

ALTER POLICY "tours: public read if published" ON tours
  TO anon;

DROP POLICY IF EXISTS "tours: advisor reads admin tours" ON tours;
CREATE POLICY "tours: advisor reads admin tours" ON tours
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_invites
      WHERE team_invites.admin_id        = tours.user_id
        AND team_invites.advisor_user_id = auth.uid()
        AND team_invites.status          = 'accepted'
    )
  );

ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_admin_id_email_key;
ALTER TABLE team_invites ADD CONSTRAINT team_invites_email_unique UNIQUE (email);

DROP INDEX IF EXISTS team_invites_advisor_unique;
CREATE UNIQUE INDEX team_invites_advisor_unique
  ON team_invites(advisor_user_id)
  WHERE advisor_user_id IS NOT NULL;


-- ─── Migration 8: Internal materials vault (Kit de Ventas) ───────────────────

CREATE TABLE IF NOT EXISTS team_materials (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL,
  description text,
  category    text        NOT NULL DEFAULT 'general'
                CHECK (category IN ('precios', 'descuentos', 'planos', 'comisiones', 'general')),
  file_path   text        NOT NULL,
  file_name   text        NOT NULL,
  file_size   bigint,
  file_type   text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_materials_admin_idx
  ON team_materials(admin_id, created_at DESC);

ALTER TABLE team_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materials: admin manages" ON team_materials;
CREATE POLICY "materials: admin manages" ON team_materials
  FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "materials: advisor reads" ON team_materials;
CREATE POLICY "materials: advisor reads" ON team_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_invites
      WHERE team_invites.admin_id        = team_materials.admin_id
        AND team_invites.advisor_user_id = auth.uid()
        AND team_invites.status          = 'accepted'
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-materials', 'team-materials', false, 52428800,
  ARRAY[
    'application/pdf','image/jpeg','image/png','image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv'
  ]
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "materials: admin upload" ON storage.objects;
CREATE POLICY "materials: admin upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'team-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "materials: admin delete" ON storage.objects;
CREATE POLICY "materials: admin delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'team-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


-- ─── Migration 9: Team announcements (Novedades) ─────────────────────────────

CREATE TABLE IF NOT EXISTS team_announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  message    text NOT NULL,
  type       text NOT NULL DEFAULT 'announcement'
               CHECK (type IN ('announcement', 'news', 'motivation')),
  pinned     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE team_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements: admin manages" ON team_announcements;
CREATE POLICY "announcements: admin manages" ON team_announcements
  FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "announcements: advisor reads" ON team_announcements;
CREATE POLICY "announcements: advisor reads" ON team_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_invites
      WHERE team_invites.admin_id        = team_announcements.admin_id
        AND team_invites.advisor_user_id = auth.uid()
        AND team_invites.status          = 'accepted'
    )
  );

CREATE INDEX IF NOT EXISTS idx_team_announcements_admin_id
  ON team_announcements (admin_id, pinned DESC, created_at DESC);


-- ─── Verification ─────────────────────────────────────────────────────────────
-- Puedes verificar que todo se aplicó correctamente con:
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public';
--
-- Deberías ver: tours, profiles, tour_events, leads, team_invites, team_materials, team_announcements
