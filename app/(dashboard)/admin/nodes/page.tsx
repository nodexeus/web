'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { imageClient } from '@modules/grpc/clients/imageClient';
import { protocolClient } from '@modules/grpc/clients/protocolClient';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { NodeSortField } from '@modules/grpc/library/blockjoy/v1/node';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { friendlyError } from '@/lib/friendly-error';
import { Skeleton } from '@/components/ui/skeleton';

import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Cpu,
  Play,
  Square,
  Trash2,
  X,
  Info,
  ArrowUpCircle,
  MoreHorizontal,
  ChevronDown,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Sort field mappings                                                */
/* ------------------------------------------------------------------ */

const SERVER_SORT_FIELDS: Record<string, number> = {
  name: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME,
  status: NodeSortField.NODE_SORT_FIELD_NODE_STATE,
  health: NodeSortField.NODE_SORT_FIELD_PROTOCOL_HEALTH,
  blockHeight: NodeSortField.NODE_SORT_FIELD_BLOCK_HEIGHT,
  apr: NodeSortField.NODE_SORT_FIELD_APR,
  jailed: NodeSortField.NODE_SORT_FIELD_JAILED,
  sqdName: NodeSortField.NODE_SORT_FIELD_SQD_NAME,
  created: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
};

const CLIENT_SORT_KEYS = [
  'protocol',
  'variant',
  'version',
  'org',
  'host',
  'ip',
  'peerId',
];

/* ------------------------------------------------------------------ */
/*  ColumnHeader — sort toggle + optional filter dropdown              */
/* ------------------------------------------------------------------ */

