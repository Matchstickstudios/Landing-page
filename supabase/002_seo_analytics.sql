-- Matchstick Studios — SEO settings and self-hosted analytics
-- Run this in the Supabase SQL editor after schema.sql. Safe to re-run.

-- ---------- everything Google reads ----------
create table if not exists seo (
  id               int primary key default 1 check (id = 1),
  title            text,      -- <title> and og:title
  description      text,      -- meta description and og:description
  keywords         text[]  not null default '{}',
  og_image         text,      -- absolute URL to the sharing image
  twitter_handle   text,
  ga_measurement_id text,     -- G-XXXXXXXXXX, blank turns Google Analytics off
  gsc_verification text,      -- Google Search Console meta token
  bing_verification text,
  robots           text not null default 'index,follow',
  updated_at       timestamptz not null default now()
);

insert into seo (id, title, description, keywords, og_image, twitter_handle,
                 ga_measurement_id, robots) values (
  1,
  'Matchstick Studios — Branding, Creatives, Social & Ads',
  'We light up what you’re selling. Branding, creatives, social, Meta and Google ads, lead generation and websites — sharpest on property, and it travels.',
  array['branding','creative agency','social media marketing','meta ads','google ads',
        'lead generation','real estate marketing','Hosur']::text[],
  '/assets/og.jpg',
  '@matchstickstd',
  'G-QL1ZBJQS89',
  'index,follow')
on conflict (id) do nothing;

-- ---------- page views, ours rather than anyone else's ----------
-- One row per view. Free Supabase gives 500 MB; a row here is well under 200
-- bytes, so this holds years of a site this size. It is also the request that
-- keeps the project from being paused for inactivity.
create table if not exists pageviews (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path       text not null,
  referrer   text,
  screen     text,          -- 'phone' | 'tablet' | 'desktop'
  lang       text,
  session    text           -- a per-tab random id, so visits can be counted
);
create index if not exists pageviews_created_idx on pageviews (created_at desc);
create index if not exists pageviews_path_idx on pageviews (path);

-- ---------- policies ----------
alter table seo enable row level security;
drop policy if exists "public read" on seo;
create policy "public read" on seo for select using (true);
drop policy if exists "authenticated write" on seo;
create policy "authenticated write" on seo for all to authenticated using (true) with check (true);

alter table pageviews enable row level security;
-- a visitor may record their own view and may never read anyone's
drop policy if exists "anyone may record" on pageviews;
create policy "anyone may record" on pageviews for insert to anon, authenticated with check (true);
drop policy if exists "authenticated read" on pageviews;
create policy "authenticated read" on pageviews for select to authenticated using (true);

drop trigger if exists seo_touch on seo;
create trigger seo_touch before update on seo
  for each row execute function touch_updated_at();

-- ---------- a rollup, so the admin asks one question not ten ----------
create or replace view analytics_daily as
  select date_trunc('day', created_at)::date as day,
         count(*)                            as views,
         count(distinct session)             as visits
  from pageviews group by 1 order by 1 desc;

grant select on analytics_daily to authenticated;
