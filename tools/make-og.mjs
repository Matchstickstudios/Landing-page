/* Renders assets/og-card.html at exactly 1200x630 and writes assets/og.png.
 *
 * Done through the browser rather than an image library so the card uses the
 * site's own fonts and palette — the same stylesheet, not a re-typing of it.
 *
 *   node tools/make-og.mjs          (needs a Chromium-family browser)
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PORT = 4321, DBG = 9444;
const BROWSERS = [
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];
const bin = BROWSERS.find((b) => fs.existsSync(b));
if (!bin) { console.error("No Chromium-family browser found."); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* a one-file static server, so the card can load site.css and mark.png */
const http = await import("node:http");
const types = { ".html": "text/html", ".css": "text/css", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, "assets", decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(path.join(ROOT, "assets")) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(PORT);

const proc = spawn(bin, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${DBG}`, `--user-data-dir=${path.join(ROOT, ".og-profile")}`,
  "about:blank"], { stdio: "ignore" });

try {
  let targets;
  for (let i = 0; i < 30; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json(); break; }
    catch { await sleep(400); }
  }
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  let id = 0; const waiters = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiters.has(m.id)) { waiters.get(m.id)(m); waiters.delete(m.id); }
  });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params = {}) =>
    new Promise((r) => { const i = ++id; waiters.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride",
    { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/og-card.html` });
  await sleep(2600);                                   /* the fonts are large */
  const shot = await send("Page.captureScreenshot",
    { format: "png", clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  const png = path.join(ROOT, "assets/.og.png");
  const out = path.join(ROOT, "assets/og.jpg");
  fs.writeFileSync(png, Buffer.from(shot.result.data, "base64"));
  /* the PNG of this card is ~430 KB and the JPEG is ~115 KB for no visible
     difference. Some clients, WhatsApp among them, give up on a heavy image
     and show no preview at all, so the smaller one is the safer card. */
  await new Promise((r) => {
    const s = spawn("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "86", png, "--out", out],
      { stdio: "ignore" });
    s.on("close", r); s.on("error", r);
  });
  if (!fs.existsSync(out)) { fs.copyFileSync(png, path.join(ROOT, "assets/og.png")); }
  fs.rmSync(png, { force: true });
  const f = fs.existsSync(out) ? out : path.join(ROOT, "assets/og.png");
  console.log(`${path.relative(ROOT, f)}  ${(fs.statSync(f).size / 1024).toFixed(0)} KB  1200x630`);
  ws.close();
} finally {
  proc.kill();
  server.close();
  fs.rmSync(path.join(ROOT, ".og-profile"), { recursive: true, force: true });
}
