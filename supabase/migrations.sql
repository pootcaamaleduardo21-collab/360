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


-- ─── Migration 5: UTM columns on leads ───────────────────────────────────────
--
-- Almacena los parámetros UTM junto a cada lead para saber de qué campaña,
-- canal o fuente llegó el visitante que envió sus datos de contacto.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_source   text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_medium   text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content  text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term     text;

CREATE INDEX IF NOT EXISTS leads_utm_source_idx
  ON leads(tour_id, utm_source)
  WHERE utm_source IS NOT NULL;


-- ─── Migration 6: tour_events table (if not created yet) ─────────────────────
--
-- Tabla principal de analytics. Si ya existe (creada manualmente), las líneas
-- ADD COLUMN son idempotentes gracias a IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS tour_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id     uuid        REFERENCES tours(id) ON DELETE CASCADE NOT NULL,
  event_type  text        NOT NULL,
  scene_id    text,
  unit_id     text,
  hotspot_id  text,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tour_events_tour_idx
  ON tour_events(tour_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tour_events_type_idx
  ON tour_events(tour_id, event_type);

-- Si la tabla ya existía sin estas columnas, las agrega:
ALTER TABLE tour_events ADD COLUMN IF NOT EXISTS unit_id    text;
ALTER TABLE tour_events ADD COLUMN IF NOT EXISTS hotspot_id text;
ALTER TABLE tour_events ADD COLUMN IF NOT EXISTS metadata   jsonb;

ALTER TABLE tour_events ENABLE ROW LEVEL SECURITY;

-- Cualquier visitante puede insertar eventos (fire-and-forget desde el viewer)
DROP POLICY IF EXISTS "tour_events: anyone can insert" ON tour_events;
CREATE POLICY "tour_events: anyone can insert"
  ON tour_events FOR INSERT
  WITH CHECK (true);

-- Solo el dueño del tour puede leer sus eventos
DROP POLICY IF EXISTS "tour_events: owner can read" ON tour_events;
CREATE POLICY "tour_events: owner can read"
  ON tour_events FOR SELECT
  USING (
    tour_id IN (
      SELECT id FROM tours WHERE user_id = auth.uid()
    )
  );


-- ─── Verification ─────────────────────────────────────────────────────────────
-- Puedes verificar que todo se aplicó correctamente con:
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public';
--
-- Deberías ver: tours, profiles, tour_events, leads, team_invites
--
-- Columnas de leads:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'leads' ORDER BY ordinal_position;
--
-- Debería incluir: utm_source, utm_medium, utm_campaign, utm_content, utm_term
