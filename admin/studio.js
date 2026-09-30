/* The studio: a small admin over the Supabase tables that hold the site.
 *
 * It talks to PostgREST and GoTrue directly over fetch. No build step, no
 * bundler, one dependency (marked, for the blog preview) and that is loaded
 * lazily — the rest of the panel works with it blocked.
 *
 * Nothing here is privileged. It runs on the anon key in the browser, exactly
 * as a visitor's page does; what it is allowed to change is decided by the
 * row-level policies in supabase/schema.sql, which grant writes to an
 * authenticated user and nothing to anyone else. Signing out really does
 * remove the ability to write.
 */

const $ = (s, r = document) => r.querySelector(s);
const el = (t, a = {}, ...kids) => {
  const n = document.createElement(t);
  for (const [k, v] of Object.entries(a)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) n.append(k);
  return n;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------------- config ---------------- */
let CFG = null, TOKEN = null, USER = null;

async function loadConfig() {
  const r = await fetch("../content/supabase.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("content/supabase.json is missing.");
  const c = await r.json();
  if (!c.url || !c.anonKey)
    throw new Error("content/supabase.json has no url or anonKey yet. Fill it in and reload.");
  return { url: c.url.replace(/\/$/, ""), key: c.anonKey };
}

/* ---------------- api ---------------- */
function headers(extra = {}) {
  return {
    "Content-Type": "application/json",
    apikey: CFG.key,
    Authorization: `Bearer ${TOKEN || CFG.key}`,
    ...extra,
  };
}
async function rest(path, opts = {}) {
  const r = await fetch(`${CFG.url}/rest/v1/${path}`, { ...opts, headers: headers(opts.headers) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.status === 204 ? null : r.json();
}
const getAll = (t, q = "select=*&order=sort.asc") => rest(`${t}?${q}`);
const patch = (t, id, body) =>
  rest(`${t}?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { Prefer: "return=minimal" } });
const insert = (t, body) =>
  rest(t, { method: "POST", body: JSON.stringify(body), headers: { Prefer: "return=representation" } });
const remove = (t, id) =>
  rest(`${t}?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });

/* ---------------- auth ---------------- */
const SESSION_KEY = "ms.studio.session";

async function signIn(email, password) {
  const r = await fetch(`${CFG.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CFG.key },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.msg || d.message || "Could not sign in");
  keepSession(d);
  return d;
}
function keepSession(d) {
  TOKEN = d.access_token;
  USER = d.user;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      access_token: d.access_token, refresh_token: d.refresh_token,
      expires_at: Date.now() + (d.expires_in || 3600) * 1000, user: d.user,
    }));
  } catch {}
}
async function restoreSession() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return false; }
  if (!s) return false;
  if (s.expires_at > Date.now() + 60000) { TOKEN = s.access_token; USER = s.user; return true; }
  /* expired — the refresh token buys another hour without a second sign-in */
  try {
    const r = await fetch(`${CFG.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CFG.key },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!r.ok) throw 0;
    keepSession(await r.json());
    return true;
  } catch { localStorage.removeItem(SESSION_KEY); return false; }
}
async function sendReset(email) {
  const r = await fetch(`${CFG.url}/auth/v1/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CFG.key },
    body: JSON.stringify({ email, redirect_to: location.origin + location.pathname }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.msg || d.error_description || d.message || "Could not send the link");
  }
  /* GoTrue answers 200 whether or not the address exists, on purpose: it must
     not become a way of asking which emails have accounts. */
}

async function setPassword(password) {
  const r = await fetch(`${CFG.url}/auth/v1/user`, {
    method: "PUT", headers: headers(), body: JSON.stringify({ password }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.msg || d.error_description || d.message || "Could not set the password");
  return d;
}

/* The emailed link comes back as #access_token=...&type=recovery. Consuming it
   signs the browser in, which is what lets the password be changed. */
function recoveryFromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("type") !== "recovery" || !h.get("access_token")) return null;
  const tok = {
    access_token: h.get("access_token"),
    refresh_token: h.get("refresh_token"),
    expires_in: +(h.get("expires_in") || 3600),
    user: null,
  };
  history.replaceState(null, "", location.pathname);   /* keep it out of the bar */
  return tok;
}

function eyeToggle(btn, input) {
  btn.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.classList.toggle("on", show);
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    input.focus();
  });
}

function signOut() {
  fetch(`${CFG.url}/auth/v1/logout`, { method: "POST", headers: headers() }).catch(() => {});
  localStorage.removeItem(SESSION_KEY);
  TOKEN = null; USER = null;
  location.reload();
}

/* ---------------- dirty state ---------------- */
const dirty = new Map();          // table -> Map(id -> patch)
const created = [];               // {table, row}
const deleted = [];               // {table, id}
let reordered = new Set();

function mark(table, id, field, value) {
  if (!dirty.has(table)) dirty.set(table, new Map());
  const t = dirty.get(table);
  if (!t.has(id)) t.set(id, {});
  t.get(id)[field] = value;
  showSaveBar();
}
function pending() {
  let n = created.length + deleted.length;
  for (const t of dirty.values()) n += t.size;
  return n + reordered.size;
}
function showSaveBar() {
  const n = pending();
  $("#saveBar").classList.toggle("on", n > 0);
  $("#saveMsg").textContent =
    n === 0 ? "" : `${n} unsaved change${n === 1 ? "" : "s"}`;
}
function clearDirty() { dirty.clear(); created.length = 0; deleted.length = 0; reordered = new Set(); showSaveBar(); }

function toast(msg, bad) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("bad", !!bad);
  t.classList.add("on");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("on"), 2800);
}

/* ---------------- field builders ---------------- */
function field(label, hint, control) {
  return el("div", { class: "f" },
    el("label", {}, label, hint ? el("span", { class: "hint" }, hint) : null),
    control);
}
function text(value, on, { area = false, ph = "" } = {}) {
  const n = el(area ? "textarea" : "input", { class: "inp", placeholder: ph });
  n.value = value ?? "";
  n.addEventListener("input", () => on(n.value));
  return n;
}
function num(value, on) {
  const n = el("input", { class: "inp", type: "number", step: "0.5" });
  n.value = value ?? 0;
  n.addEventListener("input", () => on(n.value === "" ? 0 : Number(n.value)));
  return n;
}
/* an editable list of plain strings */
function chips(values, on) {
  const list = [...(values || [])];
  const box = el("div", { class: "chips" });
  const draw = () => {
    box.textContent = "";
    list.forEach((v, i) => {
      const inp = el("input", { class: "inp" });
      inp.value = v;
      inp.addEventListener("input", () => { list[i] = inp.value; on([...list]); });
      box.append(el("div", { class: "chip" }, inp,
        el("button", { class: "chipX", type: "button", title: "Remove",
          onclick: () => { list.splice(i, 1); on([...list]); draw(); } }, "×")));
    });
    box.append(el("button", { class: "btn gho sm", type: "button",
      onclick: () => { list.push(""); on([...list]); draw(); } }, "+ Add"));
  };
  draw();
  return box;
}

/* ---------------- a reorderable list of records ---------------- */
function recordList(table, rows, render, blank) {
  const host = el("div", {});
  const draw = () => {
    host.textContent = "";
    rows.forEach((row, i) => {
      const card = el("div", { class: "card", draggable: "true" });
      card.dataset.i = i;
      card.addEventListener("dragstart", (e) => {
        card.classList.add("drag"); e.dataTransfer.setData("text/plain", i);
      });
      card.addEventListener("dragend", () => card.classList.remove("drag"));
      card.addEventListener("dragover", (e) => { e.preventDefault(); card.classList.add("over"); });
      card.addEventListener("dragleave", () => card.classList.remove("over"));
      card.addEventListener("drop", (e) => {
        e.preventDefault(); card.classList.remove("over");
        const from = +e.dataTransfer.getData("text/plain");
        if (from === i) return;
        const [m] = rows.splice(from, 1);
        rows.splice(i, 0, m);
        rows.forEach((r, k) => { if (r.sort !== k) { r.sort = k; mark(table, r.id, "sort", k); reordered.add(table); } });
        draw();
      });
      card.append(el("div", { class: "cardTop" },
        el("span", { class: "grab", title: "Drag to reorder" }, "☰"),
        el("h3", {}, render.title(row)),
        el("button", {
          class: "btn red sm", type: "button",
          onclick: () => {
            if (!confirm(`Delete "${render.title(row)}"? This cannot be undone once saved.`)) return;
            deleted.push({ table, id: row.id });
            rows.splice(rows.indexOf(row), 1);
            showSaveBar(); draw();
          },
        }, "Delete")));
      render.body(card, row);
      host.append(card);
    });
    if (blank) {
      host.append(el("button", {
        class: "btn", type: "button",
        onclick: async () => {
          try {
            const row = (await insert(table, { ...blank(), sort: rows.length }))[0];
            rows.push(row); draw(); toast("Added");
          } catch (e) { toast(e.message, true); }
        },
      }, "+ Add"));
    }
  };
  draw();
  return host;
}

/* ---------------- views ---------------- */
const DATA = {};   // table -> rows, loaded once per sign-in

const VIEWS = {
  site: {
    label: "Site",
    async render(view) {
      view.append(el("h1", {}, "Site"),
        el("p", { class: "sub" }, "The bar, the links out, the strip that scrolls under the hero, the studio line and the four counters."));

      view.append(el("h1", { style: "font-size:16px;margin-top:22px" }, "Navigation"));
      view.append(recordList("nav", DATA.nav, {
        title: (r) => r.label || "Untitled",
        body: (card, r) => {
          card.append(el("div", { class: "row" },
            field("Link text", null, text(r.label, (v) => { r.label = v; mark("nav", r.id, "label", v); })),
            field("Points at", "#desk for a section on the page, /blog/ for a page of its own",
              text(r.href, (v) => { r.href = v; mark("nav", r.id, "href", v); }))));
        },
      }, () => ({ label: "New link", href: "#desk" })));

      view.append(el("h1", { style: "font-size:16px;margin-top:26px" }, "Social"));
      view.append(recordList("social", DATA.social, {
        title: (r) => r.network,
        body: (card, r) => card.append(field("Profile URL", null,
          text(r.url, (v) => { r.url = v; mark("social", r.id, "url", v); }))),
      }, null));

      view.append(el("h1", { style: "font-size:16px;margin-top:26px" }, "Scrolling strip"));
      view.append(recordList("ticker", DATA.ticker, {
        title: (r) => r.phrase || "—",
        body: (card, r) => card.append(field("Phrase", null,
          text(r.phrase, (v) => { r.phrase = v; mark("ticker", r.id, "phrase", v); }))),
      }, () => ({ phrase: "New phrase" })));

      const s = DATA.settings[0];
      view.append(el("h1", { style: "font-size:16px;margin-top:26px" }, "Studio line & counters"));
      const card = el("div", { class: "card" });
      card.append(field("The studio story", "The paragraph under the team.",
        text(s.story, (v) => { s.story = v; mark("settings", s.id, "story", v); }, { area: true })));
      const stats = [...(s.stats || [])];
      const statBox = el("div", { class: "row" });
      stats.forEach((st, i) => {
        statBox.append(el("div", {},
          field("Number", null, text(st.value, (v) => { stats[i].value = v; s.stats = stats; mark("settings", s.id, "stats", stats); })),
          field("Caption", null, text(st.label, (v) => { stats[i].label = v; s.stats = stats; mark("settings", s.id, "stats", stats); }))));
      });
      card.append(field("Counters", null, statBox));
      view.append(card);
    },
  },

  team: {
    label: "Team",
    async render(view) {
      view.append(el("h1", {}, "Team"),
        el("p", { class: "sub" }, "Drag to reorder. The scatter position only applies above 1080px; below that the cards stack."));
      view.append(recordList("team", DATA.team, {
        title: (r) => `${r.name || "New"} — ${r.role || ""}`,
        body: (card, r) => {
          const m = (f) => (v) => { r[f] = v; mark("team", r.id, f, v); };
          card.append(el("div", { class: "row" },
            field("Name", null, text(r.name, m("name"))),
            field("Role", null, text(r.role, m("role"))),
            field("Initials", "Two letters for the disc.", text(r.initials, m("initials")))));
          card.append(field("Bio", null, text(r.bio, m("bio"), { area: true })));
          card.append(field("What they do", null, chips(r.does, m("does"))));
          card.append(field("Scatter position (desktop)", "x %, y %, rotation °",
            el("div", { class: "row3" },
              num(r.pos_x, m("pos_x")), num(r.pos_y, m("pos_y")), num(r.pos_r, m("pos_r")))));
        },
      }, () => ({ name: "New person", role: "Role", initials: "NN", bio: "", does: [], pos_x: 0, pos_y: 0, pos_r: 0 })));
    },
  },

  services: {
    label: "Services",
    async render(view) {
      view.append(el("h1", {}, "Services"),
        el("p", { class: "sub" }, "The accordion. Each one is a panel on the page and an option in the brief form."));
      view.append(recordList("services", DATA.services, {
        title: (r) => r.title || "New service",
        body: (card, r) => {
          const m = (f) => (v) => { r[f] = v; mark("services", r.id, f, v); };
          card.append(el("div", { class: "row" },
            field("Service", null, text(r.title, m("title"))),
            field("Kicker", "The small word above the title.", text(r.kicker, m("kicker")))));
          card.append(field("Summary", null, text(r.summary, m("summary"), { area: true })));
          card.append(field("What you get", null, chips(r.get_items, m("get_items"))));
          card.append(field("The first thirty days", null, text(r.first_30, m("first_30"), { area: true })));
        },
      }, () => ({ title: "New service", kicker: "", summary: "", get_items: [], first_30: "" })));
    },
  },

  projects: {
    label: "Projects",
    async render(view) {
      view.append(el("h1", {}, "Projects"),
        el("p", { class: "sub" }, "The work carousel."));
      view.append(recordList("projects", DATA.projects, {
        title: (r) => r.title || "New project",
        body: (card, r) => {
          const m = (f) => (v) => { r[f] = v; mark("projects", r.id, f, v); };
          card.append(el("div", { class: "row" },
            field("Title", null, text(r.title, m("title"))),
            field("Tag", "The chip on the artwork.", text(r.tag, m("tag")))));
          card.append(field("Summary", null, text(r.summary, m("summary"), { area: true })));
          card.append(field("Deliverables", null, chips(r.chips, m("chips"))));
        },
      }, () => ({ title: "New project", tag: "", summary: "", chips: [] })));
    },
  },

  reasons: {
    label: "Why us",
    async render(view) {
      view.append(el("h1", {}, "Why us"));
      view.append(recordList("reasons", DATA.reasons, {
        title: (r) => r.title || "New reason",
        body: (card, r) => {
          const m = (f) => (v) => { r[f] = v; mark("reasons", r.id, f, v); };
          card.append(field("Reason", null, text(r.title, m("title"))));
          card.append(field("Body", null, text(r.body, m("body"), { area: true })));
          card.append(field("Scatter position (desktop)", "x %, y %, rotation °",
            el("div", { class: "row3" },
              num(r.pos_x, m("pos_x")), num(r.pos_y, m("pos_y")), num(r.pos_r, m("pos_r")))));
        },
      }, () => ({ title: "New reason", body: "", pos_x: 0, pos_y: 0, pos_r: 0 })));
    },
  },

  brief: {
    label: "Brief form",
    async render(view) {
      view.append(el("h1", {}, "Brief form"),
        el("p", { class: "sub" }, "The three questions. Only the third carries an emoji — it is shown on the button and never reaches the enquiry."));
      for (const [q, title, hint] of [
        ["services", "Q1 — Services", "Pick any. These mirror the six services."],
        ["who", "Q2 — You are", "One answer."],
        ["when", "Q3 — Start", "One answer, each with a face."],
      ]) {
        view.append(el("h1", { style: "font-size:16px;margin-top:24px" }, title),
          el("p", { class: "sub" }, hint));
        const rows = DATA.brief_options.filter((o) => o.question === q);
        view.append(recordList("brief_options", rows, {
          title: (r) => (r.emoji ? r.emoji + " " : "") + (r.value || "New"),
          body: (card, r) => {
            const m = (f) => (v) => { r[f] = v; mark("brief_options", r.id, f, v); };
            card.append(el("div", { class: "row" },
              field("Answer", null, text(r.value, m("value"))),
              q === "when" ? field("Face", "One emoji.", text(r.emoji, m("emoji"))) : null));
          },
        }, () => ({ question: q, value: "New answer", emoji: q === "when" ? "🙂" : null })));
      }
    },
  },

  theme: {
    label: "Theme & contact",
    async render(view) {
      const s = DATA.settings[0];
      view.append(el("h1", {}, "Theme & contact"),
        el("p", { class: "sub" }, "The palette drives every colour on the site. Contact drives the WhatsApp button, the call link and the email form."));
      const colors = { ...(s.colors || {}) };
      const names = {
        soot: "Background", soot2: "Background, lifted", panel: "Panel",
        ash: "Text", ash2: "Text, quiet", ash3: "Text, quietest",
        ember: "Ember (primary)", flame: "Flame", gold: "Gold",
        deep: "Deep red", cool: "Cool accent",
      };
      const box = el("div", { class: "swatches" });
      for (const [k, label] of Object.entries(names)) {
        const code = el("code", {}, colors[k] || "#000000");
        const inp = el("input", { type: "color", value: colors[k] || "#000000" });
        inp.addEventListener("input", () => {
          colors[k] = inp.value; code.textContent = inp.value;
          s.colors = colors; mark("settings", s.id, "colors", colors);
        });
        box.append(el("div", { class: "sw" }, inp, el("div", {}, el("b", {}, label), code)));
      }
      view.append(el("div", { class: "card" }, field("Palette", null, box)));

      const m = (f) => (v) => { s[f] = v; mark("settings", s.id, f, v); };
      view.append(el("div", { class: "card" }, el("div", { class: "row" },
        field("Phone", "Used for the call link.", text(s.phone, m("phone"))),
        field("WhatsApp", "Country code, no +.", text(s.whatsapp, m("whatsapp"))),
        field("Email", null, text(s.email, m("email"))))));
    },
  },

  posts: {
    label: "Blog",
    async render(view) {
      view.append(el("h1", {}, "Blog"),
        el("p", { class: "sub" }, "Markdown on the left, preview on the right. A draft is not published until you untick it."));
      view.append(recordList("posts", DATA.posts, {
        title: (r) => r.title || "Untitled",
        body: (card, r) => {
          const m = (f) => (v) => { r[f] = v; mark("posts", r.id, f, v); };
          card.append(el("div", { class: "cardTop", style: "margin:6px 0 0" },
            el("span", { class: "pill " + (r.draft ? "draft" : "live") }, r.draft ? "Draft" : "Published"),
            el("span", { class: "pill" }, r.published)));
          card.append(el("div", { class: "row" },
            field("Title", null, text(r.title, m("title"))),
            field("Slug", "The URL: /blog/<slug>/", text(r.slug, m("slug")))));
          card.append(el("div", { class: "row" },
            field("Published", null, (() => {
              const d = el("input", { class: "inp", type: "date" });
              d.value = r.published; d.addEventListener("input", () => m("published")(d.value));
              return d;
            })()),
            field("Draft", "Drafts never reach the site.", (() => {
              const c = el("input", { type: "checkbox" });
              c.checked = !!r.draft;
              c.addEventListener("change", () => m("draft")(c.checked));
              return el("div", { style: "padding-top:9px" }, c);
            })())));
          card.append(field("Excerpt", "Shown in the list and used as the meta description.",
            text(r.excerpt, m("excerpt"), { area: true })));
          card.append(field("Tags", null, chips(r.tags, m("tags"))));

          const prev = el("div", { class: "preview" });
          const area = el("textarea", { class: "inp md" });
          area.value = r.body || "";
          const paint = async () => {
            m("body")(area.value);
            prev.innerHTML = await renderMd(area.value);
          };
          area.addEventListener("input", paint);
          card.append(el("div", { class: "f" },
            el("label", {}, "Post"),
            el("div", { class: "split" }, area, prev)));
          renderMd(area.value).then((h) => { prev.innerHTML = h; });
        },
      }, () => ({
        title: "New post", slug: "new-post-" + Date.now().toString(36),
        published: new Date().toISOString().slice(0, 10),
        excerpt: "", tags: [], body: "Write here.", draft: true,
      })));
    },
  },

  seo: {
    label: "SEO",
    async render(view) {
      view.append(el("h1", {}, "SEO"),
        el("p", { class: "sub" }, "What Google and the social networks read. These are written into every page at build time \u2014 the landing page, the blog index and each post."));
      const rows = await getAll("seo", "select=*&limit=1").catch(() => []);
      if (!rows.length) {
        view.append(el("p", { class: "err" },
          "The seo table does not exist yet. Run supabase/002_seo_analytics.sql in the SQL editor."));
        return;
      }
      const o = rows[0];
      const m = (f) => (v) => { o[f] = v; mark("seo", o.id, f, v); };
      const c1 = el("div", { class: "card" });
      c1.append(field("Page title", "What shows in the tab and as the headline in search results. Around 60 characters.",
        text(o.title, m("title"))));
      c1.append(field("Meta description", "The grey text under the title in search results. Around 155 characters.",
        text(o.description, m("description"), { area: true })));
      c1.append(field("Keywords", "Google ignores these, but Bing and some crawlers still read them.",
        chips(o.keywords, m("keywords"))));
      view.append(c1);

      const c2 = el("div", { class: "card" });
      c2.append(el("h3", { style: "margin:0 0 4px;font-size:15px" }, "Sharing"));
      c2.append(field("Share image", "Absolute URL. Shown when the site is pasted into WhatsApp, LinkedIn or X. 1200\u00d7630 works everywhere.",
        text(o.og_image, m("og_image"), { ph: "https://\u2026/share.png" })));
      c2.append(field("X / Twitter handle", null, text(o.twitter_handle, m("twitter_handle"), { ph: "@matchstickstd" })));
      view.append(c2);

      const c3 = el("div", { class: "card" });
      c3.append(el("h3", { style: "margin:0 0 4px;font-size:15px" }, "Google"));
      c3.append(field("Google Analytics measurement ID",
        "From Analytics \u2192 Admin \u2192 Data streams. Looks like G-XXXXXXXXXX. Leave blank to run no Google tag at all.",
        text(o.ga_measurement_id, m("ga_measurement_id"), { ph: "G-XXXXXXXXXX" })));
      c3.append(field("Search Console verification",
        "Search Console \u2192 Add property \u2192 HTML tag. Paste only the content value, not the whole tag.",
        text(o.gsc_verification, m("gsc_verification"))));
      c3.append(field("Bing verification", "Optional.", text(o.bing_verification, m("bing_verification"))));
      c3.append(field("Robots", "index,follow lets search engines in. noindex,nofollow keeps the whole site out of search.",
        (() => {
          const sel = el("select", { class: "inp" });
          for (const v of ["index,follow", "noindex,follow", "index,nofollow", "noindex,nofollow"])
            sel.append(el("option", { value: v, selected: o.robots === v || false }, v));
          sel.value = o.robots || "index,follow";
          sel.addEventListener("change", () => m("robots")(sel.value));
          return sel;
        })()));
      view.append(c3);

      view.append(el("div", { class: "note", html:
        "Changes here reach Google only after the site rebuilds \u2014 daily, or immediately from the Actions tab. " +
        "After that, ask Google to re-read it in <b>Search Console \u2192 URL inspection \u2192 Request indexing</b>." }));
    },
  },

  analytics: {
    label: "Analytics",
    async render(view) {
      view.append(el("h1", {}, "Analytics"),
        el("p", { class: "sub" }, "Counted by the site itself, into your own database. No third party, no cookie banner, and nobody else holds the numbers."));

      let days = 30;
      const host = el("div", {});
      const range = el("div", { class: "range" });
      for (const d of [7, 30, 90]) {
        range.append(el("button", {
          class: "btn " + (d === days ? "" : "gho") + " sm",
          onclick: () => { days = d; paint(); },
        }, `${d} days`));
      }
      view.append(range, host);

      async function paint() {
        for (const b of range.children)
          b.className = "btn " + (b.textContent === `${days} days` ? "" : "gho") + " sm";
        host.textContent = "Loading\u2026";
        const since = new Date(Date.now() - days * 864e5).toISOString();
        let rows;
        try {
          rows = await getAll("pageviews", `select=*&created_at=gte.${since}&order=created_at.desc&limit=20000`);
        } catch (e) {
          host.textContent = "";
          host.append(el("p", { class: "err" },
            "The pageviews table does not exist yet. Run supabase/002_seo_analytics.sql in the SQL editor."));
          return;
        }
        host.textContent = "";
        if (!rows.length) {
          host.append(el("p", { class: "empty" },
            "No views recorded yet. The counter starts with the next deploy \u2014 give it a day."));
          return;
        }

        const sessions = new Set(rows.map((r) => r.session)).size;
        const byDay = new Map();
        for (let i = days - 1; i >= 0; i--)
          byDay.set(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), 0);
        for (const r of rows) {
          const d = r.created_at.slice(0, 10);
          if (byDay.has(d)) byDay.set(d, byDay.get(d) + 1);
        }
        const tally = (fn) => {
          const m = new Map();
          for (const r of rows) { const k = fn(r) || "\u2014"; m.set(k, (m.get(k) || 0) + 1); }
          return [...m.entries()].sort((a, b) => b[1] - a[1]);
        };

        host.append(el("div", { class: "kpis" },
          el("div", { class: "kpi" }, el("b", {}, String(rows.length)), el("span", {}, "Page views")),
          el("div", { class: "kpi" }, el("b", {}, String(sessions)), el("span", {}, "Visits")),
          el("div", { class: "kpi" }, el("b", {}, (rows.length / sessions).toFixed(1)), el("span", {}, "Pages per visit")),
          el("div", { class: "kpi" }, el("b", {}, String(Math.round(rows.length / days))), el("span", {}, "Views a day"))));

        const max = Math.max(...byDay.values(), 1);
        const chart = el("div", { class: "chart" });
        for (const [d, n] of byDay) {
          chart.append(el("div", { class: "cbar", style: `height:${Math.max(2, (n / max) * 100)}%` },
            el("span", {}, `${new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${n}`)));
        }
        host.append(chart);

        const table = (title, entries, label) => {
          const t = el("table", {}, el("thead", {}, el("tr", {},
            el("th", {}, label), el("th", { style: "width:90px" }, "Views"))));
          const tb = el("tbody", {});
          for (const [k, n] of entries.slice(0, 12)) tb.append(el("tr", {}, el("td", {}, k), el("td", {}, String(n))));
          t.append(tb);
          return el("div", { style: "margin-bottom:22px" },
            el("h3", { style: "font-size:14px;margin:0 0 8px" }, title), t);
        };
        const pages = tally((r) => r.path);
        const refs = tally((r) => {
          if (!r.referrer) return "Direct / none";
          try { return new URL(r.referrer).hostname.replace(/^www\./, ""); } catch { return r.referrer; }
        });
        const screens = tally((r) => r.screen);

        host.append(el("div", { class: "exports" },
          el("button", { class: "btn gho sm", onclick: () =>
            downloadXls(pages.map(([path, views]) => ({ path, views })),
              [{ key: "path", label: "Page" }, { key: "views", label: "Views" }], "Analytics") }, "Excel (.xls)"),
          el("button", { class: "btn gho sm", onclick: () =>
            downloadPdf(pages.map(([path, views]) => ({ path, views })),
              [{ key: "path", label: "Page" }, { key: "views", label: "Views" }],
              "Analytics", `${rows.length} views over ${days} days`) }, "PDF")));

        host.append(table("Pages", pages, "Path"));
        host.append(table("Where they came from", refs, "Source"));
        host.append(table("Screen", screens, "Type"));
      }
      paint();
    },
  },

  enquiries: {
    label: "Enquiries",
    async render(view) {
      view.append(el("h1", {}, "Enquiries"),
        el("p", { class: "sub" }, "Everything the brief form has collected. Read-only here."));
      const rows = await getAll("enquiries", "select=*&order=created_at.desc&limit=500");
      if (!rows.length) {
        view.append(el("p", { class: "empty" }, "Nothing yet."));
        return;
      }
      const cols = [
        { key: "created_at", label: "When", get: (r) => new Date(r.created_at).toLocaleString("en-GB") },
        { key: "name", label: "Name" }, { key: "phone", label: "Phone" },
        { key: "email", label: "Email" }, { key: "services", label: "Wants" },
        { key: "who", label: "Who" }, { key: "start_when", label: "Start" },
        { key: "message", label: "About the business" }, { key: "sent_via", label: "Via" },
      ];
      view.append(el("div", { class: "exports" },
        el("button", { class: "btn gho sm", onclick: () => downloadXls(rows, cols, "Enquiries") }, "Excel (.xls)"),
        el("button", { class: "btn gho sm", onclick: () =>
          downloadPdf(rows, cols, "Enquiries", `${rows.length} enquiries \u00b7 exported ${new Date().toLocaleDateString("en-GB")}`) }, "PDF"),
        el("button", { class: "btn gho sm", onclick: () => downloadCsv(rows) }, "CSV")));
      const t = el("table", {}, el("thead", {}, el("tr", {},
        ...["When", "Name", "Phone", "Email", "Wants", "Who", "Start", "Via"].map((h) => el("th", {}, h)))));
      const tb = el("tbody", {});
      for (const r of rows) {
        tb.append(el("tr", {},
          el("td", {}, new Date(r.created_at).toLocaleString("en-GB")),
          el("td", {}, r.name || ""),
          el("td", {}, r.phone || ""),
          el("td", {}, r.email || ""),
          el("td", {}, (r.services || []).join(", ")),
          el("td", {}, r.who || ""),
          el("td", {}, r.start_when || ""),
          el("td", {}, r.sent_via || "")));
      }
      t.append(tb);
      view.append(t);
    },
  },
};

/* Excel opens SpreadsheetML 2003 natively, so a real .xls needs no library and
   no CDN — which matters in a browser with shields up. */
function downloadXls(rows, cols, name) {
  const x = (v) => String(Array.isArray(v) ? v.join("; ") : (v ?? ""))
    .replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const head = cols.map((c) => `<Cell ss:StyleID="h"><Data ss:Type="String">${x(c.label)}</Data></Cell>`).join("");
  const body = rows.map((r) =>
    "<Row>" + cols.map((c) => `<Cell><Data ss:Type="String">${x(c.get ? c.get(r) : r[c.key])}</Data></Cell>`).join("") + "</Row>"
  ).join("");
  const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/>
<Interior ss:Color="#FF5F1F" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="${x(name)}"><Table><Row>${head}</Row>${body}</Table></Worksheet>
</Workbook>`;
  saveBlob(new Blob([xml], { type: "application/vnd.ms-excel" }),
    `${name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xls`);
}

/* PDF through the browser's own print pipeline: no library, and the result is
   a proper vector PDF rather than a screenshot. */
function downloadPdf(rows, cols, name, sub) {
  const x = (v) => String(Array.isArray(v) ? v.join("; ") : (v ?? ""))
    .replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const w = window.open("", "_blank", "width=1000,height=760");
  if (!w) { toast("Allow pop-ups for this site to export a PDF", true); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${x(name)}</title>
<style>
  @page{size:A4 landscape;margin:14mm}
  body{font:11px/1.45 -apple-system,system-ui,sans-serif;color:#111;margin:0}
  h1{font-size:17px;margin:0 0 3px}
  .sub{color:#666;font-size:11px;margin:0 0 14px}
  table{width:100%;border-collapse:collapse}
  th{background:#FF5F1F;color:#fff;text-align:left;padding:7px 8px;font-size:10px;
     text-transform:uppercase;letter-spacing:.05em}
  td{padding:6px 8px;border-bottom:1px solid #e3e3e3;vertical-align:top}
  tr:nth-child(even) td{background:#fafafa}
</style></head><body>
<h1>${x(name)} &mdash; Matchstick Studios</h1>
<p class="sub">${x(sub || "")}</p>
<table><thead><tr>${cols.map((c) => `<th>${x(c.label)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => "<tr>" + cols.map((c) => `<td>${x(c.get ? c.get(r) : r[c.key])}</td>`).join("") + "</tr>").join("")}</tbody>
</table></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

function saveBlob(blob, filename) {
  const a = el("a", { href: URL.createObjectURL(blob), download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function downloadCsv(rows) {
  const cols = ["created_at", "name", "phone", "email", "services", "who", "start_when", "message", "sent_via"];
  const cell = (v) => `"${String(Array.isArray(v) ? v.join("; ") : (v ?? "")).replace(/"/g, '""')}"`;
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
  const a = el("a", {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: `enquiries-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
}

/* markdown, loaded on demand so a blocked CDN costs only the preview */
let _marked;
async function renderMd(src) {
  if (_marked === undefined) {
    try {
      _marked = (await import("https://cdn.jsdelivr.net/npm/marked@12/lib/marked.esm.js")).marked;
    } catch { _marked = null; }
  }
  if (!_marked) return `<p style="color:var(--ash3)">Preview unavailable (the markdown library did not load). The post is saved either way.</p>`;
  return _marked.parse(src || "");
}

/* ---------------- saving ---------------- */
async function saveAll() {
  const btn = $("#save");
  btn.disabled = true;
  try {
    for (const { table, id } of deleted) await remove(table, id);
    for (const [table, rows] of dirty) {
      for (const [id, body] of rows) {
        if (deleted.some((d) => d.table === table && d.id === id)) continue;
        await patch(table, id, body);
      }
    }
    clearDirty();
    toast("Saved. Live on the site within a day, or publish now from the banner.");
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false;
  }
}

/* ---------------- boot ---------------- */
let currentTab = "site";

async function loadAll() {
  const [nav, social, ticker, team, services, projects, reasons, brief_options, settings, posts] =
    await Promise.all([
      getAll("nav"), getAll("social"), getAll("ticker"), getAll("team"),
      getAll("services"), getAll("projects"), getAll("reasons"), getAll("brief_options"),
      getAll("settings", "select=*&limit=1"),
      getAll("posts", "select=*&order=published.desc"),
    ]);
  Object.assign(DATA, { nav, social, ticker, team, services, projects, reasons, brief_options, settings, posts });
  /* added by a later migration: the panel still opens without it */
  DATA.seo = await getAll("seo", "select=*&limit=1").catch(() => []);
}

async function show(tab) {
  currentTab = tab;
  for (const b of $("#tabs").children) b.classList.toggle("on", b.dataset.tab === tab);
  const view = $("#view");
  view.textContent = "";
  view.append(el("div", { class: "note", html:
    'Changes are saved to Supabase immediately. The website rebuilds from it <b>once a day</b>, ' +
    'or straight away if you run the <b>Deploy to GitHub Pages</b> workflow: ' +
    '<a href="https://github.com/Matchstickstudios/Landing-page/actions/workflows/deploy.yml" target="_blank" rel="noopener">open it on GitHub</a> ' +
    'and press <b>Run workflow</b>.' }));
  try {
    await VIEWS[tab].render(view);
  } catch (e) {
    view.append(el("p", { class: "err" }, e.message));
  }
}

async function start() {
  try {
    CFG = await loadConfig();
  } catch (e) {
    $("#bootErr").textContent = e.message;
    return;
  }
  /* the emailed reset link lands here first */
  const recovery = recoveryFromHash();
  if (recovery) keepSession(recovery);

  const signedIn = recovery ? true : await restoreSession();
  $("#boot").hidden = true;

  eyeToggle($("#pwEye"), $("#pw"));
  eyeToggle($("#npEye"), $("#np"));

  if (recovery) {
    /* signed in by the link, but the only thing to do is choose a password */
    $("#login").hidden = false;
    $("#loginForm").hidden = true;
    $("#newPwForm").hidden = false;
    $("#newPwForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      $("#newPwErr").textContent = "";
      try {
        await setPassword($("#np").value);
        toast("Password set. Signing you in\u2026");
        setTimeout(() => location.replace(location.pathname), 900);
      } catch (e) { $("#newPwErr").textContent = e.message; }
    });
    return;
  }

  if (!signedIn) {
    $("#login").hidden = false;
    $("#loginForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      $("#loginErr").textContent = "";
      try {
        await signIn($("#em").value.trim(), $("#pw").value);
        location.reload();
      } catch (e) { $("#loginErr").textContent = e.message; }
    });
    $("#forgot").addEventListener("click", () => {
      $("#loginForm").hidden = true;
      $("#resetForm").hidden = false;
      $("#rEm").value = $("#em").value;
      $("#rEm").focus();
    });
    $("#backToLogin").addEventListener("click", () => {
      $("#resetForm").hidden = true;
      $("#loginForm").hidden = false;
    });
    $("#resetForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      $("#resetErr").textContent = "";
      const btn = $("#resetForm button[type=submit]");
      btn.disabled = true;
      try {
        await sendReset($("#rEm").value.trim());
        $("#resetForm").innerHTML =
          '<p class="sub">If that address has an account, a reset link is on its way. ' +
          'It is good for one hour. Check spam if it is not there in a minute.</p>';
      } catch (e) {
        $("#resetErr").textContent = e.message;
        btn.disabled = false;
      }
    });
    return;
  }

  $("#app").hidden = false;
  $("#who").textContent = USER?.email || "";
  $("#out").addEventListener("click", signOut);
  $("#save").addEventListener("click", saveAll);
  $("#discard").addEventListener("click", () => location.reload());
  window.addEventListener("beforeunload", (e) => {
    if (pending()) { e.preventDefault(); e.returnValue = ""; }
  });

  const tabs = $("#tabs");
  for (const [key, v] of Object.entries(VIEWS)) {
    const b = el("button", { class: "tab", onclick: () => show(key) }, v.label);
    b.dataset.tab = key;
    tabs.append(b);
  }

  try {
    await loadAll();
  } catch (e) {
    $("#view").append(el("p", { class: "err" },
      "Could not read the tables: " + e.message +
      " — has supabase/schema.sql been run on this project?"));
    return;
  }
  show("site");
}

start();
