'use client';

import { useRouter } from 'next/navigation';
import { friendlyError } from '@/lib/friendly-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Network, CircleAlert, RefreshCw } from 'lucide-react';
import type { LoadBalancer } from '@modules/grpc/library/blockjoy/v1/load_balancer';
import { LbPolicy } from '@modules/grpc/library/blockjoy/v1/load_balancer';

type Props = {
  loadBalancers: LoadBalancer[];
  isLoading: boolean;
  error: unknown;
};

function policyLabel(policy: LbPolicy): string {
  switch (policy) {
    case LbPolicy.LB_POLICY_ROUND_ROBIN:
      return 'Round Robin';
    case LbPolicy.LB_POLICY_LEAST_CONN:
      return 'Least Connections';
    default:
      return 'Unknown';
  }
}

function formatDate(date: Date | undefined): string {
  if (!date) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-36" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-48" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-5 w-24 rounded-full" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-8" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-24" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function LoadBalancerListView({ loadBalancers, isLoading, error }: Props) {
  const router = useRouter();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
        <CircleAlert className="h-10 w-10 text-destructive mb-3" />
        <h3 className="text-lg font-medium">Failed to load load balancers</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">
          {friendlyError(error)}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">FQDN</th>
            <th className="px-4 py-3">Policy</th>
            <th className="px-4 py-3">Members</th>
            <th className="px-4 py-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <SkeletonRows />
          ) : loadBalancers.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center">
                <Network className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">No load balancers</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create one to get started
                </p>
              </td>
            </tr>
          ) : (
            loadBalancers.map((lb) => (
              <tr
                key={lb.lbId}
                className="border-b border-border/50 transition-colors hover:bg-accent/50 cursor-pointer"
                onClick={() => router.push(`/load-balancers/${lb.lbId}`)}
              >
                <td className="py-3 px-4 text-sm font-medium">{lb.name}</td>
                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                  {lb.fqdn || '—'}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {policyLabel(lb.policy)}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {lb.members?.length ?? 0}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {formatDate(lb.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!isLoading && loadBalancers.length > 0 && (
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {loadBalancers.length} load balancer{loadBalancers.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
