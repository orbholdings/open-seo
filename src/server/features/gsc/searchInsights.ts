import { sort } from "remeda";
import type { GscSearchAnalyticsRow } from "@/server/lib/gscClient";
import { GSC_MAX_ROW_LIMIT } from "@/server/features/gsc/searchAnalytics";
import type { buildStrikingDistanceRows } from "@/server/features/gsc/searchPerformanceReport";

type Totals = { clicks: number; impressions: number; ctr: number };

/** Split the interaction equally between the two factors in clicks = impressions × CTR. */
export function explainClickChange(current: Totals, previous: Totals) {
  const change = current.clicks - previous.clicks;
  if (!current.impressions || !previous.impressions) {
    return { change, estimates: null };
  }
  const effect =
    (current.impressions - previous.impressions) *
    ((current.ctr + previous.ctr) / 2);
  const fromImpressions = Math.sign(effect) * Math.round(Math.abs(effect)) || 0;
  return {
    change,
    estimates: { fromImpressions, fromCtr: change - fromImpressions },
  };
}

type RankingPage = {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
};

type QueryOverlap = {
  query: string;
  primary: RankingPage;
  secondary: RankingPage;
  pageCount: number;
};

const MIN_PAGE_IMPRESSIONS = 25;
const MIN_RELATIVE_IMPRESSIONS = 0.2;
const MAX_QUERIES = 5;

/** Each query/page pair is one Search Analytics row in this grouping. */
export function findQueryOverlaps(rows: GscSearchAnalyticsRow[]) {
  const pagesByQuery = new Map<string, Map<string, RankingPage>>();
  for (const row of rows) {
    const [query, page] = row.keys ?? [];
    if (!query || !page || !row.impressions) continue;
    const pages = pagesByQuery.get(query) ?? new Map<string, RankingPage>();
    pages.set(page, {
      page,
      impressions: row.impressions,
      clicks: row.clicks,
      position: row.position,
    });
    pagesByQuery.set(query, pages);
  }

  const matches: QueryOverlap[] = [];
  for (const [query, pages] of pagesByQuery) {
    if (pages.size < 2) continue;
    const [primary, secondary] = sort(
      Array.from(pages.values()),
      (a, b) =>
        b.impressions - a.impressions ||
        b.clicks - a.clicks ||
        a.page.localeCompare(b.page),
    );
    if (
      secondary.impressions >= MIN_PAGE_IMPRESSIONS &&
      secondary.impressions >= primary.impressions * MIN_RELATIVE_IMPRESSIONS
    ) {
      matches.push({ query, primary, secondary, pageCount: pages.size });
    }
  }
  return {
    queries: sort(
      matches,
      (a, b) =>
        b.secondary.impressions - a.secondary.impressions ||
        a.query.localeCompare(b.query),
    ).slice(0, MAX_QUERIES),
    rowsReviewed: rows.length,
    rowLimitReached: rows.length >= GSC_MAX_ROW_LIMIT,
    minPageImpressions: MIN_PAGE_IMPRESSIONS,
    minRelativeImpressions: MIN_RELATIVE_IMPRESSIONS,
  };
}

/** Model a position improvement at constant impressions, using this site's own
 * observed queries at positions 5–10 as the comparison group. */
export function estimateClickOpportunities(
  rows: ReturnType<typeof buildStrikingDistanceRows>,
) {
  const peers = rows.filter((row) => row.position <= 10);
  const impressions = peers.reduce((sum, row) => sum + row.impressions, 0);
  const minQueries = 5;
  const minImpressions = 500;
  const clicks = peers.reduce((sum, row) => sum + row.clicks, 0);
  const ctr =
    peers.length >= minQueries && impressions >= minImpressions
      ? clicks / impressions
      : null;
  const benchmark = {
    queries: peers.length,
    impressions,
    clicks,
    ctr,
    minQueries,
    minImpressions,
  };
  if (ctr === null) return { benchmark, queries: [] };

  const candidates = rows
    .filter(
      (row) => row.position > 10 && row.impressions >= MIN_PAGE_IMPRESSIONS,
    )
    .map((row) => ({
      ...row,
      estimatedExtraClicks: Math.round(row.impressions * ctr - row.clicks),
    }))
    .filter((row) => row.estimatedExtraClicks > 0);
  const queries = sort(
    candidates,
    (a, b) =>
      b.estimatedExtraClicks - a.estimatedExtraClicks ||
      a.query.localeCompare(b.query),
  ).slice(0, MAX_QUERIES);
  return { benchmark, queries };
}
