'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { hostClient } from '@modules/grpc/clients/hostClient';
import { NodeSortField } from '@modules/grpc/library/blockjoy/v1/node';
import { HostSortField } from '@modules/grpc/library/blockjoy/v1/host';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { useOrganizations } from '@/lib/hooks/use-organizations';
import { usePermissions } from '@/lib/hooks/use-permissions';
import {
  Server,
  HardDrive,
  Rocket,
  Building2,
  Settings,
  MessageCircle,
  Search,
  LayoutDashboard,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

type ResultItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: React.ElementType;
  searchText: string;
};

// ─── Static navigation items ─────────────────────────────────────

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    keywords: 'dashboard home overview',
  },
  {
    label: 'Nodes',
    href: '/nodes',
    icon: Server,
    keywords: 'nodes list',
  },
  {
    label: 'Hosts',
    href: '/hosts',
    icon: HardDrive,
    keywords: 'hosts servers',
  },
  {
    label: 'Launch Node',
    href: '/launch-node',
    icon: Rocket,
    keywords: 'launch deploy create node',
  },
  {
    label: 'Organizations',
    href: '/organizations',
    icon: Building2,
    keywords: 'organizations orgs teams',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    keywords: 'settings profile account api keys',
  },
  {
    label: 'FAQ',
    href: '/faq',
    icon: MessageCircle,
    keywords: 'faq help support',
  },
];

