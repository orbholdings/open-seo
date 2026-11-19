import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = new URL("./check-seo-provider-config.mjs", import.meta.url);

function run(envText) {
  const dir = mkdtempSync(join(tmpdir(), "openseo-provider-check-"));
  const envPath = join(dir, ".env");
  try {
    writeFileSync(envPath, envText, { mode: 0o600 });
    return execFileSync(process.execPath, [script.pathname, envPath], { encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("reports no paid provider in a free-only configuration", () => {
  const output = run("DATAFORSEO_API_KEY=\nTREG_API_TOKEN=\nSTORAGE_SECRET_KEY=a-unique-secret\n");
  assert.match(output, /DataForSEO: not configured/);
  assert.match(output, /No paid SEO provider credentials found/);
});

test("detects optional provider and never echoes credential", () => {
  const output = run("TREG_API_TOKEN=super-secret-value\nGOOGLE_CLIENT_ID=client-id\nGOOGLE_CLIENT_SECRET=client-secret\nSTORAGE_SECRET_KEY=a-unique-secret\n");
  assert.match(output, /Treg: configured/);
  assert.match(output, /Google OAuth: configured/);
  assert.doesNotMatch(output, /super-secret-value|client-secret/);
});
