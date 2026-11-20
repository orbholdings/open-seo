import type { ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/client/components/EmptyState";
import { QueryState } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
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
          <Button
            nativeButton={false}
            render={
              <Link
                to="/p/$projectId/search-performance"
                params={{ projectId }}
              />
            }
          >
            Search Console insights
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/p/$projectId/audit" params={{ projectId }} />}
          >
            Site Audit
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link {...dataforseoHelpLinkOptions} />}
          >
            Provider setup
          </Button>
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
