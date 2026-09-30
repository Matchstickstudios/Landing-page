import { defineConfig } from "tinacms";

/* The admin panel for matchstick-site.
 *
 * Every collection below points at a file in /content that index.html fetches
 * at load. Editing a field here commits to the repo; the deploy that follows
 * is what the visitor sees. There is no database and no build step for the
 * content itself — the JSON is the source of truth.
 */

const branch =
  process.env.GITHUB_BRANCH || process.env.HEAD || "main";

export default defineConfig({
  branch,
  clientId: process.env.TINA_CLIENT_ID || "",   // from tina.io, for the live admin
  token: process.env.TINA_TOKEN || "",          // read-only token, same place
  build: {
    outputFolder: "admin",                       // the admin lands at /admin/
    publicFolder: ".",                           // repo root is the web root
  },
  media: {
    tina: { mediaRoot: "media", publicFolder: "." },
  },
  schema: {
    collections: [
      /* ---------------- the page itself ---------------- */
      {
        name: "site",
        label: "Site — nav, ticker, stats",
        path: "content",
        format: "json",
        match: { include: "site" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: "object", name: "nav", label: "Navigation", list: true,
            ui: { itemProps: (i: any) => ({ label: i?.label }) },
            fields: [
              { type: "string", name: "label", label: "Link text", required: true },
              {
                type: "string", name: "id", label: "Jumps to section", required: true,
                options: ["desk", "work", "crew", "why", "brief"],
              },
            ],
          },
          {
            type: "object", name: "social", label: "Social links", list: true,
            ui: { itemProps: (i: any) => ({ label: i?.name }) },
            fields: [
              {
                type: "string", name: "name", label: "Network", required: true,
                options: ["Instagram", "Facebook", "X", "LinkedIn"],
              },
              { type: "string", name: "url", label: "Profile URL", required: true },
            ],
          },
          {
            type: "string", name: "ticker", label: "Scrolling strip", list: true,
            description: "The words that run across the band under the hero.",
          },
          {
            type: "string", name: "story", label: "Studio story",
            ui: { component: "textarea" },
          },
          {
            type: "object", name: "stats", label: "Counters", list: true,
            ui: { itemProps: (i: any) => ({ label: `${i?.value} ${i?.label}` }) },
            fields: [
              { type: "string", name: "value", label: "Number", required: true },
              { type: "string", name: "label", label: "Caption", required: true },
            ],
          },
        ],
      },

      /* ---------------- the team ---------------- */
      {
        name: "team",
        label: "Team",
        path: "content",
        format: "json",
        match: { include: "team" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: "object", name: "members", label: "People", list: true,
            ui: { itemProps: (i: any) => ({ label: `${i?.name} — ${i?.role}` }) },
            fields: [
              { type: "string", name: "name", label: "Name", required: true },
              { type: "string", name: "role", label: "Role", required: true },
              {
                type: "string", name: "initials", label: "Initials",
                description: "Two letters for the disc on the card, e.g. RO.",
              },
              { type: "string", name: "bio", label: "Bio", ui: { component: "textarea" } },
              { type: "string", name: "does", label: "What they do", list: true },
              {
                type: "object", name: "pos", label: "Scatter position (desktop)",
                description: "Where the card sits in the field above 1080px. Percentages.",
                fields: [
                  { type: "number", name: "x", label: "x %" },
                  { type: "number", name: "y", label: "y %" },
                  { type: "number", name: "r", label: "rotation °" },
                ],
              },
            ],
          },
        ],
      },

      /* ---------------- the six services ---------------- */
      {
        name: "services",
        label: "Services",
        path: "content",
        format: "json",
        match: { include: "services" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: "object", name: "services", label: "Service", list: true,
            ui: { itemProps: (i: any) => ({ label: i?.title }) },
            fields: [
              { type: "string", name: "title", label: "Service", required: true },
              { type: "string", name: "kicker", label: "Kicker", description: "The small word above the title." },
              { type: "string", name: "summary", label: "One-line summary", ui: { component: "textarea" } },
              { type: "string", name: "get", label: "What you get", list: true },
              { type: "string", name: "first30", label: "The first thirty days", ui: { component: "textarea" } },
            ],
          },
        ],
      },

      /* ---------------- work ---------------- */
      {
        name: "projects",
        label: "Projects",
        path: "content",
        format: "json",
        match: { include: "projects" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: "object", name: "projects", label: "Project", list: true,
            ui: { itemProps: (i: any) => ({ label: i?.title }) },
            fields: [
              { type: "string", name: "title", label: "Title", required: true },
              { type: "string", name: "tag", label: "Tag", description: "The chip on the artwork, e.g. Launch." },
              { type: "string", name: "summary", label: "Summary", ui: { component: "textarea" } },
              { type: "string", name: "chips", label: "Deliverables", list: true },
            ],
          },
        ],
      },

      /* ---------------- why us ---------------- */
      {
        name: "why",
        label: "Why us",
        path: "content",
        format: "json",
        match: { include: "why" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: "object", name: "reasons", label: "Reason", list: true,
            ui: { itemProps: (i: any) => ({ label: i?.title }) },
            fields: [
              { type: "string", name: "title", label: "Reason", required: true },
              { type: "string", name: "body", label: "Body", ui: { component: "textarea" } },
              { type: "number", name: "x", label: "x %" },
              { type: "number", name: "y", label: "y %" },
              { type: "number", name: "r", label: "rotation °" },
            ],
          },
        ],
      },

      /* ---------------- the enquiry form ---------------- */
      {
        name: "brief",
        label: "Brief form",
        path: "content",
        format: "json",
        match: { include: "brief" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: "string", name: "services", label: "Q1 — Services (pick any)", list: true },
          { type: "string", name: "who", label: "Q2 — You are", list: true },
          {
            type: "object", name: "when", label: "Q3 — Start", list: true,
            ui: { itemProps: (i: any) => ({ label: `${i?.emoji} ${i?.value}` }) },
            fields: [
              { type: "string", name: "value", label: "Answer", required: true },
              {
                type: "string", name: "emoji", label: "Face",
                description: "Shown on the button only. It never reaches the enquiry.",
              },
            ],
          },
        ],
      },

      /* ---------------- colours and contact ---------------- */
      {
        name: "theme",
        label: "Theme & contact",
        path: "content",
        format: "json",
        match: { include: "theme" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            type: "object", name: "colors", label: "Palette",
            fields: [
              { type: "string", name: "soot", label: "Background", ui: { component: "color" } },
              { type: "string", name: "soot2", label: "Background, lifted", ui: { component: "color" } },
              { type: "string", name: "panel", label: "Panel", ui: { component: "color" } },
              { type: "string", name: "ash", label: "Text", ui: { component: "color" } },
              { type: "string", name: "ash2", label: "Text, quiet", ui: { component: "color" } },
              { type: "string", name: "ash3", label: "Text, quietest", ui: { component: "color" } },
              { type: "string", name: "ember", label: "Ember (primary)", ui: { component: "color" } },
              { type: "string", name: "flame", label: "Flame", ui: { component: "color" } },
              { type: "string", name: "gold", label: "Gold", ui: { component: "color" } },
              { type: "string", name: "deep", label: "Deep red", ui: { component: "color" } },
              { type: "string", name: "cool", label: "Cool accent", ui: { component: "color" } },
            ],
          },
          {
            type: "object", name: "contact", label: "Contact",
            fields: [
              { type: "string", name: "phone", label: "Phone (tel: link)" },
              { type: "string", name: "whatsapp", label: "WhatsApp number", description: "Country code, no +." },
              { type: "string", name: "email", label: "Email" },
            ],
          },
        ],
      },

      /* ---------------- blog ---------------- */
      {
        name: "post",
        label: "Blog",
        path: "content/blog",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Title", required: true, isTitle: true },
          { type: "datetime", name: "date", label: "Published", required: true },
          { type: "string", name: "excerpt", label: "Excerpt", ui: { component: "textarea" },
            description: "Shown in the list and used as the meta description." },
          { type: "image", name: "cover", label: "Cover image" },
          { type: "string", name: "tags", label: "Tags", list: true },
          { type: "boolean", name: "draft", label: "Draft", description: "Drafts are not published." },
          { type: "rich-text", name: "body", label: "Post", isBody: true },
        ],
        ui: {
          router: ({ document }) => `/blog/${document._sys.filename}/`,
          filename: {
            slugify: (v: any) =>
              (v?.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          },
        },
      },
    ],
  },
});
