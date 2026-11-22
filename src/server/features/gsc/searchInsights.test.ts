import { describe, expect, it } from "vitest";
import {
  estimateClickOpportunities,
  explainClickChange,
  findQueryOverlaps,
} from "./searchInsights";
import { buildStrikingDistanceRows } from "./searchPerformanceReport";

function row(
  query: string,
  page: string,
  impressions: number,
  clicks = 5,
  position = 7,
) {
  return {
    keys: [query, page],
    impressions,
    clicks,
    position,
    ctr: clicks / impressions,
  };
}

const totals = (clicks: number, impressions: number) => ({
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
});

describe("explaining the click change", () => {
  it("accounts for a CTR decline that offsets the gain in impressions", () => {
    expect(explainClickChange(totals(18, 1500), totals(20, 1000))).toEqual({
      change: -2,
      estimates: { fromImpressions: 8, fromCtr: -10 },
    });
  });
  it.each([
    [0, 8],
    [8, 0],
    [0, 0],
  ])(
    "keeps the observed click change when a period had no impressions",
    (now, before) => {
      expect(
        explainClickChange(totals(now, now * 10), totals(before, before * 10)),
      ).toEqual({ change: now - before, estimates: null });
    },
  );
  it("rounds the contribution once so the estimates still explain the full change", () => {
    expect(explainClickChange(totals(8, 108), totals(7, 100))).toEqual({
      change: 1,
      estimates: { fromImpressions: 1, fromCtr: 0 },
    });
  });
});

describe("queries shared by pages", () => {
  it("ranks distinct page pairs by the second page's impressions and keeps the recorded evidence", () => {
    const result = findQueryOverlaps([
      row("one", "/big", 1000),
      row("one", "/small", 200),
      row("two", "/a", 450, 20, 4),
      row("two", "/b", 410, 18, 6),
      row("two", "/c", 100),
      row("single", "/only", 600),
      row("single", "/only", 600),
      row("tiny", "/a", 30),
      row("tiny", "/b", 24),
      row("incidental", "/a", 500),
      row("incidental", "/b", 99),
    ]);
    expect(result.queries.map((pair) => pair.query)).toEqual(["two", "one"]);
    expect(result.queries[0]).toEqual({
      query: "two",
      pageCount: 3,
      primary: { page: "/a", impressions: 450, clicks: 20, position: 4 },
      secondary: { page: "/b", impressions: 410, clicks: 18, position: 6 },
    });
    expect(result.rowLimitReached).toBe(false);
  });
  it("reports the row cap even when none of the returned combinations form a pair", () => {
    const rows = Array.from({ length: 1000 }, (_, i) =>
      row(String(i), "/only", 100),
    );
    expect(findQueryOverlaps(rows)).toMatchObject({
      rowsReviewed: 1000,
      rowLimitReached: true,
      queries: [],
    });
  });
});

describe("additional click estimates", () => {
  function peers(count: number, impressions: number, clicks: number) {
    return Array.from({ length: count }, (_, i) =>
      row(`peer-${i}`, `/peer-${i}`, impressions, clicks, 5 + i),
    );
  }
  it("uses the site's impression-weighted CTR, ranks actionable gains, and counts each query once", () => {
    const rows = buildStrikingDistanceRows([
      ...peers(4, 50, 5),
      row("fifth", "/winner", 300, 20, 6),
      row("fifth", "/secondary", 900, 100, 8),
      row("wider", "/wider", 200, 5, 12),
      row("narrower", "/narrower", 100, 3, 15),
      row("already strong", "/strong", 500, 50, 11),
      row("too small", "/small", 24, 0, 12),
    ]);
    const result = estimateClickOpportunities(rows);
    expect(result.benchmark).toMatchObject({
      queries: 5,
      impressions: 500,
      clicks: 40,
      ctr: 0.08,
    });
    expect(
      result.queries.map(({ query, estimatedExtraClicks }) => [
        query,
        estimatedExtraClicks,
      ]),
    ).toEqual([
      ["wider", 11],
      ["narrower", 5],
    ]);
  });
  it.each([
    [4, 300],
    [5, 99],
  ])("withholds a benchmark for an undersized sample", (count, impressions) => {
    const result = estimateClickOpportunities(
      buildStrikingDistanceRows([
        ...peers(count, impressions, 5),
        row("lower", "/page", 1000, 1, 12),
      ]),
    );
    expect(result.benchmark.ctr).toBeNull();
    expect(result.queries).toEqual([]);
  });
});
