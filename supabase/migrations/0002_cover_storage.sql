-- Public bucket for optional cover photos (CLAUDE.md §5: cover_image_url "stored in Supabase Storage (public bucket)").
-- Uploads go through the server with the service-role key; there are no client write policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
