/* publish — lets the studio push the site live without leaving the panel.
 *
 * GitHub will not start a workflow for an anonymous browser, and a token that
 * could start one must never be in client JavaScript: anyone with the page
 * would have it. So the token lives here, as a secret on the function, and the
 * function only acts for a caller who is already signed in to the studio.
 *
 * Deploy from the Supabase dashboard (Edge Functions -> Deploy a new function)
 * and set two secrets:
 *   GH_TOKEN   a fine-grained token with Actions: read and write on the repo
 *   GH_REPO    Matchstickstudios/Landing-page
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  /* 1. who is asking? The studio sends the signed-in user's token; anything
        else is turned away before GitHub is touched at all. */
  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Not signed in" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const who = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon!, Authorization: `Bearer ${jwt}` },
  });
  if (!who.ok) return json({ error: "Not signed in" }, 401);
  const user = await who.json();
  if (!user?.id) return json({ error: "Not signed in" }, 401);

  /* 2. ask GitHub to run the deploy */
  const token = Deno.env.get("GH_TOKEN");
  const repo = Deno.env.get("GH_REPO");
  if (!token || !repo) return json({ error: "The function is missing GH_TOKEN or GH_REPO" }, 500);

  const r = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/deploy.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "matchstick-studio",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  if (r.status !== 204) {
    const detail = await r.text();
    return json({ error: `GitHub refused (${r.status})`, detail: detail.slice(0, 300) }, 502);
  }

  return json({ ok: true, by: user.email ?? user.id, at: new Date().toISOString() });
});
