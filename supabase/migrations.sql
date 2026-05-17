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

ALTER TABLE team_invites
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;


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
  ('tour-assets', 'tour-assets', true, 104857600, ARRAY[
    'image/jpeg','image/png','image/webp',
    'audio/mpeg','audio/mp4','audio/wav',
    'application/pdf',
    'model/gltf-binary','model/gltf+json',
    'application/octet-stream','text/plain'
  ]),
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
  TO anon, authenticated;

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

CREATE TABLE IF NOT EXISTS team_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email          text NOT NULL,
  role           text NOT NULL DEFAULT 'advisor'
                   CHECK (role IN ('admin', 'advisor')),
  permissions    jsonb NOT NULL DEFAULT '[]'::jsonb,
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'revoked')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  UNIQUE(owner_user_id, email)
);

CREATE INDEX IF NOT EXISTS team_members_owner_idx
  ON team_members(owner_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS team_members_user_idx
  ON team_members(member_user_id, status)
  WHERE member_user_id IS NOT NULL;

DROP INDEX IF EXISTS team_members_active_user_unique;
CREATE UNIQUE INDEX team_members_active_user_unique
  ON team_members(member_user_id)
  WHERE member_user_id IS NOT NULL AND status = 'active';

INSERT INTO team_members (owner_user_id, member_user_id, email, role, status, created_at)
SELECT admin_id, advisor_user_id, lower(email), role, 'active', created_at
FROM team_invites
WHERE status = 'accepted'
ON CONFLICT (owner_user_id, email) DO UPDATE
SET
  member_user_id = EXCLUDED.member_user_id,
  role = EXCLUDED.role,
  status = 'active',
  revoked_at = null;

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE team_members
SET permissions = COALESCE(team_invites.permissions, '[]'::jsonb)
FROM team_invites
WHERE team_members.owner_user_id = team_invites.admin_id
  AND team_members.email = lower(team_invites.email);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team members: owner manages" ON team_members;
CREATE POLICY "team members: owner manages" ON team_members
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "team members: member reads own" ON team_members;
CREATE POLICY "team members: member reads own" ON team_members
  FOR SELECT USING (member_user_id = auth.uid());

DROP POLICY IF EXISTS "tours: advisor reads admin tours" ON tours;
DROP POLICY IF EXISTS "tours: member reads owner tours" ON tours;
CREATE POLICY "tours: member reads owner tours" ON tours
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_user_id  = tours.user_id
        AND team_members.member_user_id = auth.uid()
        AND team_members.status         = 'active'
    )
  );


-- ─── Migration 8: Internal materials vault (Kit de Ventas) ───────────────────

CREATE TABLE IF NOT EXISTS team_materials (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL,
  description text,
  category    text        NOT NULL DEFAULT 'general',
  file_path   text        NOT NULL,
  file_name   text        NOT NULL,
  file_size   bigint,
  file_type   text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE team_materials DROP CONSTRAINT IF EXISTS team_materials_category_check;

CREATE INDEX IF NOT EXISTS team_materials_admin_idx
  ON team_materials(admin_id, created_at DESC);

CREATE TABLE IF NOT EXISTS team_material_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key        text NOT NULL,
  name       text NOT NULL,
  color      text,
  sort_order integer NOT NULL DEFAULT 0,
  is_system  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_id, key)
);

ALTER TABLE team_material_categories ENABLE ROW LEVEL SECURITY;

INSERT INTO team_material_categories (admin_id, key, name, color, sort_order, is_system)
SELECT v.admin_id, v.key, v.name, v.color, v.sort_order, v.is_system
FROM (VALUES
  (NULL::uuid, 'precios',     'Precios actuales',       'blue',    10, true),
  (NULL::uuid, 'apartado',    'Documentos de apartado', 'cyan',    20, true),
  (NULL::uuid, 'promociones', 'Promociones',            'emerald', 30, true),
  (NULL::uuid, 'descuentos',  'Descuentos',             'lime',    40, true),
  (NULL::uuid, 'planos',      'Planos',                 'amber',   50, true),
  (NULL::uuid, 'comisiones',  'Comisiones',             'purple',  60, true),
  (NULL::uuid, 'general',     'General',                'gray',    70, true)
) AS v(admin_id, key, name, color, sort_order, is_system)
WHERE NOT EXISTS (
  SELECT 1 FROM team_material_categories c
  WHERE c.admin_id IS NULL AND c.key = v.key
);

DROP POLICY IF EXISTS "material categories: admin manages" ON team_material_categories;
CREATE POLICY "material categories: admin manages" ON team_material_categories
  FOR ALL USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

