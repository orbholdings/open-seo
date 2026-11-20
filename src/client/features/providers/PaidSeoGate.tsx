import type { ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryState } from "@/client/components/QueryState";
import { buttonVariants } from "@/client/components/ui/button";
import { dataforseoHelpLinkOptions } from "@/client/navigation/items";
import { getSeoApiKeyStatus } from "@/serverFunctions/config";

export function usePaidSeoStatus() {
  return useQuery({
    queryKey: ["seoApiKeyStatus"],
    queryFn: () => getSeoApiKeyStatus(),
    staleTime: 60_000,
  });
}

export function PaidSeoNotice({ title }: { title: string }) {
  const { projectId } = useParams({ from: "/_app/p/$projectId" });
  return (
    <EmptyState
      variant="card"
      title={title}
      description="New data for this tool requires an enabled DataForSEO or Treg connection. Explore the queries Google recorded for this website or crawl its pages for technical issues."
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            to="/p/$projectId/search-performance"
            params={{ projectId }}
            className={buttonVariants()}
          >
            Search Console insights
          </Link>
          <Link
            to="/p/$projectId/audit"
            params={{ projectId }}
            className={buttonVariants({ variant: "outline" })}
          >
            Site Audit
          </Link>
          <Link
            {...dataforseoHelpLinkOptions}
            className={buttonVariants({ variant: "ghost" })}
          >
            Provider setup
          </Link>
        </div>
      }
    />
  );
}

export function PaidSeoGate({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const status = usePaidSeoStatus();
  return (
    <QueryState
      query={status}
      errorFallback="Could not load the SEO provider settings"
    >
      {({ configured }) =>
        configured ? children : <PaidSeoNotice title={title} />
      }
    </QueryState>
  );
}
