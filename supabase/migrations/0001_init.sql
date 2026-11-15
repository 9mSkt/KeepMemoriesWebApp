-- Keep Memories — initial schema (CLAUDE.md §5).
-- Accessed only from the server with the service-role key; RLS is on with no policies,
-- so the anon/authenticated roles can't read or write anything.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (char_length(slug) >= 10),
  couple_names text not null,
  wedding_date date not null,
  venue text,
  cover_image_url text,
  host_pin_hash text not null,
  google_email text,
  google_refresh_token_enc text,
  google_album_id text,
  google_album_title text,
  shared_album_url text check (
    shared_album_url is null
    or shared_album_url like 'https://photos.app.goo.gl/%'
    or shared_album_url like 'https://photos.google.com/share/%'
  ),
  upload_opens_at timestamptz,
  -- Defaults to wedding_date + 3 days; set by the app on insert (see docs/decisions.md).
  upload_closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  device_id text not null,
  guest_name text not null check (char_length(guest_name) between 1 and 40),
  wish text check (wish is null or char_length(wish) <= 120),
  filter text not null,
  google_media_item_id text,
  status text not null check (status in ('ok', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

-- Host dashboard: latest uploads per event.
create index uploads_event_created_idx on public.uploads (event_id, created_at desc);
-- Rate limiting: uploads per device in a time window.
create index uploads_event_device_created_idx on public.uploads (event_id, device_id, created_at desc);

alter table public.events enable row level security;
alter table public.uploads enable row level security;
