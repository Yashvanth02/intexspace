-- Run through the Supabase SQL Editor or `supabase db push`.
-- This migration is safe to apply more than once.
create table if not exists public.vlogs (
  id text primary key,
  title text not null check (char_length(trim(title)) > 0),
  details text not null check (char_length(trim(details)) > 0),
  youtube_url text not null check (youtube_url ~* '^https?://(www\\.)?(youtube\\.com|youtu\\.be)/'),
  thumbnail_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists vlogs_created_at_desc_idx on public.vlogs (created_at desc);

alter table public.vlogs enable row level security;

-- Public visitors can read published vlog metadata. Admin mutations use the
-- service-role key on the server and therefore bypass this policy.
drop policy if exists "Public can view vlogs" on public.vlogs;
create policy "Public can view vlogs" on public.vlogs for select using (true);