DROP POLICY IF EXISTS "material categories: team reads" ON team_material_categories;
CREATE POLICY "material categories: team reads" ON team_material_categories
  FOR SELECT USING (
    admin_id IS NULL
    OR admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_user_id  = team_material_categories.admin_id
        AND team_members.member_user_id = auth.uid()
        AND team_members.status         = 'active'
    )
  );

ALTER TABLE team_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "materials: admin manages" ON team_materials;
CREATE POLICY "materials: admin manages" ON team_materials
  FOR ALL USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "materials: advisor reads" ON team_materials;
CREATE POLICY "materials: advisor reads" ON team_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_user_id  = team_materials.admin_id
        AND team_members.member_user_id = auth.uid()
        AND team_members.status         = 'active'
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


-- ─── Migration 8b: Advisor profile photos ───────────────────────────────────
--
-- Public bucket for small advisor avatars. The app uploads through a server
-- route that validates the authenticated user and updates user metadata.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'advisor-avatars', 'advisor-avatars', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "advisor avatars: public read" ON storage.objects;
CREATE POLICY "advisor avatars: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'advisor-avatars');


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
      SELECT 1 FROM team_members
      WHERE team_members.owner_user_id  = team_announcements.admin_id
        AND team_members.member_user_id = auth.uid()
        AND team_members.status         = 'active'
    )
  );

CREATE INDEX IF NOT EXISTS idx_team_announcements_admin_id
  ON team_announcements (admin_id, pinned DESC, created_at DESC);


-- ─── Migration 10: Flexible operations and reservation workflow ──────────────
--
-- This avoids hard-coding the company structure. "reservas", "precios",
-- "materiales", "promociones" and "jefe_piso" are default operation areas, but
-- each admin can create, rename or ignore areas according to their process.

CREATE TABLE IF NOT EXISTS team_operation_areas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key         text NOT NULL,
  name        text NOT NULL,
  description text,
  color       text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_id, key)
);

ALTER TABLE team_operation_areas ENABLE ROW LEVEL SECURITY;

INSERT INTO team_operation_areas (admin_id, key, name, description, color, sort_order, is_system)
SELECT v.admin_id, v.key, v.name, v.description, v.color, v.sort_order, v.is_system
FROM (VALUES
  (NULL::uuid, 'reservas',    'Reservas',    'Solicitudes de apartado, reserva y seguimiento documental.', 'emerald', 10, true),
  (NULL::uuid, 'precios',     'Precios',     'Actualización y validación de listas de precios.',            'blue',    20, true),
  (NULL::uuid, 'materiales',  'Materiales',  'Carga y orden de recursos para asesores.',                     'purple',  30, true),
  (NULL::uuid, 'promociones', 'Promociones', 'Campañas, descuentos y vigencias comerciales.',                'amber',   40, true),
  (NULL::uuid, 'jefe_piso',   'Jefe de piso','Coordinación operativa de ventas y asesoría.',                 'cyan',    50, true)
) AS v(admin_id, key, name, description, color, sort_order, is_system)
WHERE NOT EXISTS (
  SELECT 1 FROM team_operation_areas a
  WHERE a.admin_id IS NULL AND a.key = v.key
);

DROP POLICY IF EXISTS "operation areas: admin manages" ON team_operation_areas;
CREATE POLICY "operation areas: admin manages" ON team_operation_areas
  FOR ALL USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

DROP POLICY IF EXISTS "operation areas: team reads" ON team_operation_areas;
CREATE POLICY "operation areas: team reads" ON team_operation_areas
  FOR SELECT USING (
    admin_id IS NULL
    OR admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_user_id  = team_operation_areas.admin_id
        AND team_members.member_user_id = auth.uid()
        AND team_members.status         = 'active'
    )
  );

CREATE TABLE IF NOT EXISTS team_operation_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_key     text NOT NULL,
  can_view     boolean NOT NULL DEFAULT true,
  can_manage   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(admin_id, user_id, area_key)
);

CREATE INDEX IF NOT EXISTS team_operation_assignments_admin_idx
  ON team_operation_assignments(admin_id, area_key);

CREATE INDEX IF NOT EXISTS team_operation_assignments_user_idx
  ON team_operation_assignments(user_id);

ALTER TABLE team_operation_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operation assignments: admin manages" ON team_operation_assignments;
CREATE POLICY "operation assignments: admin manages" ON team_operation_assignments
  FOR ALL USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

