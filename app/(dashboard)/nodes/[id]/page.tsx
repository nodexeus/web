'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { friendlyError } from '@/lib/friendly-error';
import { setExpectedNodeState } from '@/lib/hooks/use-mqtt';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { toast } from 'sonner';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NodeState } from '@modules/grpc/library/blockjoy/common/v1/node';
import type { Node } from '@modules/grpc/library/blockjoy/v1/node';
import {
  ArrowLeft,
  CircleCheck,
  CircleAlert,
  Clock,
  Loader2,
  Power,
  Trash2,
  Server,
  Copy,
  Check,
  ExternalLink,
  Activity,
  Shield,
  ShieldAlert,
  Blocks,
  Globe,
  HardDrive,
  MapPin,
  Calendar,
  Tag,
  RefreshCw,
  Square,
  Play,
  RotateCw,
  Percent,
  Network,
  SlidersHorizontal,
  AlertTriangle,
  ChevronDown,
  MoreHorizontal,
  Cpu,
  MemoryStick,
  Database,
} from 'lucide-react';

// ─── Status helpers ──────────────────────────────────────────────

function getStatusConfig(state: NodeState | undefined) {
  switch (state) {
    case NodeState.NODE_STATE_RUNNING:
      return {
        icon: CircleCheck,
        label: 'Running',
        className: 'text-success',
        bg: 'bg-success/10 border-success/20',
        pulse: 'bg-success',
      };
    case NodeState.NODE_STATE_STARTING:
      return {
        icon: Loader2,
        label: 'Starting',
        className: 'text-warning',
        bg: 'bg-warning/10 border-warning/20',
        pulse: 'bg-warning',
      };
    case NodeState.NODE_STATE_UPGRADING:
      return {
        icon: Loader2,
        label: 'Upgrading',
        className: 'text-warning',
        bg: 'bg-warning/10 border-warning/20',
        pulse: 'bg-warning',
      };
    case NodeState.NODE_STATE_STOPPED:
      return {
        icon: Power,
        label: 'Stopped',
        className: 'text-muted-foreground',
        bg: 'bg-muted border-border',
        pulse: 'bg-muted-foreground',
      };
    case NodeState.NODE_STATE_FAILED:
      return {
        icon: CircleAlert,
        label: 'Failed',
        className: 'text-destructive',
        bg: 'bg-destructive/10 border-destructive/20',
        pulse: 'bg-destructive',
      };
    case NodeState.NODE_STATE_DELETING:
      return {
        icon: Trash2,
        label: 'Deleting',
        className: 'text-warning',
        bg: 'bg-warning/10 border-warning/20',
        pulse: 'bg-warning',
      };
    case NodeState.NODE_STATE_DELETED:
      return {
        icon: Trash2,
        label: 'Deleted',
        className: 'text-muted-foreground',
        bg: 'bg-muted border-border',
        pulse: 'bg-muted-foreground',
      };
    default:
      return {
        icon: Clock,
        label: 'Unknown',
        className: 'text-muted-foreground',
        bg: 'bg-muted border-border',
        pulse: 'bg-muted-foreground',
      };
  }
}

const isActiveState = (state: NodeState | undefined) =>
  state === NodeState.NODE_STATE_RUNNING ||
  state === NodeState.NODE_STATE_STARTING ||
  state === NodeState.NODE_STATE_UPGRADING;

// ─── Clipboard helper ────────────────────────────────────────────

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
      className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-success" />
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
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {value}
              <ExternalLink className="h-3 w-3" />
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

// ─── Stat card ───────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  accent?: 'success' | 'warning' | 'destructive' | 'default';
}) {
  const accentColors = {
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    default: 'text-foreground',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p
        className={`mt-2 text-xl font-medium tracking-tight ${accentColors[accent ?? 'default']}`}
      >
        {value}
      </p>
      {subValue && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subValue}</p>
      )}
    </div>
  );
}

// ─── Status pill ─────────────────────────────────────────────────

