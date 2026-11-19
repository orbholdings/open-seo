# Free-first deployment (Orbholdings fork)

This guide documents a **no-paid-SEO-key starting configuration**. It does not claim that every OpenSEO workflow works without DataForSEO or treg. Keyword volumes, competitor SERPs, backlinks and conventional rank tracking may require a paid provider.

## 1. Coolify / Docker Compose

Use `deploy/standalone/compose.yaml` and the variables from `deploy/standalone/.env.example`.

- Set `AUTH_MODE=password` for a public deployment.
- Generate a unique `STORAGE_SECRET_KEY` (at least 32 random bytes) and protect the secret.
- Set `BETTER_AUTH_URL` to the final HTTPS domain (for example `https://seo.example.com`).
- Leave `DATAFORSEO_API_KEY=` and `TREG_API_TOKEN=` empty initially.
- Leave `OPENROUTER_API_KEY=` empty if AI isn't needed yet.
- Keep the runtime, storage and crawl gateway behind the reverse proxy; expose only the web service over HTTPS.
- Before making the installation public, create the first admin account. Refer to `docs/SELF_HOSTING_DOCKER.md`.

**Important:** the default `compose.yaml` uses the upstream prebuilt image. To actually deploy fork-specific code changes, include `deploy/standalone/compose.build.yaml` as described in the upstream Docker guide (or publish your own image). Merely selecting this GitHub repository in Coolify does not make an upstream image include our edits.

## 2. Connect free sources

- Enable Google Search Console and Analytics through `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, using the OAuth redirect paths in `docs/SELF_HOSTING_DOCKER.md`.
- Verify website ownership in Google Search Console first. GSC provides queries, impressions, clicks, CTR and average position **for verified properties**, not a global keyword database.
- Run the site's built-in technical audits without optional third-party JavaScript rendering where possible. Verify audit behavior on this fork before relying on it.
- PageSpeed Insights or Bing integrations are **proposed enhancements**, not assumed to be built in.

## 3. Optional paid data

If needed later, configure **one** of `TREG_API_TOKEN` or `DATAFORSEO_API_KEY`. The current OpenSEO documentation describes Treg as a per-call reseller that avoids DataForSEO's minimum initial top-up, but it is not free beyond its trial. Restrict paid usage and inspect costs before running bulk tracking.

Run `node scripts/check-seo-provider-config.mjs deploy/standalone/.env` to review which provider credentials are present without revealing their values.

## 4. Before calling free-first ready

- [ ] Test admin signup and project creation with both paid SEO keys blank.
- [ ] Run and inspect a complete crawl with both paid SEO keys blank.
- [ ] Link a verified Search Console property and confirm live query data loads.
- [ ] Check all paid-only dashboards show an explicit unavailable state (not server errors or invented numbers).
- [ ] Confirm a paid API is never called when credentials are absent.
- [ ] Test backups and restores; ensure no secrets are committed.

See also `docs/DATAFORSEO_API_KEY.md` and `docs/SELF_HOSTING_DOCKER.md`.
