import { GscService } from "@/server/features/gsc/services/GscService";
import {
  GSC_MAX_ROW_LIMIT,
  type GscPerformanceFilter,
} from "@/server/features/gsc/searchAnalytics";
import {
  STRIKING_DISTANCE_ROW_LIMIT,
  buildDailyTrend,
  buildStrikingDistanceRows,
  previousPeriod,
  sumSearchTotals,
} from "@/server/features/gsc/searchPerformanceReport";
import {
  estimateClickOpportunities,
  explainClickChange,
  findQueryOverlaps,
} from "@/server/features/gsc/searchInsights";
import type { SearchPerformanceType } from "@/types/schemas/search-performance";

// Each daily series covers at most the dashboard's three-month window.
export const DAILY_ROW_LIMIT = 200;

export async function getSearchOverview(input: {
  projectId: string;
  type: SearchPerformanceType;
  filters?: GscPerformanceFilter[];
  startDate: string;
  endDate: string;
}) {
  const { startDate, endDate } = input;
  const prev = previousPeriod(startDate, endDate);
  const [current, previous, queryPages] = await Promise.all([
    GscService.getPerformance({
      ...input,
      dimensions: ["date"],
      rowLimit: DAILY_ROW_LIMIT,
    }),
    GscService.getPerformance({
      ...input,
      ...prev,
      dimensions: ["date"],
      rowLimit: DAILY_ROW_LIMIT,
    }),
    input.type === "web"
      ? GscService.getPerformance({
          ...input,
          dimensions: ["query", "page"],
          rowLimit: GSC_MAX_ROW_LIMIT,
        })
      : { rows: [] },
  ]);

  const totals = sumSearchTotals(current.rows);
  const prevTotals = sumSearchTotals(previous.rows);
  const nearRanking = buildStrikingDistanceRows(
    queryPages.rows,
    GSC_MAX_ROW_LIMIT,
  );
  return {
    siteUrl: current.siteUrl,
    range: {
      startDate,
      endDate,
      prevStartDate: prev.startDate,
      prevEndDate: prev.endDate,
    },
    totals,
    prevTotals,
    trend: buildDailyTrend(current.rows, startDate, endDate),
    prevTrend: buildDailyTrend(previous.rows, prev.startDate, prev.endDate),
    strikingDistance: nearRanking.slice(0, STRIKING_DISTANCE_ROW_LIMIT),
    insights: {
      clickChange: explainClickChange(totals, prevTotals),
      opportunities:
        input.type === "web" ? estimateClickOpportunities(nearRanking) : null,
      overlap: input.type === "web" ? findQueryOverlaps(queryPages.rows) : null,
    },
  };
}
