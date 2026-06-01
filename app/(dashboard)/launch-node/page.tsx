'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { protocolClient } from '@modules/grpc/clients/protocolClient';
import { hostClient } from '@modules/grpc/clients/hostClient';
import { imageClient } from '@modules/grpc/clients/imageClient';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { friendlyError } from '@/lib/friendly-error';
import { useOrganizations } from '@/lib/hooks/use-organizations';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { UiType } from '@modules/grpc/library/blockjoy/common/v1/protocol';
import {
  FirewallProtocol,
  FirewallDirection,
  FirewallAction,
} from '@modules/grpc/library/blockjoy/common/v1/config';
import type {
  FirewallRule,
  IpName,
  PortName,
} from '@modules/grpc/library/blockjoy/common/v1/config';
import type { ImageProperty } from '@modules/grpc/library/blockjoy/v1/image';
import type {
  Protocol,
  ProtocolVersion,
} from '@modules/grpc/library/blockjoy/v1/protocol';
import type { RegionInfo, Host } from '@modules/grpc/library/blockjoy/v1/host';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SearchInput } from '@/components/ui/search-input';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  Plus,
  Rocket,
  Server,
  Shield,
  HardDrive,
  MapPin,
  Globe,
  Settings,
  Trash2,
} from 'lucide-react';

/* ================================================================== */
/*  Main Page                                                          */
/* ================================================================== */

