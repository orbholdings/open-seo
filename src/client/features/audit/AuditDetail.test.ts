import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AuditDetail } from "./AuditDetail";
import type { AuditResultsData } from "./results/types";

vi.mock("@/serverFunctions/audit", () => ({
  getAuditStatus: vi.fn(),
  getAuditSummary: vi.fn(),
  getAuditCapabilities: vi.fn(),
}));
vi.mock("@/serverFunctions/crawlerAccess", () => ({
  listCrawlerCredentials: vi.fn(),
}));

function renderAudit(
  fetchClass: keyof AuditResultsData["fetchClassCounts"],
  issueGroups: AuditResultsData["issueGroups"] = [],
) {
  const client = new QueryClient();
  const audit = {
    id: "audit",
    startUrl: "https://shop.example/",
    startedAt: "2026-11-21 23:07:00",
    completedAt: "2026-11-21 23:07:01",
    status: "completed",
    pagesCrawled: 1,
    pagesTotal: 1,
    config: { maxPages: 50, lighthouseStrategy: "none" },
  } satisfies AuditResultsData["audit"];
  client.setQueryData(["audit-status", "project", audit.id], audit);
  client.setQueryData(["audit-results", "project", audit.id], {
    audit,
    fetchClassCounts: {
      ok: 0,
      blocked: 0,
      error: 0,
      rate_limited: 0,
      [fetchClass]: 1,
    },
    issueGroups,
    issueCount: issueGroups.reduce((sum, group) => sum + group.count, 0),
    pageCount: 1,
    averageResponseMs: 128,
    canonicalHost: "shop.example",
    lighthouse: [],
  } satisfies AuditResultsData);
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(AuditDetail, {
        projectId: "project",
        auditId: audit.id,
        tab: "issues",
        onTabChange: () => {},
        onBack: () => {},
      }),
    ),
  );
}

describe("completed one-page audits", () => {
  it("shows a server error without suggesting that the site blocked the crawler", () => {
    const report = renderAudit("ok", [
      { issueType: "server-error", severity: "critical", count: 1 },
    ]);
    expect(report).toContain("Server error (5xx)");
    expect(report).not.toContain("LibreCrawl");
  });

  it("shows no block warning for a readable single-page site", () => {
    const report = renderAudit("ok");
    expect(report).toContain("No issues recorded.");
    expect(report).not.toContain("LibreCrawl");
  });

  it("still warns when a page was classified as blocked", () => {
    const report = renderAudit("blocked", [
      { issueType: "blocked-page", severity: "warning", count: 1 },
    ]);
    expect(report).toContain("The crawler was blocked on 1 page.");
  });

  it("explains when the free crawler could not read the page", () => {
    const report = renderAudit("error");
    expect(report).toContain("filter Crawl result by Failed");
    expect(report).not.toContain("LibreCrawl");
    expect(report).not.toContain("Every crawled page passed");
  });
});
