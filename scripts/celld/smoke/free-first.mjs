// Run only against a freshly initialized, disposable password-mode stack.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const origin = new URL(process.argv[2] ?? "http://127.0.0.1:3107").origin;
assert.ok(
  ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname),
);
const request = (path, options = {}) =>
  fetch(origin + path, { signal: AbortSignal.timeout(30_000), ...options });
const health = await (await request("/api/health")).json();
assert.equal(health.authMode, "password");
assert.equal(health.status, "ok");
assert.equal(health.checks.database.status, "ok");
assert.equal(health.checks.dataforseo.status, "ok");
assert.match(health.checks.dataforseo.detail, /Free mode/);

const post = (path, body, headers = {}) =>
  request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, ...headers },
    body: JSON.stringify(body),
  });
const account = {
  name: "Smoke Test",
  email: "admin@smoke.example",
  password: randomBytes(24).toString("hex"),
};
const signup = await post("/api/auth/sign-up/email", account);
assert.ok(signup.ok, `First administrator signup returned ${signup.status}`);
const signedIn = await post("/api/auth/sign-in/email", {
  email: account.email,
  password: account.password,
});
assert.ok(signedIn.ok, `Administrator sign-in returned ${signedIn.status}`);
const cookie = signedIn.headers
  .getSetCookie()
  .map((entry) => entry.split(";")[0])
  .join("; ");
assert.ok(cookie);
const key = await post(
  "/api/auth/api-key/create",
  { name: "Smoke test" },
  { cookie },
);
assert.ok(key.ok, `API key creation returned ${key.status}`);
const { key: token } = await key.json();
assert.ok(token);

async function call(name, args) {
  const response = await post(
    "/mcp",
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    },
    {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/event-stream",
    },
  );
  assert.ok(response.ok, `${name} returned HTTP ${response.status}`);
  const { result, error } = await response.json();
  assert.ok(!error && result, `${name} returned a protocol error`);
  return result;
}
async function data(name, args) {
  const result = await call(name, args);
  assert.ok(!result.isError, `${name}: ${result.content?.[0]?.text}`);
  return result.structuredContent;
}
const first = (
  await data("create_project", {
    name: "Catalogue",
    domain: "catalog.example.com",
  })
).project;
const second = (
  await data("create_project", { name: "News", domain: "news.example.org" })
).project;
assert.notEqual(first.id, second.id);
const listed = (await data("list_projects", {})).projects.map(
  (project) => project.id,
);
assert.ok(listed.includes(first.id) && listed.includes(second.id));
console.log("Administrator signup and two website projects passed");

const gsc = await data("get_search_console_performance", {
  projectId: first.id,
});
assert.equal(gsc.connected, false);
const ga4 = await data("get_google_analytics_organic_overview", {
  projectId: first.id,
});
assert.equal(ga4.error?.code, "ga4_not_connected");
const audit = {
  projectId: first.id,
  url: "https://catalog.example.com/",
  maxPages: 10,
};
const refused = await call("run_site_audit", { ...audit, runLighthouse: true });
assert.match(refused.content[0].text, /enabled DataForSEO or Treg/);
assert.ok(!refused.structuredContent?.auditId);
const { auditId } = await data("run_site_audit", audit);
assert.ok(auditId);
let status;
const deadline = Date.now() + 150_000;
do {
  await delay(1000);
  ({ status } = await data("get_audit_status", {
    projectId: first.id,
    auditId,
  }));
} while (status.status === "running" && Date.now() < deadline);
assert.equal(status.status, "completed", JSON.stringify(status));
assert.equal(status.pagesCrawled, 2);
assert.equal(status.lighthouseTotal, 0);
const { issues } = await data("get_audit_issues", {
  projectId: first.id,
  auditId,
});
assert.ok(
  issues.some((issue) => /title/.test(issue.issueType)),
  "Expected the missing page title finding",
);
const other = await call("get_audit_status", { projectId: second.id, auditId });
assert.match(other.content[0].text, /Audit not found in this project/i);
assert.ok(!other.structuredContent?.status, "An audit belongs to its project");
console.log(
  "Disconnected Google reports, paid-check refusal and two-page technical audit passed",
);