DROP POLICY IF EXISTS "operation assignments: assigned user reads" ON team_operation_assignments;
CREATE POLICY "operation assignments: assigned user reads" ON team_operation_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS reservation_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id             uuid NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  unit_id             text NOT NULL,
  unit_label          text,
  prototype_id        text,
  advisor_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'documents_needed', 'in_review', 'approved', 'rejected', 'cancelled')),
  client_name         text,
  client_phone        text,
  client_email        text,
  notes               text,
  missing_documents   text[] NOT NULL DEFAULT '{}',
  internal_notes      text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_requests_admin_status_idx
  ON reservation_requests(admin_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS reservation_requests_tour_unit_idx
  ON reservation_requests(tour_id, unit_id);

CREATE INDEX IF NOT EXISTS reservation_requests_advisor_idx
  ON reservation_requests(advisor_user_id, created_at DESC);

ALTER TABLE reservation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservation requests: admin manages" ON reservation_requests;
CREATE POLICY "reservation requests: admin manages" ON reservation_requests
  FOR ALL USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

DROP POLICY IF EXISTS "reservation requests: advisor creates" ON reservation_requests;
CREATE POLICY "reservation requests: advisor creates" ON reservation_requests
  FOR INSERT WITH CHECK (
    advisor_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_user_id  = reservation_requests.admin_id
        AND team_members.member_user_id = auth.uid()
        AND team_members.status         = 'active'
    )
  );

DROP POLICY IF EXISTS "reservation requests: advisor reads own" ON reservation_requests;
CREATE POLICY "reservation requests: advisor reads own" ON reservation_requests
  FOR SELECT USING (advisor_user_id = auth.uid());

DROP POLICY IF EXISTS "reservation requests: assignee reads" ON reservation_requests;
CREATE POLICY "reservation requests: assignee reads" ON reservation_requests
  FOR SELECT USING (assigned_to_user_id = auth.uid());

DROP POLICY IF EXISTS "reservation requests: assignee updates" ON reservation_requests;
CREATE POLICY "reservation requests: assignee updates" ON reservation_requests
  FOR UPDATE USING (assigned_to_user_id = auth.uid())
  WITH CHECK (assigned_to_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS team_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_key            text NOT NULL DEFAULT 'general',
  title               text NOT NULL,
  description         text,
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority            text NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_tour_id     uuid REFERENCES tours(id) ON DELETE SET NULL,
  related_unit_id     text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  due_at              timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_tasks_admin_area_status_idx
  ON team_tasks(admin_id, area_key, status, created_at DESC);

CREATE INDEX IF NOT EXISTS team_tasks_assignee_idx
  ON team_tasks(assigned_to_user_id, status, created_at DESC);

ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team tasks: admin manages" ON team_tasks;
CREATE POLICY "team tasks: admin manages" ON team_tasks
  FOR ALL USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

DROP POLICY IF EXISTS "team tasks: assignee reads" ON team_tasks;
CREATE POLICY "team tasks: assignee reads" ON team_tasks
  FOR SELECT USING (assigned_to_user_id = auth.uid());

DROP POLICY IF EXISTS "team tasks: assignee updates" ON team_tasks;
CREATE POLICY "team tasks: assignee updates" ON team_tasks
  FOR UPDATE USING (assigned_to_user_id = auth.uid())
  WITH CHECK (assigned_to_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS price_update_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id             uuid NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  changed_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  filter              jsonb NOT NULL DEFAULT '{}'::jsonb,
  changes             jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_update_logs_tour_idx
  ON price_update_logs(tour_id, created_at DESC);

ALTER TABLE price_update_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price logs: admin reads" ON price_update_logs;
CREATE POLICY "price logs: admin reads" ON price_update_logs
  FOR SELECT USING (admin_id = auth.uid());

DROP POLICY IF EXISTS "price logs: admin inserts" ON price_update_logs;
CREATE POLICY "price logs: admin inserts" ON price_update_logs
  FOR INSERT WITH CHECK (admin_id = auth.uid());


-- ─── Migration: leads.advisor_id — track which advisor shared the link ───────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS advisor_id text;

CREATE INDEX IF NOT EXISTS leads_advisor_idx
  ON leads(advisor_id)
  WHERE advisor_id IS NOT NULL;


-- ─── Migration: team_invites.permissions — role-based permissions for admins ──
-- IMPORTANT: Run this in Supabase SQL Editor if you get
--   "Could not find the 'permissions' column of 'team_invites' in the schema cache"

ALTER TABLE team_invites
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE team_invites
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'advisor'
    CHECK (role IN ('admin', 'advisor'));


-- ─── Verification ─────────────────────────────────────────────────────────────
-- Puedes verificar que todo se aplicó correctamente con:
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public';
--
-- Deberías ver: tours, profiles, tour_events, leads, team_invites, team_members, team_materials, team_announcements
