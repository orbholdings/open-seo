import { CardShell } from "@/client/components/CardShell";
import { displayKey } from "@/client/features/search-performance/SearchPerformanceChanges";
import {
  formatClickChange,
  formatCount,
  formatCtr,
  formatPosition,
  type Report,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import type { DetailSelection } from "@/client/features/search-performance/searchPerformanceQueries";

const detailButton =
  "max-w-full cursor-pointer rounded-sm text-left text-primary underline-offset-4 [overflow-wrap:anywhere] hover:underline focus-visible:outline-2 focus-visible:outline-ring";

export function SearchInsightsCards({
  report,
  onSelect,
}: {
  report: Report;
  onSelect: (selection: DetailSelection) => void;
}) {
  const { clickChange, overlap } = report.insights;
  const { estimates } = clickChange;
  return (
    <div className={overlap ? "grid gap-4 lg:grid-cols-2" : undefined}>
      <CardShell title="Why clicks changed">
        <p className="text-sm">
          <strong>{formatClickChange(clickChange.change)} clicks</strong>{" "}
          compared with {report.range.prevStartDate} to{" "}
          {report.range.prevEndDate}.
        </p>
        {estimates ? (
          <>
            <dl className="my-3 grid grid-cols-[1fr_auto] gap-x-2 gap-y-3 text-sm">
              <dt>
                Times shown in Google
                <small className="block text-muted-foreground">
                  {formatCount(report.prevTotals.impressions)} →{" "}
                  {formatCount(report.totals.impressions)} impressions
                </small>
              </dt>
              <dd className="text-right tabular-nums">
                ≈ {formatClickChange(estimates.fromImpressions)} clicks
              </dd>
              <dt>
                Click-through rate
                <small className="block text-muted-foreground">
                  {formatCtr(report.prevTotals.ctr)} →{" "}
                  {formatCtr(report.totals.ctr)}
                </small>
              </dt>
              <dd className="text-right tabular-nums">
                ≈ {formatClickChange(estimates.fromCtr)} clicks
              </dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              These estimates split the observed click change between visibility
              and click-through rate. Open a page in Biggest changes to
              investigate.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            A breakdown needs impressions in both periods.
          </p>
        )}
      </CardShell>
      {overlap && (
        <CardShell title="Pages appearing for the same search">
          <p className="text-sm text-muted-foreground">
            Both pages had at least {overlap.minPageImpressions} impressions.
            The second had at least{" "}
            {Math.round(overlap.minRelativeImpressions * 100)}% as many as the
            first.
          </p>
          {overlap.queries.length > 0 ? (
            <>
              <ul className="divide-y">
                {overlap.queries.map(({ query, primary, secondary }) => (
                  <li key={query} className="py-3">
                    <button
                      type="button"
                      className={`${detailButton} text-sm font-semibold`}
                      onClick={() =>
                        onSelect({ dimension: "query", key: query })
                      }
                    >
                      {query}
                    </button>
                    <ul className="mt-1 space-y-1">
                      {[primary, secondary].map((page) => (
                        <li key={page.page} className="text-xs">
                          <button
                            type="button"
                            title={page.page}
                            className={detailButton}
                            onClick={() =>
                              onSelect({ dimension: "page", key: page.page })
                            }
                          >
                            {displayKey(page.page)}
                          </button>
                          <span className="block text-muted-foreground">
                            {formatCount(page.impressions)} impressions ·{" "}
                            {formatCount(page.clicks)} clicks · average position{" "}
                            {formatPosition(page.position)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Open each page to compare the searches it serves before deciding
                whether to change either one.
              </p>
            </>
          ) : (
            <p className="my-3 text-sm">
              No matching pairs in the rows reviewed.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Reviewed {formatCount(overlap.rowsReviewed)} query and page
            combinations returned by Google.
            {overlap.rowLimitReached
              ? " The report reached its row limit and more pairs may exist."
              : ""}
          </p>
        </CardShell>
      )}
    </div>
  );
}
