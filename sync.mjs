/* Pulls content out of Supabase and writes the files the site is built from.
 *
 *   supabase  ->  content/*.json  +  content/blog/*.md  ->  build.mjs  ->  pages
 *
 * Deliberately not done in the browser. A free Supabase project pauses after a
 * week without traffic, and a paused project would otherwise take the site's
 * content down with it. Going through files means the deployed site keeps
 * serving the last good pull whatever Supabase is doing, and the crawler gets
 * finished HTML rather than an empty page waiting on an API.
 *
 * Needs SUPABASE_URL and SUPABASE_ANON_KEY. Reads only — the anon key cannot
 * write, which is the point of the row-level policies in schema.sql.
 */
import fs from "node:fs";
import path from "node:path";

const URL_ = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const KEY = process.env.SUPABASE_ANON_KEY || "";
const ROOT = path.dirname(new URL(import.meta.url).pathname);

if (!URL_ || !KEY) {
  console.error("sync: SUPABASE_URL and SUPABASE_ANON_KEY are not set.");
  console.error("      Nothing pulled; the committed content/ is left alone.");
  process.exit(process.env.SYNC_REQUIRED === "1" ? 1 : 0);
}

async function table(name, query = "select=*&order=sort.asc") {
  const r = await fetch(`${URL_}/rest/v1/${name}?${query}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`${name}: ${r.status} ${await r.text()}`);
  return r.json();
}

const write = (rel, data) => {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const next = typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n";
  const prev = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
  if (prev === next) return false;
  fs.writeFileSync(f, next);
  console.log("  changed " + rel);
  return true;
};

const [nav, social, ticker, team, services, projects, reasons, briefOpts, settings, posts] =
  await Promise.all([
    table("nav"), table("social"), table("ticker"), table("team"),
    table("services"), table("projects"), table("reasons"), table("brief_options"),
    table("settings", "select=*&limit=1"),
    table("posts", "select=*&draft=is.false&order=published.desc"),
  ]);

const s = settings[0] || {};
let changed = 0;

changed += write("content/site.json", {
  nav: nav.map((n) => ({ label: n.label, id: n.href.replace(/^#/, "") })),
  social: social.map((x) => ({ name: x.network, url: x.url })),
  ticker: ticker.map((t) => t.phrase),
  story: s.story || "",
  stats: s.stats || [],
  url: s.site_url || "",
});

changed += write("content/team.json", {
  members: team.map((m) => ({
    name: m.name, role: m.role, initials: m.initials, bio: m.bio,
    does: m.does || [], pos: { x: +m.pos_x, y: +m.pos_y, r: +m.pos_r },
  })),
});

changed += write("content/services.json", {
  services: services.map((c) => ({
    title: c.title, kicker: c.kicker, summary: c.summary,
    get: c.get_items || [], first30: c.first_30,
  })),
});

changed += write("content/projects.json", {
  projects: projects.map((p) => ({
    title: p.title, tag: p.tag, summary: p.summary, chips: p.chips || [],
  })),
});

changed += write("content/why.json", {
  reasons: reasons.map((r) => ({
    title: r.title, body: r.body, x: +r.pos_x, y: +r.pos_y, r: +r.pos_r,
  })),
});

const pick = (q) => briefOpts.filter((o) => o.question === q);
changed += write("content/brief.json", {
  services: pick("services").map((o) => o.value),
  who: pick("who").map((o) => o.value),
  when: pick("when").map((o) => ({ value: o.value, emoji: o.emoji || "" })),
});

changed += write("content/theme.json", {
  colors: s.colors || {},
  contact: { phone: s.phone || "", whatsapp: s.whatsapp || "", email: s.email || "" },
});

/* ---------- blog ---------- */
const blogDir = path.join(ROOT, "content/blog");
fs.mkdirSync(blogDir, { recursive: true });
const keep = new Set(posts.map((p) => p.slug + ".md"));

for (const p of posts) {
  const fm = [
    "---",
    `title: ${JSON.stringify(p.title)}`,
    `date: ${new Date(p.published).toISOString()}`,
    `excerpt: ${JSON.stringify(p.excerpt || "")}`,
    p.cover ? `cover: ${JSON.stringify(p.cover)}` : null,
    `tags:`,
    ...(p.tags || []).map((t) => `  - ${JSON.stringify(t)}`),
    `draft: false`,
    "---",
    "",
    (p.body || "").trim(),
    "",
  ].filter((l) => l !== null).join("\n");
  changed += write(`content/blog/${p.slug}.md`, fm);
}

/* a post unpublished in Supabase should leave the site */
for (const f of fs.readdirSync(blogDir)) {
  if (f.endsWith(".md") && !keep.has(f)) {
    fs.unlinkSync(path.join(blogDir, f));
    console.log("  removed content/blog/" + f);
    changed++;
  }
}

console.log(changed ? `sync: ${changed} file(s) changed.` : "sync: already up to date.");
