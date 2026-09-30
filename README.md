# Matchstick Studios

The studio site. One landing page, a blog, and an admin panel to edit both.

## Layout

| Path | |
|---|---|
| `index.html` | the landing page — markup and behaviour only |
| `assets/site.css` | every style and font the page uses (939 KB, mostly embedded fonts) |
| `assets/blog.css` | the extra typography a page of prose needs |
| `content/*.json` | all site copy: nav, team, services, projects, reasons, brief, theme |
| `content/blog/*.md` | blog posts, one file each |
| `admin/` | the studio: the admin panel, a static page |
| `sync.mjs` | pulls content out of Supabase into the files above |
| `tools/make-og.mjs` | renders `assets/og.jpg`, the link-preview card |
| `supabase/` | schema.sql and seed.sql for the database |
| `build.mjs` | turns the markdown into `/blog/` pages, plus sitemap and robots.txt |
| `404.html` | not-found page |

`blog/`, `sitemap.xml` and `robots.txt` are generated — they are not committed,
the deploy builds them.

## Editing content

Content lives in Supabase. Edit it at **/admin/** on the live site, or locally:

```
npm run dev            # serves the repo on :3000
```

then <http://localhost:3000/admin/>. Sign in with the Supabase Auth user.

Saving writes to Supabase, not to this repo. The site picks it up on the next
sync — daily, or immediately by running the **Sync content from Supabase**
workflow from the Actions tab.

The browser never reads content from Supabase directly. A free project is
paused after a week without traffic, and a paused project would otherwise take
the site's content down with it; going through files means the deployed site
keeps serving the last good pull whatever the database is doing.

## Building

```
npm run sync           # Supabase -> content/ (needs SUPABASE_URL, SUPABASE_ANON_KEY)
npm run build          # content/ -> blog pages, 404, sitemap, robots.txt
```

## Deploying

`.github/workflows/deploy.yml` runs on every push, once a day at 03:17 UTC,
and on demand from the Actions tab. It syncs from Supabase, commits anything
that moved, builds and publishes.

It is deliberately one workflow rather than two. A push made with the built-in
`GITHUB_TOKEN` does not trigger other workflows, so a separate sync job would
have committed the studio's edits and left the site untouched.

Set repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Without them
the sync is a no-op and the committed content is published as-is.

## The offline copy

`index.html` fetches its content, so it needs a server — opening it from disk
shows a message saying so.

```
node tools/make-offline.mjs
```

writes `../Matchstick-Studios-offline.html`: one file, ~1 MB, with the
stylesheet, the fonts, the content and the icon folded back in. It opens from
the Finder with no server and no network, and makes no external request at
all — the Google tag is stripped, because a file being opened on someone's
laptop is not website traffic and should not be logged as it.

WhatsApp, call and email still work, because they are links. The enquiry
table and the view counter do not, because they need Supabase.

Rebuild it after changing content; it is a snapshot, not a mirror.
