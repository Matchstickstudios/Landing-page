-- Matchstick Studios — brand assets and client logos
-- Run in the Supabase SQL editor after 002. Safe to re-run.

-- ---------- where the logo and the icon live ----------
alter table settings add column if not exists logo    text;
alter table settings add column if not exists favicon text;

-- ---------- the clients the site shows ----------
create table if not exists clients (
  id    bigint generated always as identity primary key,
  name  text not null,
  logo  text,                 -- public URL in the brand bucket
  url   text,                 -- optional link to the client
  sort  int not null default 0
);

alter table clients enable row level security;
drop policy if exists "public read" on clients;
create policy "public read" on clients for select using (true);
drop policy if exists "authenticated write" on clients;
create policy "authenticated write" on clients
  for all to authenticated using (true) with check (true);

-- ---------- a public bucket for the artwork ----------
-- Public because these images are on a public website; the protection that
-- matters is on writing, not reading.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand', 'brand', true, 3145728,
        array['image/png','image/jpeg','image/svg+xml','image/webp','image/x-icon'])
on conflict (id) do update
  set public = true,
      file_size_limit = 3145728,
      allowed_mime_types = excluded.allowed_mime_types;

-- anyone may look at them; only a signed-in studio user may put them there,
-- change them or remove them
drop policy if exists "brand public read" on storage.objects;
create policy "brand public read" on storage.objects
  for select using (bucket_id = 'brand');

drop policy if exists "brand authenticated write" on storage.objects;
create policy "brand authenticated write" on storage.objects
  for insert to authenticated with check (bucket_id = 'brand');

drop policy if exists "brand authenticated update" on storage.objects;
create policy "brand authenticated update" on storage.objects
  for update to authenticated using (bucket_id = 'brand');

drop policy if exists "brand authenticated delete" on storage.objects;
create policy "brand authenticated delete" on storage.objects
  for delete to authenticated using (bucket_id = 'brand');
