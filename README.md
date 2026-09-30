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
| `tina/config.ts` | the admin panel's fields |
| `build.mjs` | turns the markdown into `/blog/` pages, plus sitemap and robots.txt |
| `404.html` | not-found page |

`blog/`, `sitemap.xml` and `robots.txt` are generated — they are not committed,
the deploy builds them.

## Editing content

```
npm run dev
```

Admin at <http://localhost:3000/admin/index.html>, site at
<http://localhost:3000/>. Saving writes to the files in `content/`; commit and
push and the change is live.

## Building

```
npm run build:blog     # the blog pages, sitemap, robots.txt
npm run build          # the above plus the Tina admin (needs TinaCloud env vars)
```

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. For the live admin at `/admin/`, set repository
secrets `TINA_CLIENT_ID`, `TINA_TOKEN` and `TINA_SEARCH_TOKEN` from a
TinaCloud project. Without them the site still deploys; only `/admin/` is
skipped.

## The offline copy

`index.html` fetches its content, so it needs a server — opening it from disk
shows a message saying so. The fully self-contained single-file version lives
outside this repo as `Matchstick-STRIKE-offline.html`.
