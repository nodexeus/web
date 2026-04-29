'use client';

import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/friendly-error';
import { HardDrive, CircleAlert, RefreshCw } from 'lucide-react';

import type { Host } from '@modules/grpc/library/blockjoy/v1/host';
import { HostSortField } from '@modules/grpc/library/blockjoy/v1/host';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';

type Props = {
  hosts: Host[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  sortField?: number;
  sortOrder?: number;
  onSort?: (field: number) => void;
};

function SortableHeader({
  label,
  field,
  currentField,
  currentOrder,
  onSort,
}: {
  label: string;
  field: number;
  currentField: number;
  currentOrder: number;
  onSort: (field: number) => void;
}) {
  const isActive = currentField === field;
  return (
    <th
      className="px-4 py-3 cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <svg
            className={`h-3 w-3 ${currentOrder === SortOrder.SORT_ORDER_ASCENDING ? '' : 'rotate-180'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        )}
      </span>
    </th>
  );
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
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-28" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-16" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function HostListView({
  hosts,
  total,
  isLoading,
  error,
  sortField,
  sortOrder,
  onSort,
}: Props) {
  const router = useRouter();
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
        <CircleAlert className="h-10 w-10 text-destructive mb-3" />
        <h3 className="text-lg font-medium">Failed to load hosts</h3>
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
            {onSort && sortField !== undefined && sortOrder !== undefined ? (
              <SortableHeader
                label="Host"
                field={HostSortField.HOST_SORT_FIELD_DISPLAY_NAME}
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={onSort}
              />
            ) : (
              <th className="px-4 py-3">Host</th>
            )}
            {onSort && sortField !== undefined && sortOrder !== undefined ? (
              <SortableHeader
                label="BV Version"
                field={HostSortField.HOST_SORT_FIELD_BV_VERSION}
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={onSort}
              />
            ) : (
              <th className="px-4 py-3">BV Version</th>
            )}
            <th className="px-4 py-3">IP Address</th>
            <th className="px-4 py-3">Region</th>
            {onSort && sortField !== undefined && sortOrder !== undefined ? (
              <SortableHeader
                label="Nodes"
                field={HostSortField.HOST_SORT_FIELD_NODE_COUNT}
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={onSort}
              />
            ) : (
              <th className="px-4 py-3">Nodes</th>
            )}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <SkeletonRows />
          ) : hosts.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center">
                <HardDrive className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">No hosts found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Register a host to get started
                </p>
              </td>
            </tr>
          ) : (
            hosts.map((host) => (
              <tr
                key={host.hostId}
                className="border-b border-border/50 transition-colors hover:bg-accent/50 cursor-pointer"
                onClick={() => router.push(`/hosts/${host.hostId}`)}
              >
                <td className="py-3 px-4">
                  <p className="text-sm font-medium">
                    {host.displayName || host.networkName || 'Unnamed'}
                  </p>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                  {host.bvVersion || '-'}
                </td>
                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                  {host.ipAddress || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {host.region?.displayName || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {host.nodeCount ?? '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!isLoading && hosts.length > 0 && (
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Showing {hosts.length} of {total} hosts
        </div>
      )}
    </div>
  );
}
