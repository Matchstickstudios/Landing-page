# publish

Lets the **Publish changes** button in `/admin/` push the site live.

## Deploy it

Supabase dashboard → **Edge Functions** → **Deploy a new function** → name it
`publish` → paste `index.ts` → Deploy.

## Its two secrets

Edge Functions → **Secrets**:

| Name | Value |
|---|---|
| `GH_TOKEN` | a GitHub token that may run Actions on the repo |
| `GH_REPO` | `Matchstickstudios/Landing-page` |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided by Supabase already.

## Making the GitHub token

github.com → Settings → Developer settings → **Fine-grained tokens** →
Generate new token:

- **Repository access:** Only select repositories → `Landing-page`
- **Permissions:** Repository permissions → **Actions: Read and write**
- Nothing else. That is the whole scope: it can start this one workflow on
  this one repo and do nothing else with the account.
- Expiry: a year is reasonable; the button stops working when it lapses and
  you make a new one.

Paste it as `GH_TOKEN`. It never reaches the browser.