function StatusPill({ node }: { node: Node }) {
  const status = getStatusConfig(node.nodeStatus?.state);
  const StatusIcon = status.icon;
  const active = isActiveState(node.nodeStatus?.state);

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 ${status.bg}`}
    >
      {/* Animated icon */}
      <div className="relative flex h-8 w-8 items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full ${status.pulse} opacity-20`}
        />
        {active && (
          <div
            className={`absolute inset-0 animate-ping rounded-full ${status.pulse} opacity-10`}
          />
        )}
        <StatusIcon className={`relative h-4 w-4 ${status.className}`} />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${status.className}`}>
            {status.label}
          </span>
          {active && (
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${status.pulse} opacity-75`}
              />
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${status.pulse}`}
              />
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {node.protocolName} · {node.semanticVersion || 'Unknown version'}
        </p>
      </div>
    </div>
  );
}

// ─── Actions dropdown ────────────────────────────────────────────

function ActionsDropdown({
  node,
  onStart,
  onStop,
  onRestart,
  onDelete,
  isActing,
  isSuperUser,
  canStart,
  canStop,
  canRestart,
  canDelete,
}: {
  node: Node;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onDelete: () => void;
  isActing: boolean;
  isSuperUser: boolean;
  canStart: boolean;
  canStop: boolean;
  canRestart: boolean;
  canDelete: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isStopped = node.nodeStatus?.state === NodeState.NODE_STATE_STOPPED;
  const isRunning = node.nodeStatus?.state === NodeState.NODE_STATE_RUNNING;
  const isTransitioning =
    node.nodeStatus?.state === NodeState.NODE_STATE_STARTING ||
    node.nodeStatus?.state === NodeState.NODE_STATE_UPGRADING ||
    node.nodeStatus?.state === NodeState.NODE_STATE_DELETING;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as globalThis.Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  type ActionItem = {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    destructive?: boolean;
    separator?: boolean;
  };

  const items: ActionItem[] = [];

  if (isSuperUser) {
    items.push({
      label: 'Admin Details',
      icon: SlidersHorizontal,
      onClick: () => {
        window.location.href = `/admin/nodes/${node.nodeId}`;
      },
    });
  }

  if (isStopped && canStart) {
    items.push({
      label: 'Start',
      icon: Play,
      onClick: onStart,
    });
  }

  if (isRunning && canStop) {
    items.push({
      label: 'Stop',
      icon: Square,
      onClick: onStop,
    });
  }

  if (isRunning && canRestart) {
    items.push({
      label: 'Restart',
      icon: RotateCw,
      onClick: onRestart,
    });
  }

  if (canDelete && !isTransitioning) {
    items.push({
      label: 'Delete',
      icon: Trash2,
      onClick: onDelete,
      destructive: true,
      separator: items.length > 0,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isActing}
      >
        {isActing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MoreHorizontal className="h-3.5 w-3.5" />
        )}
        Actions
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-md border border-border bg-popover py-1 shadow-lg">
          {items.map((item, i) => (
            <div key={item.label}>
              {item.separator && <div className="my-1 h-px bg-border" />}
              <button
                onClick={() => handleAction(item.onClick)}
                disabled={isActing}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  item.destructive
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-popover-foreground hover:bg-accent'
                } disabled:opacity-50`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Jailed alert ────────────────────────────────────────────────

function JailedAlert({ node }: { node: Node }) {
  if (!node.jailed) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div>
        <p className="text-sm font-medium text-destructive">Node is Jailed</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {node.jailedReason || 'No reason provided.'}
        </p>
      </div>
    </div>
  );
}

// ─── SQD-specific info ───────────────────────────────────────────

