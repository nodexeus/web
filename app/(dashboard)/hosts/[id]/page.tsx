'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { friendlyError } from '@/lib/friendly-error';
import { toast } from 'sonner';
import { hostClient } from '@modules/grpc/clients/hostClient';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import type { Host } from '@modules/grpc/library/blockjoy/v1/host';
import type { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { NodeState } from '@modules/grpc/library/blockjoy/common/v1/node';
import { ScheduleType } from '@modules/grpc/library/blockjoy/common/v1/host';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Clock,
  Copy,
  Check,
  HardDrive,
  Cpu,
  Loader2,
  MemoryStick,
  Database,
  Power,
  Server,
  Globe,
  MapPin,
  Calendar,
  Tag,
  Trash2,
  RefreshCw,
  Network,
  Monitor,
  Settings,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

// ─── Formatting helpers ──────────────────────────────────────────

function formatMemory(bytes: number | undefined): string {
  if (bytes === undefined || bytes === 0) return '—';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function formatDisk(bytes: number | undefined): string {
  if (bytes === undefined || bytes === 0) return '—';
  const tb = bytes / 1024 ** 4;
  if (tb >= 1) return tb.toFixed(2) + ' TB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(0) + ' GB';
}

function formatScheduleType(type: ScheduleType): string {
  switch (type) {
    case ScheduleType.SCHEDULE_TYPE_AUTOMATIC:
      return 'Automatic';
    case ScheduleType.SCHEDULE_TYPE_MANUAL:
      return 'Manual';
    case ScheduleType.SCHEDULE_TYPE_UNSPECIFIED:
      return 'Unspecified';
    default:
      return 'Unknown';
  }
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
}: {
  icon?: React.ElementType;
  label: string;
  value: string | undefined | null;
  mono?: boolean;
  copyable?: boolean;
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
          <p
            className={`text-sm break-all ${mono ? 'font-mono text-xs leading-relaxed' : ''}`}
          >
            {value}
          </p>
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

// ─── Capacity ring ───────────────────────────────────────────────

function CapacityRing({
  used,
  total,
  label,
  color,
  size = 100,
}: {
  used: number;
  total: number;
  label: string;
  color: string;
  size?: number;
}) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-border"
          />
          {/* Progress */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-medium">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground">
          {used} / {total}
        </p>
      </div>
    </div>
  );
}

// ─── Resource utilization bar ────────────────────────────────────

function ResourceBar({
  icon: Icon,
  label,
  value,
  subValue,
  percentage,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  percentage?: number;
  color: string;
}) {
  const pct = percentage ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        {percentage !== undefined && (
          <span className="text-xs font-medium" style={{ color }}>
            {pct}% used
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-medium tracking-tight">{value}</p>
      {subValue && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subValue}</p>
      )}
      {percentage !== undefined && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
}

// ─── IP address grid ─────────────────────────────────────────────

function IpAddressGrid({
  ipAddresses,
}: {
  ipAddresses: { ip: string; assigned: boolean }[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalIps = ipAddresses.length;
  const assignedIps = ipAddresses.filter((ip) => ip.assigned).length;
  const availableIps = totalIps - assignedIps;

  // Show first 24 or all
  const displayIps = isExpanded ? ipAddresses : ipAddresses.slice(0, 24);
  const hasMore = ipAddresses.length > 24;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <Network className="h-4 w-4" />
          IP Addresses
        </h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
            Assigned ({assignedIps})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success/60" />
            Available ({availableIps})
          </span>
        </div>
      </div>

      {/* Visual grid — each IP is a small cell */}
      <div className="mb-4 flex flex-wrap gap-1">
        {ipAddresses.map((addr, i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded-sm transition-colors ${
              addr.assigned
                ? 'bg-primary hover:bg-primary/80'
                : 'bg-success/40 hover:bg-success/60'
            }`}
            title={`${addr.ip} — ${addr.assigned ? 'Assigned' : 'Available'}`}
          />
        ))}
      </div>

      {/* Detailed list */}
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {displayIps.map((addr, i) => (
          <div
            key={i}
            className={`group flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
              addr.assigned
                ? 'bg-primary/5 hover:bg-primary/10'
                : 'hover:bg-accent/30'
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                addr.assigned ? 'bg-primary' : 'bg-success'
              }`}
            />
            <span className="font-mono text-[11px]">{addr.ip}</span>
            {addr.assigned && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                in use
              </span>
            )}
            <span className="opacity-0 transition-opacity group-hover:opacity-100">
              <CopyButton value={addr.ip} />
            </span>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-md py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show all {totalIps} IPs <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />

      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Capacity rings skeleton */}
      <div className="flex justify-around rounded-lg border border-border bg-card p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-[100px] w-[100px] rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-6 w-24" />
            <Skeleton className="mt-3 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="space-y-4 rounded-lg border border-border bg-card p-5"
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

// ─── Node status helpers ─────────────────────────────────────────

function getNodeStatusConfig(state: NodeState | undefined) {
  switch (state) {
    case NodeState.NODE_STATE_RUNNING:
      return {
        icon: CircleCheck,
        label: 'Running',
        className: 'text-success bg-success/10',
      };
    case NodeState.NODE_STATE_STARTING:
    case NodeState.NODE_STATE_UPGRADING:
      return {
        icon: Loader2,
        label:
          state === NodeState.NODE_STATE_STARTING ? 'Starting' : 'Upgrading',
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
    case NodeState.NODE_STATE_DELETED:
      return {
        icon: Trash2,
        label: state === NodeState.NODE_STATE_DELETING ? 'Deleting' : 'Deleted',
        className: 'text-muted-foreground bg-muted',
      };
    default:
      return {
        icon: Clock,
        label: 'Unknown',
        className: 'text-muted-foreground bg-muted',
      };
  }
}

// ─── Nodes on host card ──────────────────────────────────────────

function HostNodesCard({
  nodes,
  isLoading,
}: {
  nodes: Node[];
  isLoading: boolean;
}) {
  const router = useRouter();

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <Server className="h-4 w-4" />
          Nodes on this Host
        </h2>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md px-3 py-2.5"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : nodes.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Server className="mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No nodes deployed</p>
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            Nodes launched on this host will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {nodes.map((node) => {
            const status = getNodeStatusConfig(node.nodeStatus?.state);
            const StatusIcon = status.icon;
            return (
              <button
                key={node.nodeId}
                onClick={() => router.push(`/nodes/${node.nodeId}`)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
              >
                <StatusIcon
                  className={`h-4 w-4 shrink-0 ${status.className.split(' ')[0]}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {node.sqdName ||
                      node.displayName ||
                      node.nodeName ||
                      'Unnamed'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground capitalize">
                    {node.protocolName}
                    {node.semanticVersion ? ` · ${node.semanticVersion}` : ''}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                >
                  {status.label}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page component ─────────────────────────────────────────

export default function HostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hostId = params.id as string;
  const { isSuperUser } = usePermissions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const {
    data: host,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['host', hostId],
    queryFn: () => hostClient.getHost(hostId),
    enabled: Boolean(hostId),
    refetchInterval: 30000,
  });

  // Fetch nodes on this host (lifted here so capacity section + nodes card share data)
  const { data: hostNodesData, isLoading: isLoadingNodes } = useQuery({
    queryKey: ['hostNodes', hostId],
    queryFn: async () => {
      const response = await nodeClient.listNodesByHost(hostId, {
        currentPage: 0,
        itemsPerPage: 100,
      });
      return response;
    },
    enabled: Boolean(hostId),
  });

  const hostNodes = hostNodesData?.nodes ?? [];

  const hostDisplayLabel =
    host?.displayName || host?.networkName || 'this host';

  const deleteHostMutation = useMutation({
    mutationFn: () => hostClient.deleteHost(hostId),
    onSuccess: () => {
      toast.success('Host deleted', {
        description: `${hostDisplayLabel} has been removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      router.push('/hosts');
    },
    onError: (err: Error) => {
      toast.error('Failed to delete host', { description: err.message });
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    },
  });

  // Compute IP stats
  const totalIps = host?.ipAddresses?.length ?? 0;
  const assignedIps =
    host?.ipAddresses?.filter((ip) => ip.assigned).length ?? 0;
  const availableIps = totalIps - assignedIps;
  const ipUtilization =
    totalIps > 0 ? Math.round((assignedIps / totalIps) * 100) : 0;

  // Estimate node capacity based on IP availability
  // (simple heuristic: each node uses one IP)
  const nodeCapacity = totalIps;
  const nodeUtilization =
    nodeCapacity > 0
      ? Math.round(((host?.nodeCount ?? 0) / nodeCapacity) * 100)
      : 0;

  // Aggregate actual resource allocation from node VM configs
  const allocatedCpu = hostNodes.reduce(
    (sum, n) => sum + (n.config?.vm?.cpuCores ?? 0),
    0,
  );
  const allocatedMemory = hostNodes.reduce(
    (sum, n) => sum + (n.config?.vm?.memoryBytes ?? 0),
    0,
  );
  const allocatedDisk = hostNodes.reduce(
    (sum, n) => sum + (n.config?.vm?.diskBytes ?? 0),
    0,
  );

  const cpuTotal = host?.cpuCores ?? 0;
  const memTotal = host?.memoryBytes ?? 0;
  const diskTotal = host?.diskBytes ?? 0;

  const cpuPct = cpuTotal > 0 ? Math.round((allocatedCpu / cpuTotal) * 100) : 0;
  const memPct =
    memTotal > 0 ? Math.round((allocatedMemory / memTotal) * 100) : 0;
  const diskPct =
    diskTotal > 0 ? Math.round((allocatedDisk / diskTotal) * 100) : 0;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => router.push('/hosts')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Hosts
      </Button>

      {isLoading ? (
        <DetailSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <CircleAlert className="mb-3 h-10 w-10 text-destructive" />
          <h3 className="text-lg font-medium">Failed to load host</h3>
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
      ) : host ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-medium tracking-tight">
                {host.displayName || host.networkName || 'Unnamed Host'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {host.orgName ? `${host.orgName} · ` : ''}
                {host.hostId?.slice(0, 8)}…
                <CopyButton value={host.hostId} />
              </p>
            </div>
          </div>

          {/* Capacity overview — 4 rings with real utilization data */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Resource Utilization
            </h2>
            <div className="flex flex-wrap items-center justify-around gap-8">
              <CapacityRing
                used={assignedIps}
                total={totalIps}
                label="IP Addresses"
                color="hsl(var(--primary))"
              />
              <CapacityRing
                used={allocatedCpu}
                total={cpuTotal}
                label="CPU Cores"
                color="hsl(var(--warning))"
              />
              <CapacityRing
                used={
                  allocatedMemory > 0
                    ? Math.round(allocatedMemory / (1024 * 1024 * 1024))
                    : 0
                }
                total={
                  memTotal > 0 ? Math.round(memTotal / (1024 * 1024 * 1024)) : 0
                }
                label="Memory (GB)"
                color="hsl(var(--success))"
              />
              <CapacityRing
                used={
                  allocatedDisk > 0
                    ? Math.round(allocatedDisk / (1024 * 1024 * 1024))
                    : 0
                }
                total={
                  diskTotal > 0
                    ? Math.round(diskTotal / (1024 * 1024 * 1024))
                    : 0
                }
                label="Disk (GB)"
                color="hsl(240, 5%, 65%)"
              />
            </div>
          </div>

          {/* Resource bars with actual allocated vs total */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ResourceBar
              icon={Server}
              label="IP Addresses"
              value={`${availableIps} available`}
              subValue={`${assignedIps} of ${totalIps} assigned`}
              percentage={ipUtilization}
              color="hsl(var(--primary))"
            />
            <ResourceBar
              icon={Cpu}
              label="CPU Cores"
              value={`${allocatedCpu} of ${cpuTotal}`}
              subValue={`${cpuTotal - allocatedCpu} cores free`}
              percentage={cpuPct}
              color="hsl(var(--warning))"
            />
            <ResourceBar
              icon={MemoryStick}
              label="Memory"
              value={formatMemory(allocatedMemory) + ' used'}
              subValue={`of ${formatMemory(memTotal)} total`}
              percentage={memPct}
              color="hsl(var(--success))"
            />
            <ResourceBar
              icon={Database}
              label="Disk"
              value={formatDisk(allocatedDisk) + ' used'}
              subValue={`of ${formatDisk(diskTotal)} total`}
              percentage={diskPct}
              color="hsl(240, 5%, 65%)"
            />
          </div>

          {/* Nodes on this host */}
          <HostNodesCard nodes={hostNodes} isLoading={isLoadingNodes} />

          {/* IP Address grid — interactive visual */}
          {totalIps > 0 && <IpAddressGrid ipAddresses={host.ipAddresses} />}

          {/* Detail cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* System */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Settings className="h-4 w-4" />
                System
              </h2>
              <div className="-mx-3">
                <DetailRow
                  icon={Cpu}
                  label="CPU Cores"
                  value={
                    host.cpuCores !== undefined
                      ? `${host.cpuCores} cores`
                      : undefined
                  }
                />
                <DetailRow
                  icon={Monitor}
                  label="Operating System"
                  value={
                    host.os && host.osVersion
                      ? `${host.os} ${host.osVersion}`
                      : host.os || undefined
                  }
                />
                <DetailRow
                  icon={Tag}
                  label="BlockVisor Version"
                  value={host.bvVersion || undefined}
                />
                <DetailRow
                  icon={Settings}
                  label="Schedule Type"
                  value={formatScheduleType(host.scheduleType)}
                />
                <DetailRow
                  icon={Globe}
                  label="IP Address"
                  value={host.ipAddress || undefined}
                  mono
                  copyable
                />
                <DetailRow
                  icon={Network}
                  label="IP Gateway"
                  value={host.ipGateway || undefined}
                  mono
                  copyable
                />
              </div>
            </div>

            {/* Organization & Metadata */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Organization & Metadata
              </h2>
              <div className="-mx-3">
                <DetailRow
                  icon={Building2}
                  label="Organization"
                  value={host.orgName || undefined}
                />
                <DetailRow
                  icon={MapPin}
                  label="Region"
                  value={host.region?.displayName || undefined}
                />
                <DetailRow
                  icon={HardDrive}
                  label="Host ID"
                  value={host.hostId}
                  mono
                  copyable
                />
                <DetailRow
                  icon={Calendar}
                  label="Created"
                  value={
                    host.createdAt
                      ? new Date(host.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : undefined
                  }
                />
                <DetailRow
                  icon={Calendar}
                  label="Last Updated"
                  value={
                    host.updatedAt
                      ? new Date(host.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : undefined
                  }
                />
                <DetailRow
                  icon={Network}
                  label="Network Name"
                  value={host.networkName || undefined}
                  copyable
                />
              </div>
            </div>
          </div>

          {/* Cost section (if present) */}
          {host.cost?.amount && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Cost
              </h2>
              <p className="text-lg font-medium">
                {(host.cost.amount.amountMinorUnits / 100).toFixed(2)}{' '}
                <span className="text-sm text-muted-foreground">
                  {host.cost.amount.currency ?? 'USD'}
                </span>
              </p>
            </div>
          )}

          {/* Danger Zone — superuser only, host must have 0 nodes */}
          {isSuperUser && host.nodeCount === 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
              <h2 className="text-sm font-medium text-destructive">
                Danger Zone
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This host has no nodes and can be permanently removed.
              </p>

              {!showDeleteConfirm ? (
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-4 gap-2"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Host
                </Button>
              ) : (
                <div className="mt-4 space-y-3 rounded-md border border-destructive/20 bg-background p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Confirm host deletion
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type{' '}
                        <span className="font-mono font-medium text-foreground">
                          {hostDisplayLabel}
                        </span>{' '}
                        to confirm.
                      </p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={hostDisplayLabel}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
                    autoFocus
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                      disabled={
                        deleteConfirmText !== hostDisplayLabel ||
                        deleteHostMutation.isPending
                      }
                      onClick={() => deleteHostMutation.mutate()}
                    >
                      {deleteHostMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {deleteHostMutation.isPending
                        ? 'Deleting…'
                        : 'Permanently Delete'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText('');
                      }}
                      disabled={deleteHostMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
