'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hostClient } from '@modules/grpc/clients/hostClient';
import { friendlyError } from '@/lib/friendly-error';
import { HostSortField } from '@modules/grpc/library/blockjoy/v1/host';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';

import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Server, Trash2, ChevronDown, Filter, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Server-side sort field map (column key → HostSortField enum)
// ---------------------------------------------------------------------------
const SERVER_SORT_FIELDS: Record<string, number> = {
  name: HostSortField.HOST_SORT_FIELD_DISPLAY_NAME,
  os: HostSortField.HOST_SORT_FIELD_OS,
  osVersion: HostSortField.HOST_SORT_FIELD_OS_VERSION,
  bvVersion: HostSortField.HOST_SORT_FIELD_BV_VERSION,
  nodes: HostSortField.HOST_SORT_FIELD_NODE_COUNT,
  created: HostSortField.HOST_SORT_FIELD_CREATED_AT,
};

// Client-side sort keys (no server-side support)
const CLIENT_SORT_KEYS = new Set(['ip', 'region']);

// ---------------------------------------------------------------------------
// ColumnHeader – unified sort + optional inline filter dropdown
// ---------------------------------------------------------------------------
function ColumnHeader({
  label,
  columnKey,
  sortable = false,
  currentSortKey,
  currentSortDir,
  onSort,
  filterOptions,
  filterSelected,
  onFilterChange,
  filterNote,
}: {
  label: string;
  columnKey: string;
  sortable?: boolean;
  currentSortKey: string;
  currentSortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  filterOptions?: { value: string; label: string }[];
  filterSelected?: string[];
  onFilterChange?: (values: string[]) => void;
  filterNote?: string;
}) {
  const isActiveSortColumn = currentSortKey === columnKey;
  const hasFilter = filterOptions && filterSelected && onFilterChange;
  const activeFilterCount = filterSelected?.length ?? 0;

  const [filterOpen, setFilterOpen] = useState(false);
  const dropdownRef = useRef<HTMLTableHeaderCellElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  const toggleFilterValue = (val: string) => {
    if (!onFilterChange || !filterSelected) return;
    onFilterChange(
      filterSelected.includes(val)
        ? filterSelected.filter((v) => v !== val)
        : [...filterSelected, val],
    );
  };

  return (
    <th className="px-4 py-3 relative" ref={dropdownRef}>
      <span className="inline-flex items-center gap-1">
        {/* Sort click target */}
        {sortable ? (
          <button
            className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-foreground transition-colors uppercase text-xs font-medium tracking-wider"
            onClick={() => onSort(columnKey)}
          >
            {label}
            {isActiveSortColumn && (
              <svg
                className={`h-3 w-3 shrink-0 transition-transform ${currentSortDir === 'asc' ? '' : 'rotate-180'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            )}
          </button>
        ) : (
          <span className="uppercase text-xs font-medium tracking-wider">
            {label}
          </span>
        )}

        {/* Filter toggle button */}
        {hasFilter && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFilterOpen(!filterOpen);
            }}
            className={`ml-0.5 inline-flex items-center justify-center rounded p-0.5 transition-colors ${
              activeFilterCount > 0
                ? 'text-primary'
                : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            <Filter className="h-3 w-3" />
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground leading-tight">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </span>

      {/* Filter dropdown */}
      {hasFilter && filterOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-52 overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {filterOptions!.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No options
            </p>
          ) : (
            filterOptions!.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
              >
                <input
                  type="checkbox"
                  checked={filterSelected!.includes(opt.value)}
                  onChange={() => toggleFilterValue(opt.value)}
                  className="h-3 w-3 rounded"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))
          )}
          {activeFilterCount > 0 && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => onFilterChange!([])}
                className="w-full rounded px-2 py-1 text-center text-[10px] text-muted-foreground hover:bg-accent"
              >
                Clear {filterNote ? filterNote : ''}
              </button>
            </>
          )}
        </div>
      )}
    </th>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function AdminHostsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Selection & delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Hybrid sort state – one unified key + direction
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Filters
  const [filterBvVersion, setFilterBvVersion] = useState<string[]>([]);
  const [filterRegion, setFilterRegion] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // Reset helpers
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setPage(1);
  }, [filterBvVersion]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  // ---------------------------------------------------------------------------
  // Sort handler
  // ---------------------------------------------------------------------------
  const handleSort = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
      // Only reset page for server sorts (client sorts just reorder the current page)
      if (SERVER_SORT_FIELDS[key]) {
        setPage(1);
      }
    },
    [sortKey],
  );

  // Derive server sort params
  const serverSortField =
    SERVER_SORT_FIELDS[sortKey] ?? HostSortField.HOST_SORT_FIELD_DISPLAY_NAME;
  const serverSortOrder =
    sortDir === 'asc'
      ? SortOrder.SORT_ORDER_ASCENDING
      : SortOrder.SORT_ORDER_DESCENDING;

  // When a client-side sort key is active we still need a stable server sort
  const isClientSort = CLIENT_SORT_KEYS.has(sortKey);

  // ---------------------------------------------------------------------------
  // Main data query
  // ---------------------------------------------------------------------------
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'admin',
      'hosts',
      {
        page,
        sortField: isClientSort
          ? HostSortField.HOST_SORT_FIELD_DISPLAY_NAME
          : serverSortField,
        sortOrder: isClientSort
          ? SortOrder.SORT_ORDER_ASCENDING
          : serverSortOrder,
        filterBvVersion,
        limit: pageSize,
      },
    ],
    queryFn: async () => {
      const response = await hostClient.listHosts(
        undefined,
        {
          bvVersions: filterBvVersion.length ? filterBvVersion : undefined,
        },
        { currentPage: page - 1, itemsPerPage: pageSize },
        [
          {
            field: isClientSort
              ? HostSortField.HOST_SORT_FIELD_DISPLAY_NAME
              : serverSortField,
            order: isClientSort
              ? SortOrder.SORT_ORDER_ASCENDING
              : serverSortOrder,
          },
        ],
      );
      return response;
    },
  });

  const rawHosts: any[] = data?.hosts ?? [];

  // ---------------------------------------------------------------------------
  // Client-side region filter (filters current page only)
  // ---------------------------------------------------------------------------
  const hostsAfterRegionFilter = useMemo(() => {
    if (filterRegion.length === 0) return rawHosts;
    return rawHosts.filter((h: any) => {
      const name = h.region?.displayName;
      return name && filterRegion.includes(name);
    });
  }, [rawHosts, filterRegion]);

  // ---------------------------------------------------------------------------
  // Client-side sort (when active)
  // ---------------------------------------------------------------------------
  const hosts = useMemo(() => {
    if (!isClientSort) return hostsAfterRegionFilter;

    const sorted = [...hostsAfterRegionFilter];
    const dir = sortDir === 'asc' ? 1 : -1;

    sorted.sort((a: any, b: any) => {
      let va: string;
      let vb: string;
      if (sortKey === 'ip') {
        va = a.ipAddress ?? '';
        vb = b.ipAddress ?? '';
      } else {
        // region
        va = a.region?.displayName ?? '';
        vb = b.region?.displayName ?? '';
      }
      return va.localeCompare(vb) * dir;
    });

    return sorted;
  }, [hostsAfterRegionFilter, isClientSort, sortKey, sortDir]);

  // ---------------------------------------------------------------------------
  // BV version filter options (broad fetch)
  // ---------------------------------------------------------------------------
  const { data: bvVersionOptions } = useQuery({
    queryKey: ['admin', 'hosts', 'bvVersions'],
    queryFn: async () => {
      const response = await hostClient.listHosts(
        undefined,
        {},
        { currentPage: 0, itemsPerPage: 500 },
        [
          {
            field: HostSortField.HOST_SORT_FIELD_BV_VERSION,
            order: SortOrder.SORT_ORDER_ASCENDING,
          },
        ],
      );
      const versions = new Set<string>();
      for (const h of response.hosts ?? []) {
        if (h.bvVersion) versions.add(h.bvVersion);
      }
      return Array.from(versions)
        .sort()
        .map((v) => ({ value: v, label: v }));
    },
    staleTime: 60_000,
  });

  // Region filter options – derived from current page data
  const regionOptions = useMemo(() => {
    const regions = [
      ...new Set(
        rawHosts.map((h: any) => h.region?.displayName).filter(Boolean),
      ),
    ].sort() as string[];
    return regions.map((r) => ({ value: r, label: r }));
  }, [rawHosts]);

  // ---------------------------------------------------------------------------
  // Selection / delete logic
  // ---------------------------------------------------------------------------
  const deletableHosts = hosts.filter((h: any) => h.nodeCount === 0);
  const deletableIds = new Set(deletableHosts.map((h: any) => h.hostId));

  const selectedDeletable = [...selectedIds].filter((id) =>
    deletableIds.has(id),
  );

  const allDeletableSelected =
    deletableHosts.length > 0 &&
    deletableHosts.every((h: any) => selectedIds.has(h.hostId));

  function toggleSelectAll() {
    if (allDeletableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletableHosts.map((h: any) => h.hostId)));
    }
  }

  function toggleSelect(hostId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(hostId)) {
        next.delete(hostId);
      } else {
        next.add(hostId);
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selectedDeletable.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedDeletable.length} host(s)? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const hostId of selectedDeletable) {
      try {
        await hostClient.deleteHost(hostId);
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`Failed to delete host ${hostId}:`, err);
      }
    }

    setIsDeleting(false);
    setSelectedIds(new Set());

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} host(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} host(s)`);
    }

    queryClient.invalidateQueries({ queryKey: ['admin', 'hosts'] });
  }

  // ---------------------------------------------------------------------------
  // Active filter summary
  // ---------------------------------------------------------------------------
  const hasAnyFilter = filterBvVersion.length > 0 || filterRegion.length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Top bar: summary + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Loading...'
              : `${data?.total ?? 0} hosts across all organizations`}
          </p>
          {selectedDeletable.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {isDeleting
                ? 'Deleting...'
                : `Delete Selected (${selectedDeletable.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Active filters summary */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Active filters:</span>
          {filterBvVersion.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-primary">
              BV Version ({filterBvVersion.length})
              <button
                onClick={() => setFilterBvVersion([])}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filterRegion.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-primary">
              Region ({filterRegion.length})
              <span className="text-[10px] text-muted-foreground">
                (this page)
              </span>
              <button
                onClick={() => setFilterRegion([])}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setFilterBvVersion([]);
              setFilterRegion([]);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load hosts: {friendlyError(error)}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {/* Checkbox column */}
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allDeletableSelected && deletableHosts.length > 0}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-border"
                  title="Select all deletable hosts"
                />
              </th>

              <ColumnHeader
                label="Host Name"
                columnKey="name"
                sortable
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
              />

              <ColumnHeader
                label="IP Address"
                columnKey="ip"
                sortable
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
              />

              <ColumnHeader
                label="Region"
                columnKey="region"
                sortable
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
                filterOptions={regionOptions}
                filterSelected={filterRegion}
                onFilterChange={setFilterRegion}
                filterNote="(this page)"
              />

              <ColumnHeader
                label="OS"
                columnKey="os"
                sortable
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
              />

              <ColumnHeader
                label="OS Version"
                columnKey="osVersion"
                sortable
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
              />

              <ColumnHeader
                label="BV Version"
                columnKey="bvVersion"
                sortable
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
                filterOptions={bvVersionOptions ?? []}
                filterSelected={filterBvVersion}
                onFilterChange={setFilterBvVersion}
              />

              <ColumnHeader
                label="Nodes"
                columnKey="nodes"
                sortable
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
              />

              <ColumnHeader
                label="Created"
                columnKey="created"
                sortable
                currentSortKey={sortKey}
                currentSortDir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-3">
                    <Skeleton className="h-3.5 w-3.5" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-10" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                </tr>
              ))
            ) : hosts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <Server className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No hosts found
                  </p>
                </td>
              </tr>
            ) : (
              hosts.map((host: any) => {
                const isDeletable = host.nodeCount === 0;
                const isSelected = selectedIds.has(host.hostId);

                return (
                  <tr
                    key={host.hostId}
                    className="cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
                    onClick={() => router.push(`/hosts/${host.hostId}`)}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isDeletable ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(host.hostId)}
                          className="h-3.5 w-3.5 rounded border-border"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          disabled
                          className="h-3.5 w-3.5 rounded border-border opacity-30"
                          title="Cannot delete: host has nodes"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">
                        {host.displayName || host.networkName}
                      </p>
                      {host.displayName && host.networkName && (
                        <p className="text-[10px] text-muted-foreground">
                          {host.networkName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {host.ipAddress || '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {host.region?.displayName || '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {host.os || '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {host.osVersion || '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {host.bvVersion || '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {host.nodeCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {host.createdAt
                        ? new Date(host.createdAt).toLocaleDateString()
                        : '\u2014'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