export default function LaunchNodePage() {
  const router = useRouter();
  const { defaultOrg, organizations } = useOrganizations();
  const { isSuperUser } = usePermissions();
  const scrollRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(
    null,
  );
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] =
    useState<ProtocolVersion | null>(null);
  const [hostCounts, setHostCounts] = useState<Record<string, number>>({});
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(1);
  const [firewallRules, setFirewallRules] = useState<any[]>([]);
  const [nodeProperties, setNodeProperties] = useState<any[]>([]);

  // Init org
  useEffect(() => {
    if (defaultOrg?.orgId && !selectedOrgId) {
      setSelectedOrgId(defaultOrg.orgId);
    }
  }, [defaultOrg?.orgId, selectedOrgId]);

  const orgId = selectedOrgId ?? defaultOrg?.orgId ?? '';
  const selectedOrgName =
    organizations.find((o) => o.orgId === orgId)?.name ??
    defaultOrg?.name ??
    '';

  // Scroll right when a new panel opens
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          left: scrollRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }, 50);
    }
  }, [selectedProtocol, selectedVariant, selectedVersion]);

  // Reset downstream when org changes
  const handleOrgChange = useCallback((newOrgId: string) => {
    setSelectedOrgId(newOrgId);
    setSelectedProtocol(null);
    setSelectedVariant(null);
    setSelectedVersion(null);
    setHostCounts({});
    setSelectedRegionId(null);
    setNodeCount(1);
    setNodeProperties([]);
  }, []);

  const handleSelectProtocol = useCallback((protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setSelectedVariant(null);
    setSelectedVersion(null);
    setHostCounts({});
    setSelectedRegionId(null);
    setNodeCount(1);
    setNodeProperties([]);
  }, []);

  const handleSelectVariant = useCallback((variant: string) => {
    setSelectedVariant(variant);
    setSelectedVersion(null);
    setHostCounts({});
    setSelectedRegionId(null);
    setNodeCount(1);
    setNodeProperties([]);
  }, []);

  const handleSelectVersion = useCallback((version: ProtocolVersion) => {
    setSelectedVersion(version);
    setHostCounts({});
    setSelectedRegionId(null);
    setNodeCount(1);
    setNodeProperties([]);
  }, []);

  // Protocols
  const { data: protocolsResponse, isLoading: loadingProtocols } = useQuery({
    queryKey: ['protocols', orgId],
    queryFn: () => protocolClient.listProtocols(orgId || undefined),
    enabled: Boolean(orgId),
  });
  // Load-balancer offerings (protocol key `load-balancer`) are launched from the
  // Load Balancers page, not as plain nodes, so exclude them here. The legacy
  // `loadbalancer` (no hyphen) eRPC node stays a normal launchable protocol.
  const protocols = (protocolsResponse?.protocols ?? []).filter(
    (p) => p.key !== 'load-balancer',
  );

  // Loading gate
  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Launch Node</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select an organization, protocol, and configuration to deploy.
        </p>
      </div>

      {/* Horizontal scrolling panel container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Panel 1: Org + Protocol */}
        <div className="w-72 shrink-0">
          <PanelOrgAndProtocol
            orgId={orgId}
            orgName={selectedOrgName}
            isSuperUser={isSuperUser}
            organizations={organizations}
            onOrgChange={handleOrgChange}
            protocols={protocols}
            isLoading={loadingProtocols}
            selectedProtocolId={selectedProtocol?.protocolId ?? null}
            onSelectProtocol={handleSelectProtocol}
          />
        </div>

        {/* Panel 2: Configure (variant + version) */}
        {selectedProtocol && (
          <div className="w-72 shrink-0">
            <PanelConfigure
              protocol={selectedProtocol}
              orgId={orgId}
              selectedVariant={selectedVariant}
              selectedVersion={selectedVersion}
              onSelectVariant={handleSelectVariant}
              onSelectVersion={handleSelectVersion}
              firewallRules={firewallRules}
              setFirewallRules={setFirewallRules}
              nodeProperties={nodeProperties}
              setNodeProperties={setNodeProperties}
            />
          </div>
        )}

        {/* Panel 3: Host/Region selection + Launch */}
        {selectedProtocol && selectedVariant && selectedVersion && (
          <div className="w-80 shrink-0">
            <PanelLaunch
              protocol={selectedProtocol}
              variant={selectedVariant}
              version={selectedVersion}
              orgId={orgId}
              orgName={selectedOrgName}
              isSuperUser={isSuperUser}
              hostCounts={hostCounts}
              setHostCounts={setHostCounts}
              selectedRegionId={selectedRegionId}
              setSelectedRegionId={setSelectedRegionId}
              nodeCount={nodeCount}
              setNodeCount={setNodeCount}
              firewallRules={firewallRules}
              nodeProperties={nodeProperties}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Panel 1: Org selector + Protocol list                              */
/* ================================================================== */

function PanelOrgAndProtocol({
  orgId,
  orgName,
  isSuperUser,
  organizations,
  onOrgChange,
  protocols,
  isLoading,
  selectedProtocolId,
  onSelectProtocol,
}: {
  orgId: string;
  orgName: string;
  isSuperUser: boolean;
  organizations: any[];
  onOrgChange: (id: string) => void;
  protocols: Protocol[];
  isLoading: boolean;
  selectedProtocolId: string | null;
  onSelectProtocol: (p: Protocol) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = protocols.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Org selector */}
      <div className="border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Organization
            </p>
            {isSuperUser ? (
              <select
                value={orgId}
                onChange={(e) => onOrgChange(e.target.value)}
                className="w-full bg-transparent text-sm font-medium outline-none cursor-pointer"
              >
                {organizations.map((org: any) => (
                  <option key={org.orgId} value={org.orgId}>
                    {org.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="truncate text-sm font-medium">{orgName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Protocol header + search */}
      <div className="border-b border-border p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Protocol
        </p>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search..."
          className="w-full"
          debounceMs={150}
        />
      </div>

      {/* Protocol list */}
      <div className="flex-1 overflow-auto p-2" style={{ maxHeight: '420px' }}>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {search ? 'No match' : 'No protocols'}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((p) => {
              const isActive = selectedProtocolId === p.protocolId;
              return (
                <button
                  key={p.protocolId}
                  onClick={() => onSelectProtocol(p)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.ticker && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {p.ticker}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Panel 2: Configure (variant + version)                             */
/* ================================================================== */

function PanelConfigure({
  protocol,
  orgId,
  selectedVariant,
  selectedVersion,
  onSelectVariant,
  onSelectVersion,
  firewallRules,
  setFirewallRules,
  nodeProperties,
  setNodeProperties,
}: {
  protocol: Protocol;
  orgId: string;
  selectedVariant: string | null;
  selectedVersion: ProtocolVersion | null;
  onSelectVariant: (v: string) => void;
  onSelectVersion: (v: ProtocolVersion) => void;
  firewallRules: any[];
  setFirewallRules: React.Dispatch<React.SetStateAction<any[]>>;
  nodeProperties: any[];
  setNodeProperties: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Extract metadata tuples from protocol.versions
  const versionMeta = useMemo(() => {
    const versions = protocol.versions ?? [];
    return versions.map((v) => {
      const map: Record<string, string> = {};
      (v.metadata ?? []).forEach((m) => {
        map[m.metadataKey] = m.value;
      });
      return {
        version: v,
        nodeType: map['node-type'] ?? '',
        network: map['network'] ?? '',
        client: map['client'] ?? '',
      };
    });
  }, [protocol.versions]);

  // Determine which segments have options (more than one unique value, or at least one non-empty value)
  const allNodeTypes = useMemo(
    () => [...new Set(versionMeta.map((m) => m.nodeType).filter(Boolean))],
    [versionMeta],
  );
  const hasNodeTypes = allNodeTypes.length > 0;

  // Networks: filtered by selected nodeType (cascading)
  const availableNetworks = useMemo(() => {
    let filtered = versionMeta;
    if (selectedNodeType) {
      filtered = filtered.filter((m) => m.nodeType === selectedNodeType);
    }
    return [...new Set(filtered.map((m) => m.network).filter(Boolean))];
  }, [versionMeta, selectedNodeType]);
  const hasNetworks = availableNetworks.length > 0;

  // Clients: filtered by selected nodeType + network (cascading)
  const availableClients = useMemo(() => {
    let filtered = versionMeta;
    if (selectedNodeType) {
      filtered = filtered.filter((m) => m.nodeType === selectedNodeType);
    }
    if (selectedNetwork) {
      filtered = filtered.filter((m) => m.network === selectedNetwork);
    }
    return [...new Set(filtered.map((m) => m.client).filter(Boolean))];
  }, [versionMeta, selectedNodeType, selectedNetwork]);
  const hasClients = availableClients.length > 0;

  // Auto-select when only one option
  useEffect(() => {
    if (allNodeTypes.length === 1 && !selectedNodeType) {
      setSelectedNodeType(allNodeTypes[0]);
    }
  }, [allNodeTypes, selectedNodeType]);

  useEffect(() => {
    if (availableNetworks.length === 1 && !selectedNetwork) {
      setSelectedNetwork(availableNetworks[0]);
    }
  }, [availableNetworks, selectedNetwork]);

  useEffect(() => {
    if (availableClients.length === 1 && !selectedClient) {
      setSelectedClient(availableClients[0]);
    }
  }, [availableClients, selectedClient]);

  // Reset downstream selections when upstream changes
  const handleSelectNodeType = useCallback(
    (nt: string) => {
      setSelectedNodeType(nt);
      setSelectedNetwork(null);
      setSelectedClient(null);
      onSelectVariant('');
      onSelectVersion(null as any);
    },
    [onSelectVariant, onSelectVersion],
  );

  const handleSelectNetwork = useCallback(
    (nw: string) => {
      setSelectedNetwork(nw);
      setSelectedClient(null);
      onSelectVariant('');
      onSelectVersion(null as any);
    },
    [onSelectVariant, onSelectVersion],
  );

  const handleSelectClient = useCallback(
    (cl: string) => {
      setSelectedClient(cl);
      onSelectVariant('');
      onSelectVersion(null as any);
    },
    [onSelectVariant, onSelectVersion],
  );

  // Determine if all required segments are selected
  const allSegmentsSelected = useMemo(() => {
    if (hasNodeTypes && !selectedNodeType) return false;
    if (hasNetworks && !selectedNetwork) return false;
    if (hasClients && !selectedClient) return false;
    return hasNodeTypes || hasNetworks || hasClients;
  }, [
    hasNodeTypes,
    hasNetworks,
    hasClients,
    selectedNodeType,
    selectedNetwork,
    selectedClient,
  ]);

  // Compose variant key: {client}-{network}-{nodeType}
  const composedVariant = useMemo(() => {
    if (!allSegmentsSelected) return null;
    const parts = [
      selectedClient || '',
      selectedNetwork || '',
      selectedNodeType || '',
    ].filter(Boolean);
    return parts.join('-');
  }, [allSegmentsSelected, selectedClient, selectedNetwork, selectedNodeType]);

  // Push composed variant up when it changes
  useEffect(() => {
    if (composedVariant && composedVariant !== selectedVariant) {
      onSelectVariant(composedVariant);
    }
  }, [composedVariant, selectedVariant, onSelectVariant]);

  // Fetch versions for the composed variant
  const {
    data: versions = [],
    isLoading: loadingVersions,
    error: versionsError,
  } = useQuery({
    queryKey: ['versions', protocol.key, composedVariant, orgId],
    queryFn: () =>
      protocolClient.listVersions({
        versionKey: {
          protocolKey: protocol.key,
          variantKey: composedVariant!,
        },
        orgId,
      }),
    enabled: Boolean(protocol.key && composedVariant),
  });

  // Sort versions by semver descending (newest first)
  const sortedVersions = useMemo(() => {
    if (!versions.length) return [];
    const toNums = (raw: string) =>
      raw.split('.').map((s) => +s.replace(/\D/g, '') || 0);
    return [...versions].sort((a, b) => {
      const va = toNums(a.semanticVersion);
      const vb = toNums(b.semanticVersion);
      const len = Math.max(va.length, vb.length);
      for (let i = 0; i < len; i++) {
        const diff = (vb[i] ?? 0) - (va[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
  }, [versions]);

  // Auto-select newest version
  useEffect(() => {
    if (sortedVersions.length > 0 && !selectedVersion) {
      onSelectVersion(sortedVersions[0]);
    }
  }, [sortedVersions, selectedVersion, onSelectVersion]);

  // Resolve image for dynamic properties
  const { data: configImageData } = useQuery({
    queryKey: [
      'configImage',
      protocol.key,
      composedVariant,
      selectedVersion?.semanticVersion,
      orgId,
    ],
    queryFn: async () => {
      const response = await imageClient.getImage({
        versionKey: { protocolKey: protocol.key, variantKey: composedVariant! },
        orgId,
        semanticVersion: selectedVersion!.semanticVersion,
      });
      return response.image;
    },
    enabled: Boolean(composedVariant && selectedVersion),
  });

  // Extract dynamic properties from resolved image
  useEffect(() => {
    if (!configImageData?.properties) {
      setNodeProperties([]);
      return;
    }

    const props: any[] = [];
    const processedKeys = new Set<string>();

    // Individual properties (no keyGroup)
    configImageData.properties
      .filter((p: ImageProperty) => !p.keyGroup)
      .forEach((p: ImageProperty) => {
        processedKeys.add(p.key);
        props.push({
          key: p.key,
          uiType: p.uiType,
          value: p.defaultValue || '',
          displayName: p.displayName || p.key,
          displayGroup: p.displayGroup,
          description: p.description,
          properties: [p],
        });
      });

    // Grouped properties (keyGroup)
    const keyGroups = [
      ...new Set(
        configImageData.properties
          .filter((p: ImageProperty) => p.keyGroup && !processedKeys.has(p.key))
          .map((p: ImageProperty) => p.keyGroup),
      ),
    ];

    keyGroups.forEach((keyGroup) => {
      const groupProps = configImageData.properties!.filter(
        (p: ImageProperty) =>
          p.keyGroup === keyGroup && !processedKeys.has(p.key),
      );
      groupProps.forEach((p: ImageProperty) => processedKeys.add(p.key));
      const defaultProp =
        groupProps.find((p: ImageProperty) => p.isGroupDefault) ||
        groupProps[0];
      if (defaultProp) {
        props.push({
          key: defaultProp.key,
          keyGroup,
          uiType: defaultProp.uiType,
          value: defaultProp.defaultValue || '',
          displayName: defaultProp.displayName || defaultProp.key,
          displayGroup: defaultProp.displayGroup || keyGroup,
          description: defaultProp.description,
          properties: groupProps,
        });
      }
    });

    setNodeProperties(props);
  }, [configImageData, setNodeProperties]);

  // Firewall rule helpers
  const addFirewallRule = () => {
    setFirewallRules((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        protocol: FirewallProtocol.FIREWALL_PROTOCOL_TCP,
        direction: FirewallDirection.FIREWALL_DIRECTION_INBOUND,
        action: FirewallAction.FIREWALL_ACTION_ALLOW,
        ips: [{ ip: '', name: '' }],
        ports: [{ port: 0, name: '' }],
      },
    ]);
  };

  const removeFirewallRule = (index: number) => {
    setFirewallRules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFirewallRule = (index: number, field: string, value: any) => {
    setFirewallRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule)),
    );
  };

  // Pill selector component
  const PillSelector = ({
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: string[];
    selected: string | null;
    onSelect: (v: string) => void;
  }) => (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isActive = selected === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent/60 text-foreground hover:bg-accent'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Configure
        </p>
        <p className="mt-0.5 text-sm font-medium">{protocol.name}</p>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Segment selectors */}
        {hasNodeTypes && (
          <PillSelector
            label="Node Type"
            options={allNodeTypes}
            selected={selectedNodeType}
            onSelect={handleSelectNodeType}
          />
        )}

        {hasNetworks && selectedNodeType && (
          <PillSelector
            label="Network"
            options={availableNetworks}
            selected={selectedNetwork}
            onSelect={handleSelectNetwork}
          />
        )}

        {hasClients && selectedNodeType && selectedNetwork && (
          <PillSelector
            label="Client"
            options={availableClients}
            selected={selectedClient}
            onSelect={handleSelectClient}
          />
        )}

        {/* Version selector */}
        {composedVariant && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Version</p>
            {loadingVersions ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : versionsError ? (
              <p className="text-xs text-destructive">
                {friendlyError(versionsError)}
              </p>
            ) : versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No versions</p>
            ) : (
              <select
                value={selectedVersion?.semanticVersion ?? ''}
                onChange={(e) => {
                  const ver = sortedVersions.find(
                    (v) => v.semanticVersion === e.target.value,
                  );
                  if (ver) onSelectVersion(ver);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {sortedVersions.map((ver) => (
                  <option key={ver.semanticVersion} value={ver.semanticVersion}>
                    {ver.semanticVersion}
                    {ver.description ? ` — ${ver.description}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Ready indicator */}
        {composedVariant && selectedVersion && (
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            <Check className="h-3.5 w-3.5" />
            Ready to configure launch
          </div>
        )}

        <Separator />

        {/* Advanced Configuration */}
        <div>
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex w-full items-center justify-between py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Advanced Configuration
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {advancedOpen && (
            <div className="mt-3 space-y-4">
              {/* Version override note */}
              {/* Dynamic image properties */}
              {nodeProperties.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Configuration
                  </p>
                  {nodeProperties.map((prop, idx) => {
                    if (prop.uiType === UiType.UI_TYPE_SWITCH) {
                      // Switch/checkbox
                      return (
                        <label
                          key={prop.key}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={prop.value === 'true'}
                            onChange={(e) => {
                              const next = [...nodeProperties];
                              next[idx] = {
                                ...prop,
                                value: e.target.checked ? 'true' : 'false',
                              };
                              setNodeProperties(next);
                            }}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="text-xs">{prop.displayName}</span>
                          {prop.description && (
                            <span className="text-[10px] text-muted-foreground">
                              &mdash; {prop.description}
                            </span>
                          )}
                        </label>
                      );
                    }
                    if (
                      prop.uiType === UiType.UI_TYPE_TEXT ||
                      prop.uiType === UiType.UI_TYPE_PASSWORD
                    ) {
                      // Text or password
                      return (
                        <div key={prop.key} className="space-y-1">
                          <label className="text-xs font-medium">
                            {prop.displayGroup || prop.displayName}
                          </label>
                          {prop.description && (
                            <p className="text-[10px] text-muted-foreground">
                              {prop.description}
                            </p>
                          )}
                          <input
                            type={
                              prop.uiType === UiType.UI_TYPE_PASSWORD
                                ? 'password'
                                : 'text'
                            }
                            value={prop.value}
                            onChange={(e) => {
                              const next = [...nodeProperties];
                              next[idx] = { ...prop, value: e.target.value };
                              setNodeProperties(next);
                            }}
                            placeholder={prop.displayName}
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      );
                    }
                    if (
                      prop.uiType === UiType.UI_TYPE_ENUM &&
                      prop.properties?.length > 1
                    ) {
                      // Enum — pill selector from grouped properties
                      return (
                        <div key={prop.key} className="space-y-1">
                          <label className="text-xs font-medium">
                            {prop.displayGroup || prop.displayName}
                          </label>
                          {prop.description && (
                            <p className="text-[10px] text-muted-foreground">
                              {prop.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {prop.properties.map((option: any) => (
                              <button
                                key={option.key}
                                onClick={() => {
                                  const next = [...nodeProperties];
                                  next[idx] = {
                                    ...prop,
                                    key: option.key,
                                    value: option.defaultValue || '',
                                  };
                                  setNodeProperties(next);
                                }}
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                                  prop.key === option.key
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-accent/60 hover:bg-accent'
                                }`}
                              >
                                {option.displayName || option.key}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {/* Firewall rules */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    Firewall Rules
                  </p>
                  <button
                    onClick={addFirewallRule}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add Rule
                  </button>
                </div>

                {firewallRules.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60">
                    No firewall rules configured. Default rules will apply.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {firewallRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-border bg-background p-2 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <select
                            value={rule.protocol}
                            onChange={(e) =>
                              updateFirewallRule(
                                idx,
                                'protocol',
                                Number(e.target.value),
                              )
                            }
                            className="h-7 flex-1 rounded border border-input bg-background px-1.5 text-[11px] outline-none"
                          >
                            <option
                              value={FirewallProtocol.FIREWALL_PROTOCOL_TCP}
                            >
                              TCP
                            </option>
                            <option
                              value={FirewallProtocol.FIREWALL_PROTOCOL_UDP}
                            >
                              UDP
                            </option>
                            <option
                              value={FirewallProtocol.FIREWALL_PROTOCOL_BOTH}
                            >
                              Both
                            </option>
                          </select>
                          <select
                            value={rule.direction}
                            onChange={(e) =>
                              updateFirewallRule(
                                idx,
                                'direction',
                                Number(e.target.value),
                              )
                            }
                            className="h-7 flex-1 rounded border border-input bg-background px-1.5 text-[11px] outline-none"
                          >
                            <option
                              value={
                                FirewallDirection.FIREWALL_DIRECTION_INBOUND
                              }
                            >
                              Inbound
                            </option>
                            <option
                              value={
                                FirewallDirection.FIREWALL_DIRECTION_OUTBOUND
                              }
                            >
                              Outbound
                            </option>
                          </select>
                          <select
                            value={rule.action}
                            onChange={(e) =>
                              updateFirewallRule(
                                idx,
                                'action',
                                Number(e.target.value),
                              )
                            }
                            className="h-7 flex-1 rounded border border-input bg-background px-1.5 text-[11px] outline-none"
                          >
                            <option
                              value={FirewallAction.FIREWALL_ACTION_ALLOW}
                            >
                              Allow
                            </option>
                            <option value={FirewallAction.FIREWALL_ACTION_DROP}>
                              Drop
                            </option>
                            <option
                              value={FirewallAction.FIREWALL_ACTION_REJECT}
                            >
                              Reject
                            </option>
                          </select>
                          <button
                            onClick={() => removeFirewallRule(idx)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="IP (e.g. 0.0.0.0/0)"
                            value={rule.ips?.[0]?.ip ?? ''}
                            onChange={(e) =>
                              updateFirewallRule(idx, 'ips', [
                                { ip: e.target.value, name: '' },
                              ])
                            }
                            className="h-7 flex-1 rounded border border-input bg-background px-2 text-[11px] outline-none placeholder:text-muted-foreground/50"
                          />
                          <input
                            type="number"
                            placeholder="Port"
                            value={rule.ports?.[0]?.port || ''}
                            onChange={(e) => {
                              const portNum = parseInt(e.target.value, 10);
                              updateFirewallRule(idx, 'ports', [
                                {
                                  port: isNaN(portNum) ? 0 : portNum,
                                  name: '',
                                },
                              ]);
                            }}
                            className="h-7 w-16 shrink-0 rounded border border-input bg-background px-2 text-[11px] outline-none placeholder:text-muted-foreground/50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Panel 3: Host/Region selection + Launch button                     */
/* ================================================================== */

function PanelLaunch({
  protocol,
  variant,
  version,
  orgId,
  orgName,
  isSuperUser,
  hostCounts,
  setHostCounts,
  selectedRegionId,
  setSelectedRegionId,
  nodeCount,
  setNodeCount,
  firewallRules,
  nodeProperties,
}: {
  protocol: Protocol;
  variant: string;
  version: ProtocolVersion;
  orgId: string;
  orgName: string;
  isSuperUser: boolean;
  hostCounts: Record<string, number>;
  setHostCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  selectedRegionId: string | null;
  setSelectedRegionId: (id: string | null) => void;
  nodeCount: number;
  setNodeCount: React.Dispatch<React.SetStateAction<number>>;
  firewallRules: any[];
  nodeProperties: any[];
}) {
  const router = useRouter();
  const [imageId, setImageId] = useState<string | null>(null);

  const imageOrgId = isSuperUser ? undefined : orgId;

  // Resolve image
  const {
    data: imageData,
    isLoading: loadingImage,
    error: imageError,
  } = useQuery({
    queryKey: [
      'image',
      protocol.key,
      variant,
      version.semanticVersion,
      imageOrgId,
    ],
    queryFn: async () => {
      const response = await imageClient.getImage({
        versionKey: { protocolKey: protocol.key, variantKey: variant },
        orgId: imageOrgId,
        semanticVersion: version.semanticVersion,
      });
      return response.image;
    },
    enabled: Boolean(protocol.key && variant && version.semanticVersion),
  });

  useEffect(() => {
    if (imageData?.imageId) setImageId(imageData.imageId);
  }, [imageData]);

  // Superuser: fetch hosts
  const { data: hosts = [], isLoading: loadingHosts } = useQuery({
    queryKey: ['launchHosts', isSuperUser ? 'all' : orgId],
    queryFn: async () => {
      const response = await hostClient.listHosts(
        isSuperUser ? undefined : orgId,
        undefined,
        { currentPage: 0, itemsPerPage: 1000 },
      );
      return response.hosts ?? [];
    },
    enabled: isSuperUser && Boolean(imageId),
  });

  // Regular user: fetch regions
  const {
    data: regions = [],
    isLoading: loadingRegions,
    error: regionsError,
  } = useQuery({
    queryKey: ['regions', orgId, imageId],
    queryFn: () => hostClient.listRegions(orgId, imageId!),
    enabled: !isSuperUser && Boolean(orgId && imageId),
  });

  // Auto-select first region
  useEffect(() => {
    if (!isSuperUser && regions.length > 0 && !selectedRegionId) {
      setSelectedRegionId(regions[0].region?.regionId ?? null);
    }
  }, [regions, selectedRegionId, isSuperUser, setSelectedRegionId]);

  const selectedRegion = useMemo(
    () => regions.find((r) => r.region?.regionId === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  );

  const toggleHost = (hostId: string) => {
    setHostCounts((prev) => {
      if (prev[hostId] !== undefined) {
        const next = { ...prev };
        delete next[hostId];
        return next;
      }
      return { ...prev, [hostId]: 1 };
    });
  };

  const updateHostCount = (hostId: string, count: number, maxIps: number) => {
    setHostCounts((prev) => ({
      ...prev,
      [hostId]: Math.max(1, Math.min(count, maxIps)),
    }));
  };

  const getHostFreeIps = (host: any) => {
    const total = host.ipAddresses?.length ?? 0;
    const assigned =
      host.ipAddresses?.filter((ip: any) => ip.assigned)?.length ?? 0;
    return total - assigned;
  };

  const totalNodesFromHosts = Object.values(hostCounts).reduce(
    (s, c) => s + c,
    0,
  );

  // Launch
  const launchMutation = useMutation({
    mutationFn: async () => {
      if (!imageId) throw new Error('Image not resolved');

      let launcher;
      if (isSuperUser) {
        const entries = Object.entries(hostCounts).filter(([, c]) => c > 0);
        if (entries.length === 0) throw new Error('Select at least one host');
        launcher = {
          byHost: {
            hostCounts: entries.map(([hostId, nc]) => ({
              hostId,
              nodeCount: nc,
            })),
          },
        };
      } else {
        if (!selectedRegionId) throw new Error('Select a region');
        launcher = {
          byRegion: {
            regionCounts: [{ regionId: selectedRegionId, nodeCount }],
          },
        };
      }

      return await nodeClient.createNode({
        orgId,
        imageId,
        launcher,
        newValues: nodeProperties
          .filter((p) => p.value)
          .map((p) => ({ key: p.key, value: p.value })),
        addRules: firewallRules,
      });
    },
    onSuccess: (node) => {
      const total = isSuperUser ? totalNodesFromHosts : nodeCount;
      if (total === 1 && node?.nodeId) {
        router.push(`/nodes/${node.nodeId}`);
      } else {
        router.push('/nodes');
      }
    },
  });

  const canLaunch = isSuperUser
    ? Boolean(imageId && totalNodesFromHosts > 0 && !launchMutation.isPending)
    : Boolean(
        imageId &&
        selectedRegionId &&
        nodeCount >= 1 &&
        !launchMutation.isPending,
      );

  const isLoadingAny =
    loadingImage || (isSuperUser ? loadingHosts : loadingRegions);
  const totalNodes = isSuperUser ? totalNodesFromHosts : nodeCount;

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="border-b border-border p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {isSuperUser ? 'Select Hosts' : 'Select Region'}
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {protocol.name} · {variant} · {version.semanticVersion}
        </p>
      </div>

      <div
        className="flex-1 overflow-auto p-3 space-y-3"
        style={{ maxHeight: '380px' }}
      >
        {/* Loading image */}
        {loadingImage && (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Resolving image...
          </div>
        )}

        {imageError && (
          <p className="text-xs text-destructive">
            Image error: {friendlyError(imageError)}
          </p>
        )}

        {/* SUPERUSER: Host list */}
        {isSuperUser && imageId && (
          <>
            {loadingHosts ? (
              <div className="space-y-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : hosts.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No hosts available
              </p>
            ) : (
              <div className="space-y-1">
                {hosts.map((host: any) => {
                  const freeIps = getHostFreeIps(host);
                  const isSelected = hostCounts[host.hostId] !== undefined;
                  const count = hostCounts[host.hostId] ?? 0;
                  const hasCapacity = freeIps > 0;

                  return (
                    <div
                      key={host.hostId}
                      className={`rounded-md border p-2.5 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : hasCapacity
                            ? 'border-border hover:bg-accent/30'
                            : 'border-border opacity-35'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => hasCapacity && toggleHost(host.hostId)}
                          disabled={!hasCapacity}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[10px] ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input'
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {host.displayName || host.networkName || 'Unnamed'}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {host.ipAddress} · {freeIps} free
                            {host.region?.displayName
                              ? ` · ${host.region.displayName}`
                              : ''}
                          </p>
                        </div>
                        {/* Count selector */}
                        {isSelected && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                updateHostCount(host.hostId, count - 1, freeIps)
                              }
                              disabled={count <= 1}
                              className="h-6 w-6 rounded border border-border text-[10px] hover:bg-accent disabled:opacity-40"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={freeIps}
                              value={count}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v))
                                  updateHostCount(host.hostId, v, freeIps);
                              }}
                              className="h-6 w-10 rounded border border-input bg-background text-center text-[10px] outline-none"
                            />
                            <button
                              onClick={() =>
                                updateHostCount(host.hostId, count + 1, freeIps)
                              }
                              disabled={count >= freeIps}
                              className="h-6 w-6 rounded border border-border text-[10px] hover:bg-accent disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* REGULAR USER: Region selector */}
        {!isSuperUser && imageId && (
          <>
            {loadingRegions ? (
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : regionsError ? (
              <p className="text-xs text-destructive">
                {friendlyError(regionsError)}
              </p>
            ) : regions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No regions available
              </p>
            ) : (
              <div className="space-y-1">
                {regions.map((ri: RegionInfo) => {
                  const region = ri.region;
                  if (!region) return null;
                  const isActive = selectedRegionId === region.regionId;
                  const hasCapacity = ri.freeIps > 0;
                  return (
                    <button
                      key={region.regionId}
                      onClick={() =>
                        hasCapacity && setSelectedRegionId(region.regionId)
                      }
                      disabled={!hasCapacity}
                      className={`flex w-full items-center gap-2 rounded-md border p-2.5 text-left text-xs transition-colors ${
                        !hasCapacity
                          ? 'border-border opacity-35'
                          : isActive
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-accent/30'
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {region.displayName || region.regionKey}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {ri.validHosts} host{ri.validHosts !== 1 ? 's' : ''} ·{' '}
                          {ri.freeIps} free
                        </p>
                      </div>
                      {isActive && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Node count */}
            {selectedRegionId && selectedRegion && (
              <div className="pt-1">
                <p className="mb-1.5 text-xs text-muted-foreground">
                  Nodes to launch
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNodeCount((c) => Math.max(1, c - 1))}
                    disabled={nodeCount <= 1}
                    className="h-8 w-8 rounded border border-border text-xs hover:bg-accent disabled:opacity-40"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={selectedRegion.freeIps}
                    value={nodeCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1)
                        setNodeCount(Math.min(v, selectedRegion.freeIps));
                    }}
                    className="h-8 w-16 rounded border border-input bg-background text-center text-sm outline-none"
                  />
                  <button
                    onClick={() =>
                      setNodeCount((c) =>
                        Math.min(c + 1, selectedRegion.freeIps),
                      )
                    }
                    disabled={nodeCount >= selectedRegion.freeIps}
                    className="h-8 w-8 rounded border border-border text-xs hover:bg-accent disabled:opacity-40"
                  >
                    +
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    of {selectedRegion.freeIps}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer: summary + launch button */}
      <div className="border-t border-border p-3 space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
          <span className="text-muted-foreground">Org</span>
          <span className="truncate font-medium">{orgName}</span>
          <span className="text-muted-foreground">Protocol</span>
          <span className="font-medium">{protocol.name}</span>
          <span className="text-muted-foreground">Variant</span>
          <span className="truncate font-medium">{variant}</span>
          <span className="text-muted-foreground">Version</span>
          <span className="font-medium">{version.semanticVersion}</span>
          {isSuperUser ? (
            <>
              <span className="text-muted-foreground">Hosts</span>
              <span className="font-medium">
                {Object.keys(hostCounts).length} selected
              </span>
              <span className="text-muted-foreground">Total nodes</span>
              <span className="font-medium">{totalNodesFromHosts}</span>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Region</span>
              <span className="truncate font-medium">
                {selectedRegion?.region?.displayName ?? '—'}
              </span>
              <span className="text-muted-foreground">Nodes</span>
              <span className="font-medium">{nodeCount}</span>
            </>
          )}
        </div>

        {/* Error */}
        {launchMutation.isError && (
          <p className="text-[11px] text-destructive">
            {friendlyError(launchMutation.error)}
          </p>
        )}

        {/* Launch button */}
        <Button
          className="w-full gap-2"
          disabled={!canLaunch}
          onClick={() => launchMutation.mutate()}
        >
          {launchMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Launch {totalNodes > 1 ? `${totalNodes} Nodes` : 'Node'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
