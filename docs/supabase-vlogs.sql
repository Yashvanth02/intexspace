-- Run once in the Supabase SQL editor for the project used by this site.
-- Vlog metadata must be durable so public pages can see admin edits on all deployments.
create table if not exists public.vlogs (
  id text primary key,
  title text not null,
  details text not null,
  youtube_url text not null,
  thumbnail_url text not null,
  created_at timestamptz not null default now()
);
