import { dataforseoPost } from "./dataforseo/core";
import { UnsecuredJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

const { workerEnv } = vi.hoisted(() => ({
  workerEnv: {} as Record<string, unknown>,
}));
vi.mock("cloudflare:workers", () => ({ env: workerEnv }));

import { serveEveryAppRequest } from "./gateway-attribution";
import {
  getContextFetch,
  getDataforseoFetch,
  hasProviderAccess,
} from "./provider-access";

afterEach(() => {
  for (const key of Object.keys(workerEnv)) delete workerEnv[key];
  vi.unstubAllGlobals();
});

const fetchMock = vi.fn<typeof fetch>();

function lastAuthorization() {
  const init = fetchMock.mock.calls.at(-1)?.[1];
  return new Headers(init?.headers).get("authorization");
}

describe("provider access with the deployment's own keys", () => {
  it.each([
    ["no credentials", {}],
    [
      "off with both keys saved",
      {
        SEO_PAID_PROVIDER: "off",
        DATAFORSEO_API_KEY: "direct",
        TREG_API_TOKEN: "treg",
      },
    ],
    [
      "explicit provider missing its key",
      { SEO_PAID_PROVIDER: "treg", DATAFORSEO_API_KEY: "direct" },
    ],
    [
      "unrecognised selection",
      { SEO_PAID_PROVIDER: "typo", TREG_API_TOKEN: "treg" },
    ],
    ["blank credentials", { DATAFORSEO_API_KEY: "   ", TREG_API_TOKEN: " " }],
  ])("blocks the transport before fetch with %s", async (_label, settings) => {
    Object.assign(workerEnv, { AUTH_MODE: "password" }, settings);
    vi.stubGlobal("fetch", fetchMock);
    expect(await hasProviderAccess("dataforseo")).toBe(false);
    await expect(
      dataforseoPost("/v3/backlinks/summary/live", []),
    ).rejects.toMatchObject({ code: "PAID_SEO_UNAVAILABLE" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the selected reseller even when a direct key exists", async () => {
    Object.assign(workerEnv, {
      SEO_PAID_PROVIDER: "treg",
      DATAFORSEO_API_KEY: "direct",
      TREG_API_TOKEN: "treg",
    });
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValue(
        Response.json({ status_code: 20000, tasks: [] }),
      ),
    );
    await dataforseoPost("/v3/backlinks/summary/live", []);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://treg.to/call/dataforseo/backlinks/summary/live",
    );
    expect(lastAuthorization()).toBeNull();
  });

  it("puts the deployment's keys on DataForSEO and Context.dev calls", async () => {
    Object.assign(workerEnv, {
      AUTH_MODE: "cloudflare_access",
      DATAFORSEO_API_KEY: "encoded-credentials",
      CONTEXT_API_KEY: "context-key",
    });
    fetchMock.mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);

    await (
      await getDataforseoFetch()
    )("https://api.dataforseo.com/v3/x");
    expect(lastAuthorization()).toBe("Basic encoded-credentials");

    const contextFetch = await getContextFetch();
    await contextFetch?.("https://api.context.dev/v1/web/scrape/html");
    expect(lastAuthorization()).toBe("Bearer context-key");

    expect(await hasProviderAccess("dataforseo")).toBe(true);
    expect(await hasProviderAccess("context")).toBe(true);
  });

  it("has no Context.dev fetch without its key", async () => {
    workerEnv.AUTH_MODE = "local_noauth";
    expect(await getContextFetch()).toBeNull();
    expect(await hasProviderAccess("context")).toBe(false);
  });
});

describe("provider access behind an Every App gateway", () => {
  it("never uses a key on the deployment, and refuses without the gateway binding", async () => {
    Object.assign(workerEnv, {
      AUTH_MODE: "everyapp",
      EVERYAPP_APP_ID: "openseo",
      // Set by mistake: the gateway mode must not read it.
      DATAFORSEO_API_KEY: "encoded-credentials",
    });

    await expect(getDataforseoFetch()).rejects.toMatchObject({
      code: "DATAFORSEO_AUTH_FAILED",
    });
  });
});

describe("whose calls they are, behind the gateway", () => {
  const sent: Request[] = [];
  const binding = {
    fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      sent.push(new Request(input, init));
      return Response.json({ requested: true, configured: true, ready: true });
    }),
  };

  function gateway() {
    sent.length = 0;
    Object.assign(workerEnv, {
      AUTH_MODE: "everyapp",
      EVERYAPP_APP_ID: "openseo",
      EVERY_APP_GATEWAY: binding,
    });
  }

  it.each(["off", "treg", "unknown"])(
    "blocks gateway SEO before any call for %s",
    async (mode) => {
      gateway();
      workerEnv.SEO_PAID_PROVIDER = mode;
      expect(await hasProviderAccess("dataforseo")).toBe(false);
      await expect(getDataforseoFetch()).rejects.toMatchObject({
        code: "PAID_SEO_UNAVAILABLE",
      });
      expect(sent).toHaveLength(0);
    },
  );

  it("forwards the identity of the request it serves", async () => {
    gateway();
    const token = new UnsecuredJWT({ org_id: "org_a" })
      .setExpirationTime("2m")
      .encode();
    const request = new Request("https://openseo.app.everyapp.com/", {
      headers: { "x-everyapp-identity": token },
    });
    const user = {
      id: "user_ana",
      email: "ana@example.com",
      orgId: "org_a",
      orgRole: "member" as const,
      channel: "web" as const,
      actor: { sub: "user_ana" },
      scopes: ["*"],
      jti: "jti_1",
    };

    const dataforseo = await serveEveryAppRequest(request, user, () =>
      getDataforseoFetch(),
    );
    await dataforseo("https://api.dataforseo.com/v3/serp/google/locations/us");

    const [call] = sent;
    expect(call.headers.get("x-everyapp-identity")).toBe(token);
  });

  it("makes work no request started the install's background work", async () => {
    gateway();
    const contextFetch = await getContextFetch();
    await contextFetch?.("https://api.context.dev/v1/web/scrape/html");

    const [call] = sent;
    expect(call.headers.get("x-everyapp-identity")).toBeNull();
    expect(call.headers.get("x-everyapp-org")).toBeNull();
  });
});
