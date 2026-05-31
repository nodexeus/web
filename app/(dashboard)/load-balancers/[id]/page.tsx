'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadBalancerClient } from '@modules/grpc/clients/loadBalancerClient';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { friendlyError } from '@/lib/friendly-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadBalancerMembers } from '@/components/load-balancers/load-balancer-members';
import {
  LbPolicy,
  LbType,
} from '@modules/grpc/library/blockjoy/v1/load_balancer';
import type { Node } from '@modules/grpc/library/blockjoy/v1/node';
import {
  ArrowLeft,
  CircleAlert,
  RefreshCw,
  Trash2,
  Loader2,
  AlertTriangle,
  Network,
  Globe,
  Copy,
  Check,
  Calendar,
  Server,
  Tag,
  Link2,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────

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

function typeLabel(type: LbType): string {
  switch (type) {
    case LbType.LB_TYPE_BASIC:
      return 'Basic';
    case LbType.LB_TYPE_ADVANCED_RPC:
      return 'Advanced RPC';
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

// ─── Copy button ─────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

// ─── Detail row ──────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  copyable,
  href,
}: {
  icon?: React.ElementType;
  label: string;
  value: string | undefined | null;
  mono?: boolean;
  copyable?: boolean;
  href?: string;
}) {
  if (!value && value !== '0') return null;

  return (
    <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/30">
      {Icon && (
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 flex items-center gap-1">
          {href ? (
            <a
              href={href}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {value}
              <Link2 className="h-3 w-3" />
            </a>
          ) : (
            <p
              className={`text-sm break-all ${mono ? 'font-mono text-xs leading-relaxed' : ''}`}
            >
              {value}
            </p>
          )}
          {copyable && value && (
            <span className="opacity-0 transition-opacity group-hover:opacity-100">
              <CopyButton value={value} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-36" />
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-5 space-y-4"
          >
            <Skeleton className="h-4 w-20" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Delete confirmation ──────────────────────────────────────────

function DeleteConfirmation({
  lbName,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  lbName: string;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-in-up rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Delete Load Balancer</h3>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Are you sure you want to delete{' '}
          <span className="font-medium text-foreground">{lbName}</span>? The
          load balancer, its DNS record, and backing node will be permanently
          removed.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-2"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function LoadBalancerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    data: lb,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['loadBalancer', id],
    queryFn: () => loadBalancerClient.getLoadBalancer(id),
    enabled: Boolean(id),
  });

  // Fetch org nodes for member management (node picker + name resolution).
  // Only triggered once we have the orgId from the LB.
  const { data: nodesData, isLoading: isLoadingNodes } = useQuery({
    queryKey: ['nodes', lb?.orgId],
    queryFn: () =>
      nodeClient.listNodes(lb!.orgId, {}, { currentPage: 0, itemsPerPage: 200 }),
    enabled: Boolean(lb?.orgId),
  });

  const orgNodes: Node[] = nodesData?.nodes ?? [];

  const deleteMutation = useMutation({
    mutationFn: () => loadBalancerClient.deleteLoadBalancer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loadBalancers'] });
      router.push('/load-balancers');
    },
  });

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => router.push('/load-balancers')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Load Balancers
      </Button>

      {isLoading ? (
        <DetailSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <CircleAlert className="mb-3 h-10 w-10 text-destructive" />
          <h3 className="text-lg font-medium">Failed to load load balancer</h3>
          <p className="mt-1 text-sm text-muted-foreground">
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
      ) : lb ? (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-medium tracking-tight">
                  {lb.name}
                </h1>
                {lb.fqdn && (
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    {lb.fqdn}
                    <CopyButton value={lb.fqdn} />
                  </p>
                )}
              </div>
            </div>

            {/* Delete button with two-step inline confirm */}
            <div className="shrink-0">
              {showDeleteConfirm ? null : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Delete confirmation modal */}
          <DeleteConfirmation
            lbName={lb.name}
            isOpen={showDeleteConfirm}
            isDeleting={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDeleteConfirm(false)}
          />

          {deleteMutation.isError && (
            <p className="text-sm text-destructive">
              {friendlyError(deleteMutation.error)}
            </p>
          )}

          {/* Detail cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Overview */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Tag className="h-4 w-4" />
                Overview
              </h2>
              <div className="-mx-3">
                <DetailRow
                  icon={Globe}
                  label="FQDN"
                  value={lb.fqdn || undefined}
                  mono
                  copyable
                />
                <DetailRow
                  icon={Tag}
                  label="Policy"
                  value={policyLabel(lb.policy)}
                />
                <DetailRow
                  icon={Network}
                  label="Type"
                  value={typeLabel(lb.type)}
                />
                <DetailRow
                  icon={Calendar}
                  label="Created"
                  value={formatDate(lb.createdAt)}
                />
                {lb.updatedAt && (
                  <DetailRow
                    icon={Calendar}
                    label="Last Updated"
                    value={formatDate(lb.updatedAt)}
                  />
                )}
              </div>
            </div>

            {/* Backing node */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Server className="h-4 w-4" />
                Backing Node
              </h2>
              <div className="-mx-3">
                {lb.nodeId ? (
                  <DetailRow
                    icon={Server}
                    label="Node"
                    value="View node"
                    href={`/nodes/${lb.nodeId}`}
                  />
                ) : (
                  <p className="px-3 py-2.5 text-sm text-muted-foreground">
                    No backing node assigned.
                  </p>
                )}
                <DetailRow
                  label="Load Balancer ID"
                  value={lb.lbId}
                  mono
                  copyable
                />
                <DetailRow
                  label="Organization ID"
                  value={lb.orgId}
                  mono
                  copyable
                />
              </div>
            </div>
          </div>

          {/* Members section */}
          <LoadBalancerMembers
            lbId={lb.lbId}
            orgId={lb.orgId}
            members={lb.members ?? []}
            nodes={orgNodes}
            isLoadingNodes={isLoadingNodes}
          />
        </>
      ) : null}
    </div>
  );
}
