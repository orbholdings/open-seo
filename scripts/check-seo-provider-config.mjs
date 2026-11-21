#!/usr/bin/env node
/**
 * Read-only diagnostic for self-hosted OpenSEO provider configuration.
 * No network requests, no credentials printed, no dependency installation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseEnv } from "node:util";
import { selectPaidSeoProvider } from "../src/shared/paid-seo.mjs";

const path = resolve(process.argv[2] ?? "deploy/standalone/.env");
let source;
try {
  source = readFileSync(path, "utf8");
} catch (error) {
  console.error(
    `Unable to read environment file: ${path} (${error.code ?? "unknown error"})`,
  );
  process.exitCode = 1;
}

if (source !== undefined) {
  const vars = parseEnv(source);
  const set = (key) => Boolean(vars[key]?.trim());
  const provider = selectPaidSeoProvider(
    vars.SEO_PAID_PROVIDER || undefined,
    vars.DATAFORSEO_API_KEY,
    vars.TREG_API_TOKEN,
  );
  const google = set("GOOGLE_CLIENT_ID") && set("GOOGLE_CLIENT_SECRET");
  const report = [
    ["DataForSEO", set("DATAFORSEO_API_KEY")],
    ["Treg", set("TREG_API_TOKEN")],
    ["Google OAuth", google],
    [
      "AI provider",
      set("OPENROUTER_API_KEY") ||
        (set("OPENROUTER_BASE_URL") && set("OPENROUTER_MODEL")),
    ],
    ["Optional JS rendering", set("CONTEXT_API_KEY")],
  ];
  for (const [name, present] of report)
    console.log(`${name}: ${present ? "configured" : "not configured"}`);
  console.log(
    provider
      ? `Active paid SEO provider: ${provider}. Requests can incur charges.`
      : "Paid SEO calls disabled. The crawler and connected Google reports are available.",
  );
  if (set("GOOGLE_CLIENT_ID") !== set("GOOGLE_CLIENT_SECRET")) {
    console.warn(
      "Google OAuth is only partially configured; set both client ID and client secret.",
    );
  }
  if (vars.AUTH_MODE === "local_noauth") {
    console.warn(
      "WARNING: local_noauth must not be exposed directly to the public internet.",
    );
  }
  if (
    !set("STORAGE_SECRET_KEY") ||
    vars.STORAGE_SECRET_KEY === "replace-with-a-long-random-secret"
  ) {
    console.warn(
      "WARNING: set a strong, unique STORAGE_SECRET_KEY before deployment.",
    );
  }
  console.log(
    "This checks configuration presence only; it does not validate tokens or test runtime features.",
  );
}
