import { z } from "zod";
import { resolveDateRange } from "@/server/features/gsc/searchAnalytics";
import { getSearchOverview } from "@/server/features/gsc/services/SearchInsightsService";
import { buildProjectMeta } from "@/server/mcp/context";
import { mcpResponse } from "@/server/mcp/formatters";
import { optionalMetaOutputSchema } from "@/server/mcp/output-schemas";
import { withMcpProjectAuth } from "@/server/mcp/project-auth";
import { projectIdSchema } from "@/server/mcp/schemas";
import { formatMcpTable, percentCell, positionCell } from "@/server/mcp/table";
import { buildConnectGscUrl } from "@/server/mcp/urls";
import { SEARCH_PERFORMANCE_RANGES } from "@/types/schemas/search-performance";
import {
  missingSelfHostedGoogleClientResponse,
  performanceFailure,
} from "./search-console-tools";

const insightsInputSchema = {
  projectId: projectIdSchema,
  dateRange: z
    .enum(SEARCH_PERFORMANCE_RANGES)
    .optional()
    .describe("Defaults to the last 28 days."),
};

const rankingPageSchema = z.looseObject({
  page: z.string(),
  clicks: z.number(),
  impressions: z.number(),
  position: z.number(),
});
const totalsSchema = rankingPageSchema
  .omit({ page: true })
  .extend({ ctr: z.number() });

export const getSearchConsoleInsightsTool = {
  name: "get_search_console_insights",
  config: {
    title: "Explain search traffic changes and find overlapping pages",
    description:
      "Compare Google web search clicks with the preceding equal-length period. Estimate how impressions and click-through rate contributed to the change. Rank up to five searches shared by pages using the second page’s impressions, with measured results for both URLs. Estimate extra clicks for near-ranking searches if they match this site’s observed CTR at positions 5–10. Review the pages’ search intent before suggesting edits. Reads only the project’s connected Search Console property. Uses no credits.",
    inputSchema: insightsInputSchema,
    outputSchema: z.looseObject({
      ...optionalMetaOutputSchema,
      ok: z.boolean(),
      reason: z.string().optional(),
      siteUrl: z.string().optional(),
      range: z
        .looseObject({
          startDate: z.string(),
          endDate: z.string(),
          prevStartDate: z.string(),
          prevEndDate: z.string(),
        })
        .optional(),
      totals: totalsSchema.optional(),
      prevTotals: totalsSchema.optional(),
      clickChange: z
        .looseObject({
          change: z.number(),
          estimates: z
            .looseObject({ fromImpressions: z.number(), fromCtr: z.number() })
            .nullable(),
        })
        .optional(),
      opportunities: z
        .looseObject({
          benchmark: z.looseObject({
            queries: z.number(),
            impressions: z.number(),
            clicks: z.number(),
            ctr: z.number().nullable(),
            minQueries: z.number(),
            minImpressions: z.number(),
          }),
          queries: z.array(
            rankingPageSchema.extend({
              query: z.string(),
              estimatedExtraClicks: z.number(),
            }),
          ),
        })
        .nullish(),
      overlap: z
        .looseObject({
          queries: z.array(
            z.looseObject({
              query: z.string(),
              primary: rankingPageSchema,
              secondary: rankingPageSchema,
              pageCount: z.number(),
            }),
          ),
          rowsReviewed: z.number(),
          rowLimitReached: z.boolean(),
          minPageImpressions: z.number(),
          minRelativeImpressions: z.number(),
        })
        .nullish(),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(
    async (args: z.infer<z.ZodObject<typeof insightsInputSchema>>, context) => {
      const blocked = await missingSelfHostedGoogleClientResponse(
        context,
        args.projectId,
      );
      if (blocked) return blocked;
      const meta = buildProjectMeta(
        context,
        args.projectId,
        `/p/${args.projectId}/search-performance`,
      );
      try {
        const { siteUrl, range, totals, prevTotals, insights } =
          await getSearchOverview({
            projectId: args.projectId,
            ...resolveDateRange({ dateRange: args.dateRange }),
            type: "web",
          });
        const { clickChange, overlap } = insights;
        const lines = [
          `${siteUrl} · ${range.prevStartDate} to ${range.prevEndDate} versus ${range.startDate} to ${range.endDate}.`,
          `Clicks changed from ${prevTotals.clicks} to ${totals.clicks} (${clickChange.change}).`,
          clickChange.estimates
            ? `Estimated click change from impressions: ${clickChange.estimates.fromImpressions}. From click-through rate: ${clickChange.estimates.fromCtr}.`
            : "A breakdown needs impressions in both periods.",
        ];
        if (overlap) {
          lines.push(
            `Reviewed ${overlap.rowsReviewed} query/page combinations.${overlap.rowLimitReached ? " The row limit was reached and more pairs may exist." : ""}`,
          );
          if (overlap.queries.length) {
            lines.push(
              "Compare these pages’ search intent before suggesting edits.",
              formatMcpTable(
                overlap.queries.flatMap(({ query, primary, secondary }) =>
                  [primary, secondary].map((page) => ({ query, ...page })),
                ),
                [
                  { header: "query", value: (r) => r.query },
                  { header: "page", value: (r) => r.page },
                  { header: "impressions", value: (r) => r.impressions },
                  { header: "clicks", value: (r) => r.clicks },
                  {
                    header: "position",
                    value: (r) => r.position,
                    format: positionCell,
                  },
                ],
              ),
            );
          } else {
            lines.push("No matching pairs in the rows reviewed.");
          }
        }
        const opportunities = insights.opportunities;
        if (opportunities) {
          const { benchmark, queries } = opportunities;
          if (benchmark.ctr === null) {
            lines.push(
              `Click potential needs at least ${benchmark.minQueries} queries and ${benchmark.minImpressions} impressions at positions 5–10.`,
            );
          } else {
            lines.push(
              `At positions 5–10 this site's observed CTR was ${percentCell(benchmark.ctr)} across ${benchmark.queries} queries and ${benchmark.impressions} impressions. Estimates assume unchanged impressions and that same CTR.`,
            );
            for (const row of queries)
              lines.push(
                `${row.query} · ${row.page} · approximately ${row.estimatedExtraClicks} additional clicks.`,
              );
            if (!queries.length)
              lines.push("No positive click opportunities met the thresholds.");
          }
        }
        return mcpResponse({
          text: lines.join("\n"),
          meta,
          structuredContent: {
            ok: true,
            siteUrl,
            range,
            totals,
            prevTotals,
            ...insights,
          },
        });
      } catch (error) {
        return performanceFailure(
          error,
          meta,
          buildConnectGscUrl(
            context.baseUrl,
            args.projectId,
            Boolean(context.auth.guestClaimToken),
          ),
        );
      }
    },
  ),
};
