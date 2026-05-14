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
  ON tours(user_id, updated_at DESC)
  INCLUDE (title, description, is_published, share_slug, view_count, thumbnail_url, first_scene_url, scene_count);


-- ─── Verification ─────────────────────────────────────────────────────────────
-- Puedes verificar que todo se aplicó correctamente con:
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public';
--
-- Deberías ver: tours, profiles, tour_events, leads, team_invites
