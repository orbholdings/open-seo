# DataForSEO API Key Setup

Technical audits and connected Google reports work without commercial SEO credentials. Keep `SEO_PAID_PROVIDER=off` to block paid SEO requests, including scheduled checks.

OpenSEO uses [DataForSEO](https://dataforseo.com/?aff=255379) to fetch SEO data. It's a pay-as-you-go third-party service unaffiliated with OpenSEO. You need an API key to connect OpenSEO to it.

New DataForSEO accounts include $1 of free credit to test with, and the minimum top-up is $50.

## Get your API key

1. Go to [DataForSEO API Access](https://app.dataforseo.com/api-access?aff=255379) (create an account if you don't have one).
2. Copy the API credential labelled "Base64" from the API Access page. This is the base64 encoded value of your DataForSEO email and API password in the format `email:password`.

## Where to set it

To enable direct commercial lookups, choose `SEO_PAID_PROVIDER=dataforseo` and set `DATAFORSEO_API_KEY` in the environment for your installation.

- **Docker self-hosting:** in `deploy/standalone/.env` (see [`SELF_HOSTING_DOCKER.md`](./SELF_HOSTING_DOCKER.md)), or `.env` for the [older single-container image](./SELF_HOSTING_DOCKER_LEGACY.md).
- **Cloudflare self-hosting:** in `.env.selfhost` (see [`SELF_HOSTING_CLOUDFLARE.md`](./SELF_HOSTING_CLOUDFLARE.md)). Legacy button/Wrangler deployments: as a Worker secret in the dashboard under `Settings` -> `Variables & Secrets`.
- **Local development:** in `.env.local` (see [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md)).

## No DataForSEO account? Use treg

[treg](https://treg.to) is a third-party reseller, unaffiliated with OpenSEO. It sells DataForSEO calls one at a time from a prepaid balance, at DataForSEO's own rates, so you can skip the DataForSEO signup and its $50 minimum top-up. New treg accounts include $1 of free credit.

1. Create a team at [treg.to](https://treg.to) and copy its API token.
2. Choose `SEO_PAID_PROVIDER=treg` and set `TREG_API_TOKEN` in `deploy/standalone/.env` for Docker self-hosting, `.env.selfhost` for Cloudflare self-hosting, or `.env.local` for local development. EveryApp deployments do not support treg yet.

With `SEO_PAID_PROVIDER=auto`, a direct DataForSEO key takes priority if both credentials are present. The [Coolify guide](./FREE_FIRST_SETUP.md) lists the available modes.

treg suits trying OpenSEO and light use. Before you rely on it, know that:

- treg relays only the DataForSEO endpoints in its catalog. As of November 2026 that covers every endpoint OpenSEO calls, but a feature added to OpenSEO later may need `DATAFORSEO_API_KEY` until treg lists its endpoint.
- Your calls run on treg's DataForSEO account, which its other customers share, and treg publishes no request limits. Large rank trackers (thousands of keywords) are sized for a DataForSEO account of your own and are untested through treg.
- Rank tracking cannot check a custom location name when you save a tracker, because that check uses DataForSEO's free sandbox. A name Google does not recognise shows up as failed checks instead.
- When the balance runs out, SEO data requests fail until you top up. The server log says so in a `treg.refused` line.