function ColumnHeader({
  label,
  sortKey,
  isServerSort,
  currentSortKey,
  currentSortAsc,
  onSort,
  filterOptions,
  filterSelected,
  onFilterChange,
}: {
  label: string;
  sortKey: string;
  isServerSort: boolean;
  currentSortKey: string | null;
  currentSortAsc: boolean;
  onSort: (key: string, isServer: boolean) => void;
  filterOptions?: { value: string; label: string }[];
  filterSelected?: string[];
  onFilterChange?: (values: string[]) => void;
}) {
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const isActive = currentSortKey === sortKey;

  useEffect(() => {
    if (!showFilter) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilter]);

  return (
    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSort(sortKey, isServerSort)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {label}
          {isActive && (
            <svg
              className={`h-3 w-3 ${currentSortAsc ? '' : 'rotate-180'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
        </button>

        {filterOptions && onFilterChange && (
          <div className="relative" ref={filterRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFilter(!showFilter);
              }}
              className={`ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded transition-colors ${
                (filterSelected?.length ?? 0) > 0
                  ? 'text-primary'
                  : 'text-muted-foreground/50 hover:text-muted-foreground'
              }`}
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {(filterSelected?.length ?? 0) > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-primary-foreground">
                  {filterSelected!.length}
                </span>
              )}
            </button>

            {showFilter && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-48 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                {filterOptions.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    No options
                  </p>
                ) : (
                  filterOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={filterSelected?.includes(opt.value) ?? false}
                        onChange={() => {
                          const current = filterSelected ?? [];
                          onFilterChange(
                            current.includes(opt.value)
                              ? current.filter((v) => v !== opt.value)
                              : [...current, opt.value],
                          );
                        }}
                        className="h-3 w-3 rounded"
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  ))
                )}
                {(filterSelected?.length ?? 0) > 0 && (
                  <button
                    onClick={() => onFilterChange([])}
                    className="mt-1 w-full rounded px-2 py-1 text-center text-[10px] text-muted-foreground hover:bg-accent"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

/* ------------------------------------------------------------------ */
/*  Badge helpers                                                      */
/* ------------------------------------------------------------------ */

function getNodeStateBadge(state: number | undefined) {
  const configs: Record<number, { label: string; className: string }> = {
    1: { label: 'Starting', className: 'text-warning bg-warning/10' },
    2: { label: 'Running', className: 'text-success bg-success/10' },
    3: { label: 'Stopped', className: 'text-muted-foreground bg-muted' },
    4: { label: 'Failed', className: 'text-destructive bg-destructive/10' },
    5: { label: 'Upgrading', className: 'text-warning bg-warning/10' },
    6: { label: 'Deleting', className: 'text-warning bg-warning/10' },
    7: { label: 'Deleted', className: 'text-muted-foreground bg-muted' },
  };
  const config = configs[state ?? 0] ?? {
    label: 'Unknown',
    className: 'text-muted-foreground bg-muted',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function getHealthBadge(health: number | undefined) {
  const configs: Record<number, { label: string; className: string }> = {
    1: { label: 'Healthy', className: 'text-success bg-success/10' },
    2: { label: 'Unhealthy', className: 'text-destructive bg-destructive/10' },
    3: { label: 'Degraded', className: 'text-warning bg-warning/10' },
  };
  const config = configs[health ?? 0] ?? { label: '\u2014', className: '' };
  return config.label === '\u2014' ? (
    <span className="text-muted-foreground">{'\u2014'}</span>
  ) : (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Static filter option sets                                          */
/* ------------------------------------------------------------------ */

const statusOptions = [
  { value: '1', label: 'Starting' },
  { value: '2', label: 'Running' },
  { value: '3', label: 'Stopped' },
  { value: '4', label: 'Failed' },
  { value: '5', label: 'Upgrading' },
  { value: '6', label: 'Deleting' },
  { value: '7', label: 'Deleted' },
];

const jailedOptions = [
  { value: 'true', label: 'Jailed' },
  { value: 'false', label: 'Not Jailed' },
];

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function AdminNodesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  /* --- page --------------------------------------------------------- */
  const [page, setPage] = useState(1);
  const pageSize = 50;

  /* --- selection / actions ------------------------------------------ */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [upgradeVersion, setUpgradeVersion] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  /* --- server-side sort (sent to API) ------------------------------- */
  const [serverSortField, setServerSortField] = useState(
    NodeSortField.NODE_SORT_FIELD_CREATED_AT,
  );
  const [serverSortOrder, setServerSortOrder] = useState(
    SortOrder.SORT_ORDER_DESCENDING,
  );

  /* --- client-side sort (applied after API results) ----------------- */
  const [clientSortKey, setClientSortKey] = useState<string | null>(null);
  const [clientSortAsc, setClientSortAsc] = useState(true);

  /* --- unified sort key for the UI (which column is highlighted) ---- */
  const activeSortKey = useMemo(() => {
    if (clientSortKey) return clientSortKey;
    const entry = Object.entries(SERVER_SORT_FIELDS).find(
      ([, v]) => v === serverSortField,
    );
    return entry ? entry[0] : null;
  }, [clientSortKey, serverSortField]);

  const activeSortAsc = useMemo(() => {
    if (clientSortKey) return clientSortAsc;
    return serverSortOrder === SortOrder.SORT_ORDER_ASCENDING;
  }, [clientSortKey, clientSortAsc, serverSortOrder]);

  /* --- filters ------------------------------------------------------ */
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterProtocol, setFilterProtocol] = useState<string[]>([]);
  const [filterOrg, setFilterOrg] = useState<string[]>([]);
  const [filterJailed, setFilterJailed] = useState<string[]>([]);

  /* --- reset page on filter change ---------------------------------- */
  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterProtocol, filterOrg, filterJailed]);

  useEffect(() => {
    setSelectedIds([]);
  }, [page]);

  /* --- close actions dropdown on click outside ---------------------- */
  useEffect(() => {
    if (!showActions) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(e.target as globalThis.Node)
      ) {
        setShowActions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActions]);

  /* --- unified sort handler ----------------------------------------- */
  const handleSort = (key: string, isServer: boolean) => {
    if (isServer) {
      const apiField = SERVER_SORT_FIELDS[key];
      if (apiField === serverSortField && clientSortKey === null) {
        // Toggle order on the same server field
        setServerSortOrder(
          serverSortOrder === SortOrder.SORT_ORDER_ASCENDING
            ? SortOrder.SORT_ORDER_DESCENDING
            : SortOrder.SORT_ORDER_ASCENDING,
        );
      } else {
        setServerSortField(apiField);
        setServerSortOrder(SortOrder.SORT_ORDER_ASCENDING);
      }
      setClientSortKey(null);
      setPage(1);
    } else {
      // Client-side sort
      if (clientSortKey === key) {
        setClientSortAsc(!clientSortAsc);
      } else {
        setClientSortKey(key);
        setClientSortAsc(true);
      }
    }
  };

  /* --- dynamic filter options queries ------------------------------- */
  const { data: protocolOptions } = useQuery({
    queryKey: ['admin', 'filterProtocols'],
    queryFn: async () => {
      const r = await protocolClient.listProtocols();
      return (r.protocols ?? []).map((p: any) => ({
        value: p.protocolId,
        label: p.name,
      }));
    },
  });

  const { data: orgOptions } = useQuery({
    queryKey: ['admin', 'filterOrgs'],
    queryFn: async () => {
      const r = await organizationClient.listOrganizations(
        undefined,
        undefined,
        undefined,
        true,
      );
      return (r.orgs ?? [])
        .filter((o: any) => !o.personal)
        .map((o: any) => ({ value: o.orgId, label: o.name }));
    },
  });

  /* --- main data query ---------------------------------------------- */
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'admin',
      'nodes',
      {
        page,
        serverSortField,
        serverSortOrder,
        filterStatus,
        filterProtocol,
        filterOrg,
        limit: pageSize,
      },
    ],
    queryFn: async () => {
      const response = await nodeClient.listNodes(
        undefined,
        {
          nodeStatus: filterStatus.length ? filterStatus : undefined,
          protocol: filterProtocol.length ? filterProtocol : undefined,
          orgIds: filterOrg.length ? filterOrg : undefined,
        },
        { currentPage: page - 1, itemsPerPage: pageSize },
        [{ field: serverSortField, order: serverSortOrder }],
      );
      return response;
    },
  });

  const nodes = data?.nodes ?? [];

  /* --- client-side sort --------------------------------------------- */
  const sortedNodes = useMemo(() => {
    if (!clientSortKey || !nodes.length) return nodes;

    const getVal = (node: any): string => {
      switch (clientSortKey) {
        case 'protocol':
          return node.protocolName ?? '';
        case 'variant':
          return node.versionKey?.variantKey ?? '';
        case 'version':
          return node.semanticVersion ?? '';
        case 'org':
          return node.orgName ?? '';
        case 'host':
          return node.hostDisplayName ?? node.hostNetworkName ?? '';
        case 'ip':
          return node.ipAddress ?? '';
        case 'peerId':
          return node.p2pAddress ?? '';
        default:
          return '';
      }
    };

    return [...nodes].sort((a, b) => {
      const va = getVal(a).toLowerCase();
      const vb = getVal(b).toLowerCase();
      const cmp = va.localeCompare(vb);
      return clientSortAsc ? cmp : -cmp;
    });
  }, [nodes, clientSortKey, clientSortAsc]);

  /* --- client-side jailed filter ------------------------------------ */
  const displayNodes = useMemo(() => {
    if (filterJailed.length === 0) return sortedNodes;
    return sortedNodes.filter((n: any) => {
      if (filterJailed.includes('true') && filterJailed.includes('false'))
        return true;
      if (filterJailed.includes('true')) return n.jailed === true;
      if (filterJailed.includes('false')) return n.jailed === false;
      return true;
    });
  }, [sortedNodes, filterJailed]);

  /* --- selection helpers -------------------------------------------- */
  const allSelected =
    displayNodes.length > 0 &&
    displayNodes.every((n) => selectedIds.includes(n.nodeId));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayNodes.map((n) => n.nodeId));
    }
  }

  function toggleOne(nodeId: string) {
    setSelectedIds((prev) =>
      prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId],
    );
  }

  /* --- bulk actions ------------------------------------------------- */
  async function handleBulkAction(action: 'start' | 'stop' | 'delete') {
    if (selectedIds.length === 0) return;

    if (action === 'delete') {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${selectedIds.length} node(s)? This action cannot be undone.`,
      );
      if (!confirmed) return;
    }

    setActionLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const nodeId of selectedIds) {
      try {
        if (action === 'start') {
          await nodeClient.startNode(nodeId);
        } else if (action === 'stop') {
          await nodeClient.stopNode(nodeId);
        } else {
          await nodeClient.deleteNode(nodeId);
        }
        successCount++;
      } catch {
        failCount++;
      }
    }

    setActionLoading(false);
    setSelectedIds([]);
    queryClient.invalidateQueries({ queryKey: ['admin', 'nodes'] });

    const actionLabel =
      action === 'start'
        ? 'started'
        : action === 'stop'
          ? 'stopped'
          : 'deleted';
    if (failCount === 0) {
      toast.success(`Successfully ${actionLabel} ${successCount} node(s)`);
    } else {
      toast.warning(
        `${actionLabel} ${successCount} node(s), ${failCount} failed`,
      );
    }
  }

  const handleBulkStart = () => {
    setShowActions(false);
    handleBulkAction('start');
  };
  const handleBulkStop = () => {
    setShowActions(false);
    handleBulkAction('stop');
  };
  const handleBulkDelete = () => {
    setShowActions(false);
    handleBulkAction('delete');
  };

  /* --- helpers ------------------------------------------------------ */
  function truncate(str: string | undefined, len: number) {
    if (!str) return '\u2014';
    return str.length > len ? str.slice(0, len) + '\u2026' : str;
  }

  /* --- bulk upgrade logic ------------------------------------------- */
  const selectedNodes = displayNodes.filter((n: any) =>
    selectedIds.includes(n.nodeId),
  );
  const variantKeys = [
    ...new Set(
      selectedNodes.map(
        (n: any) => `${n.versionKey?.protocolKey}|${n.versionKey?.variantKey}`,
      ),
    ),
  ];
  const canBulkUpgrade = selectedIds.length > 0 && variantKeys.length === 1;
  const sharedVariantKey =
    canBulkUpgrade &&
    selectedNodes[0]?.versionKey?.protocolKey &&
    selectedNodes[0]?.versionKey?.variantKey
      ? {
          protocolKey: selectedNodes[0].versionKey.protocolKey,
          variantKey: selectedNodes[0].versionKey.variantKey,
        }
      : null;

  const toNums = (v: string) =>
    v.split('.').map((s) => parseInt(s.replace(/\D/g, ''), 10) || 0);

  const upgradeVersionsQuery = useQuery({
    queryKey: [
      'bulkUpgradeVersions',
      sharedVariantKey?.protocolKey,
      sharedVariantKey?.variantKey,
    ],
    queryFn: () =>
      protocolClient.listVersions({
        versionKey: sharedVariantKey!,
        orgId: selectedNodes[0]?.orgId,
      }),
    enabled: Boolean(showUpgradePanel && canBulkUpgrade && sharedVariantKey),
  });

  const bulkUpgradeMutation = useMutation({
    mutationFn: async () => {
      if (!upgradeVersion || !sharedVariantKey)
        throw new Error('No version selected');
      const imageResp = await imageClient.getImage({
        versionKey: sharedVariantKey,
        orgId: selectedNodes[0]?.orgId,
        semanticVersion: upgradeVersion,
      });
      const imageId = imageResp.image?.imageId;
      if (!imageId) throw new Error('Image not found');
      await nodeClient.upgradeNode(selectedIds, imageId);
    },
    onSuccess: () => {
      toast.success(`Upgrade initiated for ${selectedIds.length} nodes`);
      setShowUpgradePanel(false);
      setUpgradeVersion(null);
      setSelectedIds([]);
      queryClient.refetchQueries({ queryKey: ['admin', 'nodes'] });
    },
    onError: (err: Error) => toast.error(`Upgrade failed: ${err.message}`),
  });

  /* --- active filter count for the clear-all button ----------------- */
  const activeFilterCount =
    filterStatus.length +
    filterProtocol.length +
    filterOrg.length +
    filterJailed.length;

  /* ================================================================== */
  /*  RENDER                                                            */
  /* ================================================================== */

  return (
    <div className="space-y-4">
      {/* Top bar: actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Actions dropdown */}
          <div className="relative" ref={actionsRef}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={selectedIds.length === 0}
              onClick={() => setShowActions(!showActions)}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              Actions {selectedIds.length > 0 && `(${selectedIds.length})`}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showActions ? 'rotate-180' : ''}`}
              />
            </Button>

            {showActions && selectedIds.length > 0 && (
              <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-md border border-border bg-popover py-1 shadow-lg">
                <button
                  onClick={handleBulkStart}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  <Play className="h-4 w-4 text-success" /> Start{' '}
                  {selectedIds.length} node
                  {selectedIds.length !== 1 ? 's' : ''}
                </button>
                <button
                  onClick={handleBulkStop}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  <Square className="h-4 w-4 text-warning" /> Stop{' '}
                  {selectedIds.length} node
                  {selectedIds.length !== 1 ? 's' : ''}
                </button>
                {canBulkUpgrade && (
                  <button
                    onClick={() => {
                      setShowActions(false);
                      setShowUpgradePanel(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                  >
                    <ArrowUpCircle className="h-4 w-4 text-primary" /> Upgrade
                    version
                  </button>
                )}
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={handleBulkDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> Delete {selectedIds.length}{' '}
                  node
                  {selectedIds.length !== 1 ? 's' : ''}
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => {
                    setShowActions(false);
                    setSelectedIds([]);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4" /> Deselect all
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Loading...'
              : `${data?.total ?? 0} nodes across all organizations`}
          </p>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilterStatus([]);
                setFilterProtocol([]);
                setFilterOrg([]);
                setFilterJailed([]);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-2.5 w-2.5" />
              Clear {activeFilterCount} filter
              {activeFilterCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* Bulk upgrade panel */}
      {showUpgradePanel && canBulkUpgrade && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Upgrade {selectedIds.length} node
              {selectedIds.length !== 1 ? 's' : ''}
            </h3>
            <button
              onClick={() => setShowUpgradePanel(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Variant: {sharedVariantKey?.protocolKey}/
            {sharedVariantKey?.variantKey}
          </p>
          {upgradeVersionsQuery.isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <select
              value={upgradeVersion ?? ''}
              onChange={(e) => setUpgradeVersion(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select version...</option>
              {(upgradeVersionsQuery.data ?? [])
                .slice()
                .sort((a: any, b: any) => {
                  const na = toNums(a.semanticVersion);
                  const nb = toNums(b.semanticVersion);
                  for (let i = 0; i < Math.max(na.length, nb.length); i++) {
                    const diff = (nb[i] ?? 0) - (na[i] ?? 0);
                    if (diff !== 0) return diff;
                  }
                  return 0;
                })
                .map((v: any) => (
                  <option key={v.semanticVersion} value={v.semanticVersion}>
                    {v.semanticVersion}
                  </option>
                ))}
            </select>
          )}
          <Button
            size="sm"
            disabled={!upgradeVersion || bulkUpgradeMutation.isPending}
            onClick={() => bulkUpgradeMutation.mutate()}
            className="gap-2"
          >
            {bulkUpgradeMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-3.5 w-3.5" />
            )}
            Apply to {selectedIds.length} node
            {selectedIds.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load nodes: {friendlyError(error)}
        </div>
      )}

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              {/* Checkbox column */}
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-border"
                />
              </th>

              {/* Node Name — server sort, no filter */}
              <ColumnHeader
                label="Node Name"
                sortKey="name"
                isServerSort={true}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* Status — server sort + filter */}
              <ColumnHeader
                label="Status"
                sortKey="status"
                isServerSort={true}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
                filterOptions={statusOptions}
                filterSelected={filterStatus}
                onFilterChange={setFilterStatus}
              />

              {/* Health — server sort, no filter */}
              <ColumnHeader
                label="Health"
                sortKey="health"
                isServerSort={true}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* Protocol — client sort + filter */}
              <ColumnHeader
                label="Protocol"
                sortKey="protocol"
                isServerSort={false}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
                filterOptions={protocolOptions ?? []}
                filterSelected={filterProtocol}
                onFilterChange={setFilterProtocol}
              />

              {/* Variant — client sort, no filter */}
              <ColumnHeader
                label="Variant"
                sortKey="variant"
                isServerSort={false}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* Version — client sort, no filter */}
              <ColumnHeader
                label="Version"
                sortKey="version"
                isServerSort={false}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* Org — client sort + filter */}
              <ColumnHeader
                label="Org"
                sortKey="org"
                isServerSort={false}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
                filterOptions={orgOptions ?? []}
                filterSelected={filterOrg}
                onFilterChange={setFilterOrg}
              />

              {/* Host — client sort, no filter */}
              <ColumnHeader
                label="Host"
                sortKey="host"
                isServerSort={false}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* IP Address — client sort, no filter */}
              <ColumnHeader
                label="IP Address"
                sortKey="ip"
                isServerSort={false}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* Block Height — server sort, no filter */}
              <ColumnHeader
                label="Block Height"
                sortKey="blockHeight"
                isServerSort={true}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* APR — server sort, no filter */}
              <ColumnHeader
                label="APR"
                sortKey="apr"
                isServerSort={true}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* Jailed — server sort + filter */}
              <ColumnHeader
                label="Jailed"
                sortKey="jailed"
                isServerSort={true}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
                filterOptions={jailedOptions}
                filterSelected={filterJailed}
                onFilterChange={setFilterJailed}
              />

              {/* SQD Name — server sort, no filter */}
              <ColumnHeader
                label="SQD Name"
                sortKey="sqdName"
                isServerSort={true}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* Peer ID — client sort, no filter */}
              <ColumnHeader
                label="Peer ID"
                sortKey="peerId"
                isServerSort={false}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />

              {/* Created — server sort, no filter */}
              <ColumnHeader
                label="Created"
                sortKey="created"
                isServerSort={true}
                currentSortKey={activeSortKey}
                currentSortAsc={activeSortAsc}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-3 py-3">
                    <Skeleton className="h-3.5 w-3.5" />
                  </td>
                  {Array.from({ length: 15 }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayNodes.length === 0 ? (
              <tr>
                <td colSpan={16} className="py-12 text-center">
                  <Cpu className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No nodes found
                  </p>
                </td>
              </tr>
            ) : (
              displayNodes.map((node) => {
                const name = node.sqdName || node.displayName || node.nodeName;
                return (
                  <tr
                    key={node.nodeId}
                    className="cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
                    onClick={() => router.push(`/admin/nodes/${node.nodeId}`)}
                  >
                    <td
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(node.nodeId)}
                        onChange={() => toggleOne(node.nodeId)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <p className="text-sm font-medium">
                        {truncate(name, 28)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {getNodeStateBadge(node.nodeStatus?.state)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {getHealthBadge(node.nodeStatus?.protocol?.health)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                      {node.protocolName || '\u2014'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                      {node.versionKey?.variantKey || '\u2014'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                      {node.semanticVersion || '\u2014'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                      {truncate(node.orgName, 20)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                      {truncate(
                        node.hostDisplayName || node.hostNetworkName,
                        20,
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground font-mono">
                      {node.ipAddress || '\u2014'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                      {node.blockHeight != null
                        ? node.blockHeight.toLocaleString()
                        : '\u2014'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                      {node.apr != null ? `${node.apr.toFixed(2)}%` : '\u2014'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm">
                      {node.jailed === true ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-destructive">Yes</span>
                          {node.jailedReason && (
                            <span className="group relative">
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 w-48 rounded-md border bg-popover p-2 text-[10px] text-popover-foreground shadow-md">
                                {node.jailedReason}
                              </span>
                            </span>
                          )}
                        </span>
                      ) : node.jailed === false ? (
                        <span className="text-muted-foreground">No</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {'\u2014'}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground font-mono">
                      {truncate(node.sqdName, 24)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground font-mono">
                      {truncate(node.p2pAddress, 16)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                      {node.createdAt
                        ? new Date(node.createdAt).toLocaleDateString()
                        : '\u2014'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && (data?.total ?? 0) > pageSize && (
        <div className="flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil((data?.total ?? 0) / pageSize)}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
