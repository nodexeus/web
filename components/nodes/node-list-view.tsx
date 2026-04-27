'use client';

import { useRouter } from 'next/navigation';
import { friendlyError } from '@/lib/friendly-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Server,
  CircleCheck,
  CircleAlert,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
  Power,
} from 'lucide-react';

// Import the Node type from the existing gRPC library
import type { Node } from '@modules/grpc/library/blockjoy/v1/node';
// Import the actual enum so we match real values
import { NodeState } from '@modules/grpc/library/blockjoy/common/v1/node';
import { NodeSortField } from '@modules/grpc/library/blockjoy/v1/node';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';

type Props = {
  nodes: Node[];
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

function getStatusConfig(state: NodeState | undefined) {
  switch (state) {
    case NodeState.NODE_STATE_RUNNING:
      return {
        icon: CircleCheck,
        label: 'Running',
        className: 'text-success bg-success/10',
      };
    case NodeState.NODE_STATE_STARTING:
      return {
        icon: Loader2,
        label: 'Starting',
        className: 'text-warning bg-warning/10',
      };
    case NodeState.NODE_STATE_UPGRADING:
      return {
        icon: Loader2,
        label: 'Upgrading',
        className: 'text-warning bg-warning/10',
      };
    case NodeState.NODE_STATE_STOPPED:
      return {
        icon: Power,
        label: 'Stopped',
        className: 'text-muted-foreground bg-muted',
      };
    case NodeState.NODE_STATE_FAILED:
      return {
        icon: CircleAlert,
        label: 'Failed',
        className: 'text-destructive bg-destructive/10',
      };
    case NodeState.NODE_STATE_DELETING:
      return {
        icon: Trash2,
        label: 'Deleting',
        className: 'text-warning bg-warning/10',
      };
    case NodeState.NODE_STATE_DELETED:
      return {
        icon: Trash2,
        label: 'Deleted',
        className: 'text-muted-foreground bg-muted',
      };
    case NodeState.NODE_STATE_UNSPECIFIED:
    default:
      return {
        icon: Clock,
        label: 'Unknown',
        className: 'text-muted-foreground bg-muted',
      };
  }
}

function StatusBadge({ state }: { state: NodeState | undefined }) {
  const { icon: Icon, label, className } = getStatusConfig(state);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function getNodeDisplayName(node: Node): string {
  // Prefer sqdName, then displayName, then nodeName
  return node.sqdName || node.displayName || node.nodeName || 'Unnamed';
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-1.5 h-3 w-20" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-5 w-20 rounded-full" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-28" />
          </td>
          <td className="py-3 px-4">
            <Skeleton className="h-4 w-16" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function NodeListView({
  nodes,
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
        <h3 className="text-lg font-medium">Failed to load nodes</h3>
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

  const hasSorting =
    onSort && sortField !== undefined && sortOrder !== undefined;

  return (
    <div className="rounded-lg border border-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {hasSorting ? (
              <SortableHeader
                label="Node"
                field={NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME}
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={onSort}
              />
            ) : (
              <th className="px-4 py-3">Node</th>
            )}
            {hasSorting ? (
              <SortableHeader
                label="Status"
                field={NodeSortField.NODE_SORT_FIELD_NODE_STATE}
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={onSort}
              />
            ) : (
              <th className="px-4 py-3">Status</th>
            )}
            <th className="px-4 py-3">Host</th>
            <th className="px-4 py-3">IP Address</th>
            <th className="px-4 py-3">Version</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <SkeletonRows />
          ) : nodes.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center">
                <Server className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">No nodes found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Launch a node to get started
                </p>
              </td>
            </tr>
          ) : (
            nodes.map((node) => (
              <tr
                key={node.nodeId}
                className="border-b border-border/50 transition-colors hover:bg-accent/50 cursor-pointer"
                onClick={() => router.push(`/nodes/${node.nodeId}`)}
              >
                <td className="py-3 px-4">
                  <p className="text-sm font-medium">
                    {getNodeDisplayName(node)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {node.protocolName || '-'}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge state={node.nodeStatus?.state} />
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {node.hostDisplayName || node.hostNetworkName || '-'}
                </td>
                <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                  {node.ipAddress || '-'}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {node.semanticVersion || '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!isLoading && nodes.length > 0 && (
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Showing {nodes.length} of {total} nodes
        </div>
      )}
    </div>
  );
}
