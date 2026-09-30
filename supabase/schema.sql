-- Matchstick Studios — content schema
--
-- Run this once in the Supabase SQL editor. It is idempotent: safe to re-run.
--
-- Shape of the thing: every table is small, ordered by `sort`, and read by a
-- build step rather than by the browser. Public gets SELECT so the build can
-- read with the anon key; writes need an authenticated user, which is you in
-- the dashboard. The one exception is `enquiries`, which anyone may INSERT
-- into and nobody may read without logging in.

-- ---------- navigation ----------
create table if not exists nav (
  id    bigint generated always as identity primary key,
  label text not null,
  href  text not null,          -- "#desk" for a section, "/blog/" for a page
  sort  int  not null default 0
);

-- ---------- social links ----------
create table if not exists social (
  id      bigint generated always as identity primary key,
  network text not null check (network in ('Instagram','Facebook','X','LinkedIn')),
  url     text not null,
  sort    int  not null default 0
);

-- ---------- the scrolling strip ----------
create table if not exists ticker (
  id     bigint generated always as identity primary key,
  phrase text not null,
  sort   int  not null default 0
);

-- ---------- the team ----------
create table if not exists team (
  id       bigint generated always as identity primary key,
  name     text not null,
  role     text not null,
  initials text,
  bio      text,
  does     text[] not null default '{}',
  pos_x    numeric not null default 0,   -- desktop scatter, percent
  pos_y    numeric not null default 0,
  pos_r    numeric not null default 0,   -- rotation, degrees
  sort     int  not null default 0
);

-- ---------- the six services ----------
create table if not exists services (
  id        bigint generated always as identity primary key,
  title     text not null,
  kicker    text,
  summary   text,
  get_items text[] not null default '{}',
  first_30  text,
  sort      int  not null default 0
);

-- ---------- work ----------
create table if not exists projects (
  id      bigint generated always as identity primary key,
  title   text not null,
  tag     text,
  summary text,
  chips   text[] not null default '{}',
  sort    int  not null default 0
);

-- ---------- why us ----------
create table if not exists reasons (
  id    bigint generated always as identity primary key,
  title text not null,
  body  text,
  pos_x numeric not null default 0,
  pos_y numeric not null default 0,
  pos_r numeric not null default 0,
  sort  int  not null default 0
);

-- ---------- the brief's three questions ----------
create table if not exists brief_options (
  id       bigint generated always as identity primary key,
  question text not null check (question in ('services','who','when')),
  value    text not null,
  emoji    text,                 -- only the "when" answers carry one
  sort     int  not null default 0
);

-- ---------- one row of everything else ----------
create table if not exists settings (
  id         int primary key default 1 check (id = 1),
  story      text,
  stats      jsonb not null default '[]',   -- [{value,label}]
  colors     jsonb not null default '{}',   -- the eleven palette tokens
  phone      text,
  whatsapp   text,
  email      text,
  site_url   text,
  updated_at timestamptz not null default now()
);

-- ---------- blog ----------
create table if not exists posts (
  id         bigint generated always as identity primary key,
  slug       text not null unique,
  title      text not null,
  published  date not null default current_date,
  excerpt    text,
  cover      text,
  tags       text[] not null default '{}',
  body       text not null default '',      -- markdown
  draft      boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists posts_published_idx on posts (draft, published desc);

-- ---------- enquiries from the brief form ----------
create table if not exists enquiries (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text,
  phone      text,
  email      text,
  services   text[] not null default '{}',
  who        text,
  start_when text,
  message    text,
  sent_via   text,                -- 'whatsapp' | 'email'
  user_agent text
);
create index if not exists enquiries_created_idx on enquiries (created_at desc);

-- ---------- row level security ----------
-- Content: the world may read, only a signed-in user may change anything.
do $$
declare t text;
begin
  foreach t in array array['nav','social','ticker','team','services','projects',
                           'reasons','brief_options','settings','posts']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('drop policy if exists "authenticated write" on %I', t);
    execute format($f$create policy "authenticated write" on %I
      for all to authenticated using (true) with check (true)$f$, t);
  end loop;
end $$;

-- Enquiries: anyone may leave one, nobody may read them without logging in.
alter table enquiries enable row level security;
drop policy if exists "anyone may enquire" on enquiries;
create policy "anyone may enquire" on enquiries
  for insert to anon, authenticated with check (true);
drop policy if exists "authenticated read" on enquiries;
create policy "authenticated read" on enquiries
  for select to authenticated using (true);

-- ---------- keep updated_at honest ----------
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists posts_touch on posts;
create trigger posts_touch before update on posts
  for each row execute function touch_updated_at();

drop trigger if exists settings_touch on settings;
create trigger settings_touch before update on settings
  for each row execute function touch_updated_at();
