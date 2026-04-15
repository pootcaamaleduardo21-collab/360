-- ═══════════════════════════════════════════════════════════════════════════
-- Tour360 — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Profiles (auto-created on signup) ───────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  plan        text not null default 'free',  -- 'free' | 'pro' | 'enterprise'
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Tours ────────────────────────────────────────────────────────────────────
create table if not exists public.tours (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  description     text,

  -- Full Tour object stored as JSONB (scenes, hotspots, units, etc.)
  data            jsonb not null default '{}',

  -- Publishing
  is_published    boolean not null default false,
  share_slug      text unique,          -- custom slug for the public URL
  password_hash   text,                 -- optional viewer password (bcrypt)

  -- Analytics
  view_count      bigint not null default 0,

  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.tours enable row level security;

-- Owner has full access
create policy "Owners manage their tours"
  on public.tours for all using (auth.uid() = user_id);

-- Published tours are publicly readable (no auth required)
create policy "Published tours are public"
  on public.tours for select using (is_published = true);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tours_updated_at on public.tours;
create trigger tours_updated_at
  before update on public.tours
  for each row execute function public.update_updated_at();

-- Increment view counter (called from the client when a tour is opened)
create or replace function public.increment_tour_views(tour_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.tours set view_count = view_count + 1 where id = tour_id;
end;
$$;

-- ─── Storage bucket policies ─────────────────────────────────────────────────
-- Run after creating the buckets in Storage UI:

-- insert into storage.buckets (id, name, public) values
--   ('tour-scenes', 'tour-scenes', true),
--   ('tour-assets', 'tour-assets', true),
--   ('tour-thumbs', 'tour-thumbs', true)
-- on conflict do nothing;

-- create policy "Authenticated users upload scene images"
--   on storage.objects for insert
--   to authenticated
--   with check (bucket_id = 'tour-scenes');

-- create policy "Scene images are publicly readable"
--   on storage.objects for select
--   using (bucket_id in ('tour-scenes', 'tour-assets', 'tour-thumbs'));

-- create policy "Users delete their own files"
--   on storage.objects for delete
--   to authenticated
--   using (auth.uid()::text = (storage.foldername(name))[1]);
