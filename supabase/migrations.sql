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


-- ─── Verification ─────────────────────────────────────────────────────────────
-- Puedes verificar que todo se aplicó correctamente con:
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public';
--
-- Deberías ver: tours, profiles, tour_events, leads
