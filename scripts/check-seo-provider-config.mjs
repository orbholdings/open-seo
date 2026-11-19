#!/usr/bin/env node
/**
 * Read-only diagnostic for self-hosted OpenSEO provider configuration.
 * No network requests, no credentials printed, no dependency installation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.argv[2] ?? "deploy/standalone/.env");
let source;
try {
  source = readFileSync(path, "utf8");
} catch (error) {
  console.error(`Unable to read environment file: ${path} (${error.code ?? "unknown error"})`);
  process.exitCode = 1;
}

if (source !== undefined) {
  const vars = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    vars.set(match[1], value);
  }

  const set = key => Boolean(vars.get(key));
  const paid = set("DATAFORSEO_API_KEY") || set("TREG_API_TOKEN");
  const google = set("GOOGLE_CLIENT_ID") && set("GOOGLE_CLIENT_SECRET");
  const report = [
    ["DataForSEO", set("DATAFORSEO_API_KEY")],
    ["Treg", set("TREG_API_TOKEN")],
    ["Google OAuth", google],
    ["AI provider", set("OPENROUTER_API_KEY")],
    ["Optional JS rendering", set("CONTEXT_API_KEY")],
  ];
  for (const [name, present] of report) console.log(`${name}: ${present ? "configured" : "not configured"}`);
  console.log(paid
    ? "Paid SEO provider credentials found. API calls may incur charges."
    : "No paid SEO provider credentials found. Paid SEO workflows may be unavailable.");
  if (set("GOOGLE_CLIENT_ID") !== set("GOOGLE_CLIENT_SECRET")) {
    console.warn("Google OAuth is only partially configured; set both client ID and client secret.");
  }
  if (vars.get("AUTH_MODE") === "local_noauth") {
    console.warn("WARNING: local_noauth must not be exposed directly to the public internet.");
  }
  if (!set("STORAGE_SECRET_KEY") || vars.get("STORAGE_SECRET_KEY") === "replace-with-a-long-random-secret") {
    console.warn("WARNING: set a strong, unique STORAGE_SECRET_KEY before deployment.");
  }
  console.log("This checks configuration presence only; it does not validate tokens or test runtime features.");
}