function SqdInfo({ node }: { node: Node }) {
  if (node.protocolName?.toLowerCase() !== 'sqd') return null;

  const dashboardUrl = node.versionKey?.variantKey?.includes('tethys')
    ? `https://tethys.subsquid.io/worker/${node.p2pAddress}?backPath=/dashboard`
    : `https://network.subsquid.io/worker/${node.p2pAddress}?backPath=/dashboard`;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        <Network className="h-4 w-4" />
        SQD Details
      </h2>
      {node.p2pAddress && (
        <DetailRow
          icon={ExternalLink}
          label="SQD Dashboard"
          value="Open Dashboard"
          href={dashboardUrl}
        />
      )}
      <DetailRow
        icon={Tag}
        label="Variant"
        value={node.versionKey?.variantKey}
      />
      {node.apr !== undefined && (
        <DetailRow
          icon={Percent}
          label="Current APR"
          value={`${Number(node.apr).toFixed(2)}%`}
        />
      )}
      <DetailRow
        icon={node.jailed ? ShieldAlert : Shield}
        label="Jailed Status"
        value={node.jailed ? 'Yes' : 'No'}
      />
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button skeleton */}
      <Skeleton className="h-8 w-32" />

      {/* Hero banner skeleton */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-6 w-24" />
          </div>
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-5 space-y-4"
          >
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 5 }).map((_, j) => (
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

// ─── Main page component ─────────────────────────────────────────

// ─── Delete confirmation dialog ──────────────────────────────────

function DeleteConfirmation({
  nodeName,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  nodeName: string;
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
            <h3 className="text-lg font-medium">Delete Node</h3>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Are you sure you want to delete{' '}
          <span className="font-medium text-foreground">{nodeName}</span>? The
          node will be permanently removed from your infrastructure.
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
            {isDeleting ? 'Deleting…' : 'Delete Node'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page component ─────────────────────────────────────────

export default function NodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const nodeId = params.id as string;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    isSuperUser,
    canStartNode,
    canStopNode,
    canRestartNode,
    canDeleteNode,
  } = usePermissions();

  const {
    data: node,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['node', nodeId],
    queryFn: () => nodeClient.getNode(nodeId),
    enabled: Boolean(nodeId),
    staleTime: 0, // always refetch when invalidated
    refetchInterval: 5000, // poll every 5s for live status
  });

  const nodeName =
    node?.sqdName || node?.displayName || node?.nodeName || 'Node';
  const addNotification = useNotificationStore((s) => s.addNotification);

  const startMutation = useMutation({
    mutationFn: () => nodeClient.startNode(nodeId),
    onSuccess: () => {
      toast.success('Command sent', { description: `Starting ${nodeName}` });
      setExpectedNodeState(nodeId, NodeState.NODE_STATE_STARTING);
      addNotification({
        type: 'node-updated',
        title: 'Start Requested',
        message: `${nodeName} is starting`,
        nodeId,
      });
      queryClient.refetchQueries({ queryKey: ['node', nodeId] });
      queryClient.refetchQueries({ queryKey: ['nodes'] });
    },
    onError: (err: Error) => {
      toast.error('Command failed', { description: err.message });
      addNotification({
        type: 'node-updated',
        title: 'Start Failed',
        message: `${nodeName}: ${err.message}`,
        nodeId,
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => nodeClient.stopNode(nodeId),
    onSuccess: () => {
      toast.success('Command sent', { description: `Stopping ${nodeName}` });
      setExpectedNodeState(nodeId, NodeState.NODE_STATE_STOPPED);
      addNotification({
        type: 'node-updated',
        title: 'Stop Requested',
        message: `${nodeName} is stopping`,
        nodeId,
      });
      queryClient.refetchQueries({ queryKey: ['node', nodeId] });
      queryClient.refetchQueries({ queryKey: ['nodes'] });
    },
    onError: (err: Error) => {
      toast.error('Command failed', { description: err.message });
      addNotification({
        type: 'node-updated',
        title: 'Stop Failed',
        message: `${nodeName}: ${err.message}`,
        nodeId,
      });
    },
  });

  const restartMutation = useMutation({
    mutationFn: () => nodeClient.restartNode(nodeId),
    onSuccess: () => {
      toast.success('Command sent', { description: `Restarting ${nodeName}` });
      setExpectedNodeState(nodeId, NodeState.NODE_STATE_STARTING);
      addNotification({
        type: 'node-updated',
        title: 'Restart Requested',
        message: `${nodeName} is restarting`,
        nodeId,
      });
      queryClient.refetchQueries({ queryKey: ['node', nodeId] });
      queryClient.refetchQueries({ queryKey: ['nodes'] });
    },
    onError: (err: Error) => {
      toast.error('Command failed', { description: err.message });
      addNotification({
        type: 'node-updated',
        title: 'Restart Failed',
        message: `${nodeName}: ${err.message}`,
        nodeId,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => nodeClient.deleteNode(nodeId),
    onSuccess: () => {
      toast.success('Command sent', { description: `Deleting ${nodeName}` });
      setExpectedNodeState(nodeId, NodeState.NODE_STATE_DELETED);
      addNotification({
        type: 'node-deleted',
        title: 'Node Deleted',
        message: `${nodeName} was deleted`,
        nodeId,
      });
      queryClient.refetchQueries({ queryKey: ['nodes'] });
      router.push('/nodes');
    },
    onError: (err: Error) => {
      toast.error('Command failed', { description: err.message });
      addNotification({
        type: 'node-updated',
        title: 'Delete Failed',
        message: `${nodeName}: ${err.message}`,
        nodeId,
      });
      setShowDeleteConfirm(false);
    },
  });

  const isActing =
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending ||
    deleteMutation.isPending;

  const rpcUrl = node?.dnsName ? `https://${node.dnsName}` : undefined;

  const nodeType = node?.versionMetadata?.find(
    (m) => m.metadataKey === 'node-type',
  )?.value;

  const networkName = node?.versionMetadata?.find(
    (m) => m.metadataKey === 'network',
  )?.value;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => router.push('/nodes')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Nodes
      </Button>

      {isLoading ? (
        <DetailSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <CircleAlert className="mb-3 h-10 w-10 text-destructive" />
          <h3 className="text-lg font-medium">Failed to load node</h3>
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
      ) : node ? (
        <>
          {/* Node name header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-medium tracking-tight">
                {node.sqdName || node.displayName || node.nodeName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {node.orgName} · {node.nodeId?.slice(0, 8)}…
                <CopyButton value={node.nodeId} />
              </p>
            </div>
          </div>

          {/* Status + Actions row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <StatusPill node={node} />
            <ActionsDropdown
              node={node}
              onStart={() => startMutation.mutate()}
              onStop={() => stopMutation.mutate()}
              onRestart={() => restartMutation.mutate()}
              onDelete={() => setShowDeleteConfirm(true)}
              isActing={isActing}
              isSuperUser={isSuperUser}
              canStart={canStartNode}
              canStop={canStopNode}
              canRestart={canRestartNode}
              canDelete={canDeleteNode}
            />
          </div>

          {/* Delete confirmation dialog */}
          <DeleteConfirmation
            nodeName={node.sqdName || node.displayName || node.nodeName}
            isOpen={showDeleteConfirm}
            isDeleting={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDeleteConfirm(false)}
          />

          {/* Jailed alert — only shows if jailed */}
          <JailedAlert node={node} />

          {/* Key metrics row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Blocks}
              label="Block Height"
              value={
                node.blockHeight !== undefined && node.blockHeight > -1
                  ? node.blockHeight.toLocaleString()
                  : '—'
              }
              accent={
                node.blockHeight !== undefined && node.blockHeight > -1
                  ? 'default'
                  : 'warning'
              }
              subValue={
                node.blockHeight !== undefined && node.blockHeight > -1
                  ? 'Synced'
                  : 'Syncing…'
              }
            />
            <StatCard
              icon={Activity}
              label="Protocol Health"
              value={
                node.nodeStatus?.protocol?.health !== undefined
                  ? (['Unknown', 'Healthy', 'Unhealthy', 'Degraded'][
                      node.nodeStatus.protocol.health
                    ] ?? 'Unknown')
                  : '—'
              }
              accent={
                node.nodeStatus?.protocol?.health === 1
                  ? 'success'
                  : node.nodeStatus?.protocol?.health === 3
                    ? 'warning'
                    : node.nodeStatus?.protocol?.health === 2
                      ? 'destructive'
                      : 'default'
              }
            />
            {node.apr !== undefined ? (
              <StatCard
                icon={Percent}
                label="APR"
                value={`${Number(node.apr).toFixed(2)}%`}
                accent={Number(node.apr) > 0 ? 'success' : 'default'}
              />
            ) : (
              <StatCard
                icon={Globe}
                label="Network"
                value={
                  networkName
                    ? networkName.charAt(0).toUpperCase() + networkName.slice(1)
                    : node.versionKey?.variantKey || '—'
                }
              />
            )}
            <StatCard
              icon={Calendar}
              label="Created"
              value={
                node.createdAt
                  ? new Date(node.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'
              }
              subValue={
                node.createdAt
                  ? new Date(node.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : undefined
              }
            />
          </div>

          {/* VM Resources — show allocated CPU, Memory, Disk for this node */}
          {node.config?.vm && (
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={Cpu}
                label="CPU Cores"
                value={`${node.config.vm.cpuCores}`}
                subValue="allocated"
              />
              <StatCard
                icon={MemoryStick}
                label="Memory"
                value={
                  node.config.vm.memoryBytes > 0
                    ? `${(node.config.vm.memoryBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
                    : '—'
                }
                subValue="allocated"
              />
              <StatCard
                icon={Database}
                label="Disk"
                value={
                  node.config.vm.diskBytes > 0
                    ? node.config.vm.diskBytes >= 1024 ** 4
                      ? `${(node.config.vm.diskBytes / 1024 ** 4).toFixed(2)} TB`
                      : `${(node.config.vm.diskBytes / (1024 * 1024 * 1024)).toFixed(0)} GB`
                    : '—'
                }
                subValue="allocated"
              />
            </div>
          )}

          {/* SQD-specific section */}
          <SqdInfo node={node} />

          {/* Detail cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Identity & Protocol */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Tag className="h-4 w-4" />
                Identity & Protocol
              </h2>
              <div className="-mx-3">
                <DetailRow
                  icon={Server}
                  label="Display Name"
                  value={node.displayName}
                  copyable
                />
                <DetailRow
                  icon={Server}
                  label="Node Name"
                  value={node.nodeName}
                  copyable
                />
                {node.sqdName && (
                  <DetailRow
                    icon={Tag}
                    label="SQD Name"
                    value={node.sqdName}
                    copyable
                  />
                )}
                <DetailRow
                  icon={Globe}
                  label="DNS Name"
                  value={node.dnsName}
                  mono
                  copyable
                />
                {rpcUrl && (
                  <DetailRow
                    icon={ExternalLink}
                    label="RPC URL"
                    value={rpcUrl}
                    href={rpcUrl}
                    copyable
                  />
                )}
                <DetailRow label="Protocol" value={node.protocolName} />
                {nodeType && (
                  <DetailRow
                    label="Node Type"
                    value={nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
                  />
                )}
                <DetailRow
                  label="Version"
                  value={node.semanticVersion || 'Latest'}
                />
                <DetailRow
                  label="Auto Upgrade"
                  value={node.autoUpgrade ? 'Enabled' : 'Disabled'}
                />
              </div>
            </div>

            {/* Network & Host */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                Network & Host
              </h2>
              <div className="-mx-3">
                <DetailRow
                  icon={Globe}
                  label="IP Address"
                  value={node.ipAddress}
                  mono
                  copyable
                />
                <DetailRow
                  icon={Globe}
                  label="IP Gateway"
                  value={node.ipGateway}
                  mono
                  copyable
                />
                {node.p2pAddress && (
                  <DetailRow
                    icon={Network}
                    label="P2P Address / Peer ID"
                    value={node.p2pAddress}
                    mono
                    copyable
                  />
                )}
                <DetailRow
                  icon={HardDrive}
                  label="Host"
                  value={
                    node.hostDisplayName || node.hostNetworkName || undefined
                  }
                />
                <DetailRow
                  icon={HardDrive}
                  label="Host ID"
                  value={node.hostId}
                  mono
                  copyable
                />
                <DetailRow
                  icon={MapPin}
                  label="Region"
                  value={node.regionName}
                />
                <DetailRow label="Organization" value={node.orgName} />
                <DetailRow label="Node ID" value={node.nodeId} mono copyable />
              </div>
            </div>
          </div>

          {/* Jailed details (expanded, if jailed) */}
          {node.jailed && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-destructive">
                <ShieldAlert className="h-4 w-4" />
                Jail Information
              </h2>
              <div className="-mx-3">
                <DetailRow icon={ShieldAlert} label="Jailed" value="Yes" />
                <DetailRow
                  icon={CircleAlert}
                  label="Reason"
                  value={node.jailedReason || 'No reason provided'}
                />
              </div>
            </div>
          )}

          {/* Note section */}
          {node.note && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Note
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {node.note}
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
