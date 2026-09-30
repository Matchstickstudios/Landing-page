/* Turns content/blog/*.md into real pages.
 *
 *   /blog/                      the index
 *   /blog/<slug>/               one page per post
 *   /sitemap.xml, /robots.txt   so the above can be found
 *
 * Every page links the same assets/site.css the landing page uses, so the
 * fonts and the palette are already in the browser's cache by the time a
 * reader reaches a post. No framework, no client-side rendering: what the
 * crawler is handed is the finished article.
 */
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import matter from "gray-matter";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, "content/site.json"), "utf8"));
const THEME = JSON.parse(fs.readFileSync(path.join(ROOT, "content/theme.json"), "utf8"));

const BASE = (process.env.SITE_URL || SITE.url || "").replace(/\/$/, "");
const NAME = "Matchstick Studios";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/* ---------- read the posts ---------- */
const dir = path.join(ROOT, "content/blog");
const posts = (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const { data, content } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    return {
      slug: f.replace(/\.md$/, ""),
      title: data.title || f,
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || "",
      cover: data.cover || "",
      tags: data.tags || [],
      draft: !!data.draft,
      html: marked.parse(content),
    };
  })
  .filter((p) => !p.draft)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

/* ---------- the page shell ---------- */
function shell({ title, description, canonical, image, depth, body, jsonld }) {
  const up = "../".repeat(depth) || "./";
  const img = image ? (image.startsWith("http") ? image : BASE + image) : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical && BASE ? `<link rel="canonical" href="${esc(BASE + canonical)}">` : ""}
<meta property="og:type" content="${depth === 2 ? "article" : "website"}">
<meta property="og:site_name" content="${esc(NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canonical && BASE ? `<meta property="og:url" content="${esc(BASE + canonical)}">` : ""}
${img ? `<meta property="og:image" content="${esc(img)}">` : ""}
<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${img ? `<meta name="twitter:image" content="${esc(img)}">` : ""}
<meta name="theme-color" content="${esc(THEME.colors?.soot || "#07070A")}">
<link rel="stylesheet" href="${up}assets/site.css">
<link rel="stylesheet" href="${up}assets/blog.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head>
<body class="lit">
<div class="bWrap bTop">
  <a class="bBack" href="${up}${depth === 2 ? "blog/" : ""}"><i>&#8592;</i>${
    depth === 2 ? "All writing" : "Back to the site"
  }</a>
</div>
${body}
<div class="bWrap">
  <div class="bFoot">
    <span>&copy; ${new Date().getFullYear()} ${esc(NAME)}</span>
    <span><a href="${up}">Home</a> &middot; <a href="${up}#brief">Start a brief</a></span>
  </div>
</div>
</body>
</html>
`;
}

/* ---------- write ---------- */
const out = (rel, html) => {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
  console.log("  " + rel);
};

console.log(`Building ${posts.length} post${posts.length === 1 ? "" : "s"}…`);

/* the index */
out("blog/index.html", shell({
  title: `Writing — ${NAME}`,
  description: "Notes on branding, creatives, paid media and getting a property launch noticed.",
  canonical: "/blog/",
  depth: 1,
  body: `<div class="bWrap">
  <div class="pHead">
    <h1 class="pTitle">Writing.</h1>
    <p class="pLede">What we have learned putting launches, hoardings and paid media in front of people who were not looking for them.</p>
  </div>
  ${posts.length ? `<div class="bList">${posts.map((p) => `
    <a class="bCard" href="../blog/${esc(p.slug)}/">
      <div class="pMeta"><span>${esc(fmtDate(p.date))}</span>${
        p.tags.slice(0, 2).map((t) => `<span class="pTag">${esc(t)}</span>`).join("")
      }</div>
      <h2>${esc(p.title)}</h2>
      ${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ""}
    </a>`).join("")}</div>`
    : `<p class="bEmpty">Nothing published yet.</p>`}
</div>`,
}));

/* one page per post */
for (const p of posts) {
  out(`blog/${p.slug}/index.html`, shell({
    title: `${p.title} — ${NAME}`,
    description: p.excerpt,
    canonical: `/blog/${p.slug}/`,
    image: p.cover,
    depth: 2,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title,
      description: p.excerpt,
      datePublished: new Date(p.date).toISOString(),
      author: { "@type": "Organization", name: NAME },
      publisher: { "@type": "Organization", name: NAME },
      ...(BASE ? { mainEntityOfPage: `${BASE}/blog/${p.slug}/` } : {}),
      ...(p.cover ? { image: p.cover.startsWith("http") ? p.cover : BASE + p.cover } : {}),
    },
    body: `<article class="bWrap">
  <div class="pHead">
    <div class="pMeta"><span>${esc(fmtDate(p.date))}</span>${
      p.tags.map((t) => `<span class="pTag">${esc(t)}</span>`).join("")
    }</div>
    <h1 class="pTitle">${esc(p.title)}</h1>
    ${p.excerpt ? `<p class="pLede">${esc(p.excerpt)}</p>` : ""}
    ${p.cover ? `<img class="pCover" src="../../${esc(p.cover).replace(/^\//, "")}" alt="">` : ""}
  </div>
  <div class="prose">${p.html}</div>
</article>`,
  }));
}

/* ---------- sitemap + robots ---------- */
if (BASE) {
  const urls = [
    { loc: `${BASE}/`, pri: "1.0" },
    { loc: `${BASE}/blog/`, pri: "0.8" },
    ...posts.map((p) => ({
      loc: `${BASE}/blog/${p.slug}/`,
      pri: "0.7",
      lastmod: new Date(p.date).toISOString().slice(0, 10),
    })),
  ];
  out("sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.pri}</priority></url>`
    ).join("\n") + `\n</urlset>\n`);
  out("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);
} else {
  console.log("  (no SITE_URL set — skipping sitemap.xml and robots.txt)");
}

console.log("Done.");
