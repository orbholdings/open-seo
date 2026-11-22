import {
  formatCount,
  formatCtr,
  type Report,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import type { DetailSelection } from "@/client/features/search-performance/searchPerformanceQueries";

export function SearchClickOpportunities({
  opportunities,
  onSelect,
}: {
  opportunities: NonNullable<Report["insights"]["opportunities"]>;
  onSelect: (selection: DetailSelection) => void;
}) {
  const { benchmark, queries } = opportunities;
  if (benchmark.ctr === null) {
    return (
      <p className="mb-3 text-xs text-muted-foreground">
        Click estimates need at least {benchmark.minQueries} searches and{" "}
        {formatCount(benchmark.minImpressions)} impressions at positions 5–10 in
        the selected period. This sample has {formatCount(benchmark.queries)}{" "}
        searches and {formatCount(benchmark.impressions)} impressions.
      </p>
    );
  }
  return (
    <section
      className="mb-4 rounded-lg border p-3"
      aria-label="Click opportunities"
    >
      <h3 className="text-sm font-semibold">
        Where more clicks are within reach
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Your pages at positions 5–10 earned a {formatCtr(benchmark.ctr)}{" "}
        click-through rate across {formatCount(benchmark.queries)} searches and{" "}
        {formatCount(benchmark.impressions)} impressions in Google’s returned
        rows. These estimates show how many extra clicks a lower-ranking page
        could earn at that rate, with the same number of impressions.
      </p>
      {queries.length ? (
        <ul className="mt-2 divide-y">
          {queries.map((row) => (
            <li
              key={row.query}
              className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
            >
              <button
                type="button"
                title={row.page}
                onClick={() => onSelect({ dimension: "query", key: row.query })}
                className="min-w-0 cursor-pointer rounded-sm text-left text-primary underline-offset-4 [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                {row.query}
              </button>
              <span className="shrink-0 tabular-nums">
                ≈ +{formatCount(row.estimatedExtraClicks)} clicks
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm">
          No lower-ranking searches with at least 25 impressions showed a gain
          at this rate.
        </p>
      )}
    </section>
  );
}
