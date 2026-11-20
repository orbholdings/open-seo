# Free-first OpenSEO on Coolify

Create one project per website in the workspace. Each project has its own crawl history, Search Console property and Analytics property. The built-in HTML crawler works as soon as the administrator signs in. Connect Google when you want search and traffic data.

## Prepare the Git application

| Coolify setting         | Value                                     |
| ----------------------- | ----------------------------------------- |
| Git repository          | `https://github.com/orbholdings/open-seo` |
| Branch for PR #1        | `feature/free-first-seo`                  |
| Build pack              | Docker Compose                            |
| Base directory          | `/`                                       |
| Docker Compose location | `/compose.coolify.yaml`                   |
| Service for the domain  | `web`, internal port `80`                 |

The Compose file builds this checkout. Allow at least 4 GiB of memory for Docker and use a Linux kernel with 4 KiB pages. Only the web service receives a domain. Keep access private while creating the first administrator account. Coolify can also leave automatic deployments off until you choose to release a revision.

| Runtime variable     | Value                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`    | The external HTTPS origin, for example `https://seo.example.com`             |
| `STORAGE_SECRET_KEY` | A unique secret generated with `openssl rand -hex 32`. Keep it for restores. |
| `STORAGE_ACCESS_KEY` | Defaults to `openseo`. Keep the original value across updates.               |
| `SEO_PAID_PROVIDER`  | Defaults to `off` in this stack.                                             |

On startup the `init` service installs the application, applies migrations and exits. The web health check requests `/api/health`. Sign up at `/sign-up`, then sign in. Use **Projects** to add a website and **Site Audit** to crawl it. Plain HTML audits identify issues such as missing titles, broken links and indexability problems.

## Connect first-party data

Enable the Search Console API and the Google Analytics Data and Admin APIs for your Google OAuth client. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Coolify. Register both callbacks under the public origin.

```text
https://seo.example.com/api/gsc/oauth/callback
https://seo.example.com/api/ga4/oauth/callback
```

Apply the environment changes, then select the matching properties in each project's **Settings → Integrations**. Search Console reports the queries, impressions, clicks, CTR and average position observed for the selected property. GA4 uses the selected Analytics property's traffic and engagement data. [Search Console setup](./SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md) · [Analytics setup](./SELF_HOSTING_GOOGLE_ANALYTICS.md)

## Optional analysis and providers

For SAM, set `OPENROUTER_BASE_URL` to your model server's API endpoint, such as `http://ollama:11434/v1` on a shared private Docker network. Set `OPENROUTER_MODEL` to an installed model that supports tool calling. An endpoint that accepts unauthenticated requests needs only those two settings. Supply `OPENROUTER_API_KEY` if it requires a token. In a project's chat, ask SAM to draft titles for pages with impressions and low CTR, or to suggest fixes for the last audit. It uses the crawl and connected properties in free mode.

| `SEO_PAID_PROVIDER` | Commercial keyword, backlink, SERP and Lighthouse requests                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `off`               | Blocks requests, including scheduled checks, even with stored credentials.                                                              |
| `dataforseo`        | Uses only `DATAFORSEO_API_KEY` (base64-encoded API login and password).                                                                 |
| `treg`              | Uses only `TREG_API_TOKEN`.                                                                                                             |
| `auto`              | Uses a direct key first, then Treg if only the Treg token is present. Existing deployments that omit the setting retain this behaviour. |

An unrecognised selection or a missing selected key blocks new paid SEO requests. Enabling a provider can resume due tracking schedules. Provider selection applies to DataForSEO and Treg. AI inference and optional Context rendering use their own settings. A hosted model, a renderer or an enabled commercial SEO provider can charge its own fees.

Run `node scripts/check-seo-provider-config.mjs PATH_TO_ENV_FILE` with Node 22 or newer to see which integrations a file would enable. The diagnostic prints no credential values.

## Storage and recovery

Keep the named `storage` and `config` volumes together. They hold the S3 state, encryption keys and account data. Before an update, back up the installation using the instructions in the [Docker guide](./SELF_HOSTING_DOCKER.md#backup-and-restore). For a Coolify resource, set `COMPOSE_PROJECT_NAME` to its actual Docker Compose project name and `COMPOSE_FILE` to the matching Compose definition. Verify that `docker compose ps` lists the intended containers before starting a backup. A restore belongs in a fresh installation with the same storage credentials.
