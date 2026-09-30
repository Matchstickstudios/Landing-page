/* Builds one self-contained HTML file from the site.
 *
 *   node tools/make-offline.mjs [outfile]
 *
 * The deployed site is several files: the page fetches its content as JSON and
 * links a 939 KB stylesheet. That is right for a website and useless for a file
 * you want to email to someone, put on a USB stick, or open on a laptop with no
 * signal — a browser will not fetch anything from disk, so the page would come
 * up empty.
 *
 * This folds it all back into one document: the stylesheet inlined, the fonts
 * with it, the content written in as literals, the icon as a data URI. It opens
 * from the Finder with no server and no network.
 *
 * What it deliberately does not carry: the analytics beacon and the enquiry
 * insert, both of which need Supabase. The WhatsApp, call and email buttons
 * still work, because they are links.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = process.argv[2] || path.join(ROOT, "..", "Matchstick-Studios-offline.html");

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
let html = read("index.html");

/* ---------- 1. the stylesheet, back where it came from ---------- */
const css = read("assets/site.css");
const linkRe = /<link rel="stylesheet" href="assets\/site\.css">/;
if (!linkRe.test(html)) throw new Error("offline: the stylesheet link is not where it was expected");
html = html.replace(linkRe, `<style>\n${css}\n</style>`);

/* ---------- 2. the icon ---------- */
const favicon = fs.readFileSync(path.join(ROOT, "assets/favicon.png")).toString("base64");
html = html.replace(
  /<link rel="icon" type="image\/png" sizes="64x64" href="assets\/favicon\.png">/,
  `<link rel="icon" type="image/png" sizes="64x64" href="data:image/png;base64,${favicon}">`,
);

/* ---------- 3. the content, as literals ---------- */
const names = ["site", "team", "services", "projects", "why", "brief", "theme"];
const files = {};
for (const n of names) files[n] = JSON.parse(read(`content/${n}.json`));
/* no project, so no beacon and no enquiry insert: the file is offline */
files.supabase = { url: "", anonKey: "" };

const payload =
  `<script>window.__FILES=${JSON.stringify(files)};</script>\n`;
html = html.replace("</head>", payload + "</head>");

const fetchContent = `fetch("content/"+n+".json",{cache:"no-cache"})`;
if (!html.includes(fetchContent)) throw new Error("offline: the content fetch is not where it was expected");
html = html.replace(fetchContent,
  `Promise.resolve({ok:true,json:function(){return window.__FILES[n];}})`);

const fetchCfg = `fetch("content/supabase.json",{cache:"no-cache"})`;
if (!html.includes(fetchCfg)) throw new Error("offline: the config fetch is not where it was expected");
html = html.replace(fetchCfg,
  `Promise.resolve({ok:true,json:function(){return window.__FILES.supabase;}})`);

/* ---------- 4. no calling home ----------
   The Google tag would fire from file:// and report traffic that is not
   traffic: one person opening a file on a laptop, logged against the real
   site. It also makes a document that is meant to work with no signal ask the
   network for something before it will finish loading. */
const before = html.length;
html = html.replace(/<script async src="https:\/\/www\.googletagmanager\.com[^<]*<\/script>\s*/g, "");
html = html.replace(/<script>window\.dataLayer=window\.dataLayer[\s\S]*?<\/script>\s*/g, "");
if (html.includes("googletagmanager")) throw new Error("offline: the Google tag is still in the file");
console.log(`  stripped the Google tag (${before - html.length} bytes)`);

/* ---------- 5. say what it is ---------- */
html = html.replace("<!--seo:start-->",
  `<!-- Self-contained copy, built ${new Date().toISOString().slice(0, 10)} by tools/make-offline.mjs.\n`
  + `     Opens from disk with no server and no network. The live site is the\n`
  + `     source of truth; rebuild this file after changing content. -->\n<!--seo:start-->`);
/* a file on disk has no canonical URL of its own */
html = html.replace(/<link rel="canonical"[^>]*>\n?/, "");

fs.writeFileSync(OUT, html);
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`${OUT}  ${kb} KB`);
