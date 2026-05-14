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


-- ─── Migration 5: Advisor tour access via team membership ────────────────────
--
-- Problems solved:
--   1. Advisors had no RLS policy granting them read access to their admin's tours.
--   2. The "tours: public read if published" policy applied to all authenticated
--      users, so advisors in the dashboard could see ALL published tours in the
--      entire platform (not just their admin's).
--   3. The team_invites table lacked the advisor's user ID, so a JOIN-based RLS
--      policy couldn't be written.
--
-- Solution:
--   a) Add advisor_user_id to team_invites (filled by auth callback on accept).
--   b) Scope the public-read policy to anon only (viewer page still works for
--      unauthenticated visitors; admins use owner policy; advisors use new policy).
--   c) Add advisor policy: advisors can SELECT tours owned by their admin.

-- 5a: Store the advisor's Supabase user ID when they accept the invite
ALTER TABLE team_invites
  ADD COLUMN IF NOT EXISTS advisor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS team_invites_advisor_idx
  ON team_invites(advisor_user_id)
  WHERE advisor_user_id IS NOT NULL;

-- 5b: Restrict the "public read if published" policy to anonymous users only.
--     The policy already exists (created in setup.sql); we just change the role
--     target so it no longer matches authenticated users.
--     ALTER POLICY is idempotent — safe to re-run.
ALTER POLICY "tours: public read if published" ON tours
  TO anon;

-- 5c: Advisors (and invited admins) can read tours owned by the admin who invited them.
DROP POLICY IF EXISTS "tours: advisor reads admin tours" ON tours;
CREATE POLICY "tours: advisor reads admin tours" ON tours
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_invites
      WHERE team_invites.admin_id     = tours.user_id
        AND team_invites.advisor_user_id = auth.uid()
        AND team_invites.status       = 'accepted'
    )
  );


-- ─── Migration 6: One team per user — strict account isolation ───────────────
--
-- Problem: UNIQUE(admin_id, email) only prevents the same admin from inviting
-- the same person twice. Two different admins could invite the same email,
-- causing that user to see tours from both accounts (cross-contamination).
--
-- Solution:
--   a) Global UNIQUE on email in team_invites — one email belongs to exactly
--      one admin team at a time. Safe to re-invite after revocation because the
--      DELETE route removes the entire row.
--   b) Partial UNIQUE index on advisor_user_id (where not null) — DB-level guard
--      so two accepted invites can never share the same user ID.
--      (The API check handles the pre-accept / pending case.)

-- 6a: One team per email
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_admin_id_email_key;
ALTER TABLE team_invites ADD CONSTRAINT team_invites_email_unique UNIQUE (email);

-- 6b: One team per accepted user ID
DROP INDEX IF EXISTS team_invites_advisor_unique;
CREATE UNIQUE INDEX team_invites_advisor_unique
  ON team_invites(advisor_user_id)
  WHERE advisor_user_id IS NOT NULL;


-- ─── Migration 7: Internal materials vault (Kit de Ventas) ───────────────────
--
-- Stores files (PDFs, images, spreadsheets) uploaded by an admin that are
-- accessible ONLY to their authenticated team members (advisors + admins).
-- Public visitors and brokers never see these files.
-- Downloads go through a server-side signed URL (1-hour expiry) so the raw
-- storage path is never exposed to the client.

CREATE TABLE IF NOT EXISTS team_materials (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL,
  description text,
  category    text        NOT NULL DEFAULT 'general'
                CHECK (category IN ('precios', 'descuentos', 'planos', 'comisiones', 'general')),
  file_path   text        NOT NULL,   -- storage path: {admin_id}/{uuid}-{filename}
  file_name   text        NOT NULL,   -- original filename shown in UI
  file_size   bigint,                 -- bytes
  file_type   text,                   -- MIME type
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_materials_admin_idx
  ON team_materials(admin_id, created_at DESC);

ALTER TABLE team_materials ENABLE ROW LEVEL SECURITY;

-- Admin has full control over their own materials
DROP POLICY IF EXISTS "materials: admin manages" ON team_materials;
CREATE POLICY "materials: admin manages" ON team_materials
  FOR ALL USING (admin_id = auth.uid());

-- Advisors (and invited admins) can read their admin's materials
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

-- Storage bucket for private team materials
-- (Run separately if the bucket does not yet exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-materials',
  'team-materials',
  false,   -- PRIVATE — no direct public URLs
  52428800, -- 50 MB per file
  ARRAY[
    'application/pdf',
    'image/jpeg','image/png','image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Admins can upload files under their own user_id prefix
DROP POLICY IF EXISTS "materials: admin upload" ON storage.objects;
CREATE POLICY "materials: admin upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'team-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can delete their own files
DROP POLICY IF EXISTS "materials: admin delete" ON storage.objects;
CREATE POLICY "materials: admin delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'team-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
-- NOTE: No SELECT policy on storage.objects for this bucket.
-- Downloads are served exclusively through server-side signed URLs
-- generated by /api/materials/[id]/download, which enforces role checks.


-- ─── Verification ─────────────────────────────────────────────────────────────
-- Puedes verificar que todo se aplicó correctamente con:
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public';
--
-- Deberías ver: tours, profiles, tour_events, leads, team_invites