const ADMIN_NAV = [
  {
    label: 'Admin Dashboard',
    href: '/admin',
    icon: ShieldCheck,
    keywords: 'admin dashboard',
  },
  {
    label: 'Admin Nodes',
    href: '/admin/nodes',
    icon: Server,
    keywords: 'admin nodes all',
  },
  {
    label: 'Admin Hosts',
    href: '/admin/hosts',
    icon: HardDrive,
    keywords: 'admin hosts all',
  },
  {
    label: 'Admin Users',
    href: '/admin/users',
    icon: Building2,
    keywords: 'admin users',
  },
  {
    label: 'Admin Orgs',
    href: '/admin/orgs',
    icon: Building2,
    keywords: 'admin organizations orgs',
  },
  {
    label: 'Admin Protocols',
    href: '/admin/protocols',
    icon: Server,
    keywords: 'admin protocols',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────

function matchesQuery(searchText: string, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return searchText.toLowerCase().includes(q);
}

// ─── Main component ──────────────────────────────────────────────

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    right: number;
  } | null>(null);

  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { organizations } = useOrganizations();
  const { isSuperUser } = usePermissions();
  const allOrgIds = organizations.map((org) => org.orgId);

  // ⌘K / Ctrl+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const openPalette = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setQuery('');
    setActiveIndex(0);
    setIsOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  // ── Pre-fetch ALL nodes when palette opens ──
  // 10K limit is effectively unlimited — the API already filters by the
  // user's org membership, so regular users only get their small set.
  // Only superusers could approach large numbers.
  const { data: allNodes, isLoading: loadingNodes } = useQuery({
    queryKey: ['commandPalette', 'allNodes', allOrgIds],
    queryFn: async () => {
      const response = await nodeClient.listNodes(
        undefined,
        { orgIds: allOrgIds.length ? allOrgIds : undefined },
        { currentPage: 0, itemsPerPage: 10000 },
        [
          {
            field: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME,
            order: SortOrder.SORT_ORDER_ASCENDING,
          },
        ],
      );
      return response.nodes ?? [];
    },
    enabled: allOrgIds.length > 0 && isOpen,
    staleTime: 30000,
  });

  // ── Pre-fetch ALL hosts when palette opens ──
  const { data: allHosts, isLoading: loadingHosts } = useQuery({
    queryKey: ['commandPalette', 'allHosts'],
    queryFn: async () => {
      const response = await hostClient.listHosts(
        undefined,
        {},
        { currentPage: 0, itemsPerPage: 10000 },
        [
          {
            field: HostSortField.HOST_SORT_FIELD_DISPLAY_NAME,
            order: SortOrder.SORT_ORDER_ASCENDING,
          },
        ],
      );
      return response.hosts ?? [];
    },
    enabled: isOpen,
    staleTime: 30000,
  });

  const isLoading = loadingNodes || loadingHosts;

  // ── Build searchable items (once, when data arrives) ──
  const nodeItems: ResultItem[] = useMemo(() => {
    return (allNodes ?? []).map((node: any) => ({
      id: `node-${node.nodeId}`,
      label: node.sqdName || node.displayName || node.nodeName || 'Unnamed',
      sublabel: [
        node.orgName,
        node.protocolName,
        node.semanticVersion,
        node.ipAddress,
        node.p2pAddress ? `Peer: ${node.p2pAddress.slice(0, 20)}...` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      href: `/nodes/${node.nodeId}`,
      icon: Server,
      searchText: [
        node.sqdName,
        node.displayName,
        node.nodeName,
        node.ipAddress,
        node.protocolName,
        node.dnsName,
        node.p2pAddress,
        node.nodeId,
        node.orgName,
        node.semanticVersion,
        node.versionKey?.variantKey,
        node.versionKey?.protocolKey,
        node.hostDisplayName,
        node.hostNetworkName,
        node.regionName,
        node.jailedReason,
      ]
        .filter(Boolean)
        .join(' '),
    }));
  }, [allNodes]);

  const hostItems: ResultItem[] = useMemo(() => {
    return (allHosts ?? []).map((host: any) => ({
      id: `host-${host.hostId}`,
      label: host.displayName || host.networkName || 'Unnamed',
      sublabel: [
        host.ipAddress,
        host.region?.displayName,
        host.os ? `${host.os} ${host.osVersion || ''}`.trim() : null,
        `${host.nodeCount ?? 0} nodes`,
      ]
        .filter(Boolean)
        .join(' · '),
      href: `/hosts/${host.hostId}`,
      icon: HardDrive,
      searchText: [
        host.displayName,
        host.networkName,
        host.ipAddress,
        host.hostId,
        host.region?.displayName,
        host.os,
        host.osVersion,
        host.bvVersion,
      ]
        .filter(Boolean)
        .join(' '),
    }));
  }, [allHosts]);

  // ── Navigation items ──
  const allNavItems: ResultItem[] = useMemo(() => {
    const items = [...NAV_ITEMS, ...(isSuperUser ? ADMIN_NAV : [])];
    return items.map((i) => ({
      id: i.href,
      label: i.label,
      href: i.href,
      icon: i.icon,
      searchText: `${i.label} ${i.keywords}`,
    }));
  }, [isSuperUser]);

  // ── Filter everything client-side (instant, no debounce) ──
  const navResults = useMemo(
    () => allNavItems.filter((i) => matchesQuery(i.searchText, query)),
    [allNavItems, query],
  );

  const nodeResults = useMemo(
    () =>
      query.length >= 2
        ? nodeItems.filter((i) => matchesQuery(i.searchText, query))
        : [],
    [nodeItems, query],
  );

  const hostResults = useMemo(
    () =>
      query.length >= 2
        ? hostItems.filter((i) => matchesQuery(i.searchText, query))
        : [],
    [hostItems, query],
  );

  // ── Combined flat list for keyboard navigation ──
  const flatResults = useMemo(
    () => [...navResults, ...nodeResults, ...hostResults],
    [navResults, nodeResults, hostResults],
  );

  const clampedIndex = Math.min(
    activeIndex,
    Math.max(0, flatResults.length - 1),
  );

  const navigate = useCallback(
    (href: string) => {
      setIsOpen(false);
      router.push(href);
    },
    [router],
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults[clampedIndex]) navigate(flatResults[clampedIndex].href);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('[data-active="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [clampedIndex]);

  // ── Derived state ──
  const hasQuery = query.length >= 2;
  const noResults =
    hasQuery &&
    !isLoading &&
    nodeResults.length === 0 &&
    hostResults.length === 0 &&
    navResults.length === 0;

  // ── Render a result row ──
  function ResultRow({ item, index }: { item: ResultItem; index: number }) {
    const Icon = item.icon;
    const isActive = index === clampedIndex;
    return (
      <button
        key={item.id}
        data-active={isActive}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => navigate(item.href)}
        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
          isActive ? 'bg-accent' : ''
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.label}</p>
          {item.sublabel && (
            <p className="truncate text-xs text-muted-foreground">
              {item.sublabel}
            </p>
          )}
        </div>
        {isActive && (
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
    );
  }

  // ── Render a section ──
  function Section({
    title,
    items,
    startIndex,
  }: {
    title: string;
    items: ResultItem[];
    startIndex: number;
  }) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="mt-2 px-2 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {title} ({items.length})
        </p>
        {items.map((item, i) => (
          <ResultRow key={item.id} item={item} index={startIndex + i} />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={openPalette}
        className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search nodes, hosts...</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      {/* Modal — portalled to body */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]" onKeyDown={handleKeyDown}>
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-background/30"
              onClick={() => setIsOpen(false)}
            />

            {/* Dialog */}
            <div
              className="absolute w-full max-w-lg px-4"
              style={{
                top: dropdownPos?.top ?? 56,
                right: dropdownPos?.right ?? 16,
              }}
            >
              <div className="overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
                {/* Search input */}
                <div className="flex items-center gap-2 border-b border-border px-4">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, IP, peer ID, version, org..."
                    className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="max-h-96 overflow-auto p-2">
                  {/* Initial state: no query, show nav + hint */}
                  {!hasQuery && (
                    <>
                      <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Navigation
                      </p>
                      {navResults.map((item, i) => (
                        <ResultRow key={item.id} item={item} index={i} />
                      ))}
                      {isLoading && (
                        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading data for search...
                        </div>
                      )}
                      {!isLoading && (
                        <p className="mt-3 px-2 py-3 text-center text-[10px] text-muted-foreground/50">
                          Type 2+ characters to search{' '}
                          {(allNodes?.length ?? 0) + (allHosts?.length ?? 0) > 0
                            ? `across ${allNodes?.length ?? 0} nodes and ${allHosts?.length ?? 0} hosts`
                            : 'nodes, hosts, and more'}
                        </p>
                      )}
                    </>
                  )}

                  {/* No results */}
                  {noResults && (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No results found
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/50">
                        Try a different term — names, IPs, peer IDs, versions,
                        orgs, hosts, and regions are all searchable
                      </p>
                    </div>
                  )}

                  {/* Search results */}
                  {hasQuery && (
                    <>
                      {navResults.length > 0 && (
                        <Section
                          title="Navigation"
                          items={navResults}
                          startIndex={0}
                        />
                      )}
                      {nodeResults.length > 0 && (
                        <Section
                          title="Nodes"
                          items={nodeResults}
                          startIndex={navResults.length}
                        />
                      )}
                      {hostResults.length > 0 && (
                        <Section
                          title="Hosts"
                          items={hostResults}
                          startIndex={navResults.length + nodeResults.length}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
                      ↑↓
                    </kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
                      ↵
                    </kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
                      esc
                    </kbd>
                    close
                  </span>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
