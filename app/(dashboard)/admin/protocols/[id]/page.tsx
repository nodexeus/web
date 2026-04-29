'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { protocolClient } from '@modules/grpc/clients/protocolClient';
import { Visibility } from '@modules/grpc/library/blockjoy/common/v1/protocol';
import { friendlyError } from '@/lib/friendly-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Blocks,
  Calendar,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Tag,
  Hash,
  FileText,
  Loader2,
  Save,
} from 'lucide-react';

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
      title="Copy"
    >
      {copied ? (
        <Check className="h-3 w-3 text-success" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: Visibility.VISIBILITY_PUBLIC, label: 'Public' },
  { value: Visibility.VISIBILITY_PRIVATE, label: 'Private' },
  { value: Visibility.VISIBILITY_DEVELOPMENT, label: 'Development' },
];

function visibilityLabel(v: number): string {
  switch (v) {
    case Visibility.VISIBILITY_PUBLIC:
      return 'Public';
    case Visibility.VISIBILITY_PRIVATE:
      return 'Private';
    case Visibility.VISIBILITY_DEVELOPMENT:
      return 'Development';
    default:
      return 'Unspecified';
  }
}

function visibilityColorClass(v: number): string {
  switch (v) {
    case Visibility.VISIBILITY_PUBLIC:
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case Visibility.VISIBILITY_PRIVATE:
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case Visibility.VISIBILITY_DEVELOPMENT:
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function VisibilityBadge({ visibility }: { visibility: number }) {
  const label = visibilityLabel(visibility);
  const colorClass = visibilityColorClass(visibility);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${colorClass}`}
    >
      {visibility === Visibility.VISIBILITY_PRIVATE ||
      visibility === Visibility.VISIBILITY_DEVELOPMENT ? (
        <EyeOff className="h-2.5 w-2.5" />
      ) : (
        <Eye className="h-2.5 w-2.5" />
      )}
      {label}
    </span>
  );
}

function VisibilityDropdown({
  protocolId,
  currentVisibility,
}: {
  protocolId: string;
  currentVisibility: Visibility;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Visibility>(currentVisibility);
  const isDirty = selected !== currentVisibility;

  const mutation = useMutation({
    mutationFn: (newVisibility: Visibility) =>
      protocolClient.updateProtocol({
        protocolId,
        visibility: newVisibility,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'protocol', protocolId],
      });
    },
  });

  const handleSave = useCallback(() => {
    if (isDirty) {
      mutation.mutate(selected);
    }
  }, [isDirty, mutation, selected]);

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(Number(e.target.value) as Visibility)}
        disabled={mutation.isPending}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      >
        {VISIBILITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {isDirty && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
          onClick={handleSave}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Save
        </Button>
      )}

      {mutation.isSuccess && !isDirty && (
        <span className="flex items-center gap-1 text-xs text-emerald-500">
          <Check className="h-3 w-3" /> Saved
        </span>
      )}

      {mutation.isError && (
        <span className="text-xs text-destructive">
          {friendlyError(mutation.error)}
        </span>
      )}
    </div>
  );
}

/**
 * Compare two semver strings in descending order.
 * Handles versions like "2.10.1", "2.9.0", etc.
 */
function compareSemverDesc(a: string, b: string): number {
  const partsA = a.split('.').map((p) => {
    const n = parseInt(p, 10);
    return isNaN(n) ? 0 : n;
  });
  const partsB = b.split('.').map((p) => {
    const n = parseInt(p, 10);
    return isNaN(n) ? 0 : n;
  });

  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) {
      return numB - numA; // descending
    }
  }
  return 0;
}

interface ProtocolVersion {
  protocolVersionId: string;
  semanticVersion: string;
  versionKey?: { variantKey?: string } | undefined;
  skuCode?: string;
  visibility: number;
  createdAt?: Date | undefined;
}

interface VariantGroup {
  variantKey: string;
  versions: ProtocolVersion[];
}

function useGroupedVersions(
  versions: ProtocolVersion[] | undefined,
): VariantGroup[] {
  return useMemo(() => {
    if (!versions || versions.length === 0) return [];

    const grouped = new Map<string, ProtocolVersion[]>();

    for (const v of versions) {
      const key = v.versionKey?.variantKey || '(unknown)';
      const list = grouped.get(key);
      if (list) {
        list.push(v);
      } else {
        grouped.set(key, [v]);
      }
    }

    // Sort each group's versions by semver descending
    for (const list of grouped.values()) {
      list.sort((a, b) =>
        compareSemverDesc(a.semanticVersion, b.semanticVersion),
      );
    }

    // Sort variant keys alphabetically
    const sortedKeys = Array.from(grouped.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    return sortedKeys.map((key) => ({
      variantKey: key,
      versions: grouped.get(key)!,
    }));
  }, [versions]);
}

function VersionVisibilityDropdown({
  protocolId,
  protocolVersionId,
  currentVisibility,
}: {
  protocolId: string;
  protocolVersionId: string;
  currentVisibility: Visibility;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Visibility>(currentVisibility);
  const isDirty = selected !== currentVisibility;

  const mutation = useMutation({
    mutationFn: (newVisibility: Visibility) =>
      protocolClient.updateVersion({
        protocolVersionId,
        visibility: newVisibility,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'protocol', protocolId],
      });
      toast.success('Version visibility updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update version visibility');
    },
  });

  const handleSave = useCallback(() => {
    if (isDirty) {
      mutation.mutate(selected);
    }
  }, [isDirty, mutation, selected]);

  return (
    <div className="flex items-center gap-1.5">
      <VisibilityBadge visibility={currentVisibility} />
      <select
        value={selected}
        onChange={(e) => setSelected(Number(e.target.value) as Visibility)}
        disabled={mutation.isPending}
        className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      >
        {VISIBILITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isDirty && (
        <Button
          size="sm"
          variant="outline"
          className="h-5 gap-1 px-1.5 text-[10px]"
          onClick={handleSave}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <Save className="h-2.5 w-2.5" />
          )}
          Save
        </Button>
      )}
      {mutation.isPending && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
      {mutation.isSuccess && !isDirty && (
        <Check className="h-3 w-3 text-emerald-500" />
      )}
    </div>
  );
}

function VariantSection({
  group,
  protocolId,
}: {
  group: VariantGroup;
  protocolId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-accent/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium">
            {group.variantKey}
          </span>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            {group.versions.length}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Visibility</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {group.versions.map((v) => (
                <tr
                  key={v.protocolVersionId}
                  className="border-b border-border/50 last:border-b-0"
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    {v.semanticVersion}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {v.skuCode || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <VersionVisibilityDropdown
                      protocolId={protocolId}
                      protocolVersionId={v.protocolVersionId}
                      currentVisibility={v.visibility}
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {v.createdAt
                      ? new Date(v.createdAt).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminProtocolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const protocolId = params.id as string;
  const [showVersions, setShowVersions] = useState(true);

  const {
    data: protocol,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'protocol', protocolId],
    queryFn: () => protocolClient.getProtocol(protocolId),
    enabled: Boolean(protocolId),
  });

  // Fetch all variants for this protocol separately so we can get ALL
  // versions (including development/private) via listVersions.
  const { data: variantKeysList } = useQuery({
    queryKey: ['admin', 'protocol', protocolId, 'variants'],
    queryFn: () => protocolClient.listVariants({ protocolId }),
    enabled: Boolean(protocolId && protocol?.key),
  });

  const { data: allVersions } = useQuery({
    queryKey: [
      'admin',
      'protocol',
      protocolId,
      'all-versions',
      variantKeysList,
    ],
    queryFn: async () => {
      if (!protocol?.key || !variantKeysList?.length) return [];
      const results = await Promise.all(
        variantKeysList.map((variantKey: string) =>
          protocolClient.listVersions({
            versionKey: { protocolKey: protocol.key, variantKey },
          }),
        ),
      );
      return results.flat();
    },
    enabled: Boolean(
      protocol?.key && variantKeysList && variantKeysList.length > 0,
    ),
  });

  // Use separately-fetched versions (all visibilities) with fallback
  const versions = allVersions ?? protocol?.versions;
  const variantGroups = useGroupedVersions(
    versions as ProtocolVersion[] | undefined,
  );
  const totalVersions = versions?.length ?? 0;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => router.push('/admin/protocols')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Protocols
      </Button>

      {isLoading ? (
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          {/* Protocol details card skeleton */}
          <div className="max-w-2xl rounded-lg border border-border bg-card p-5">
            <Skeleton className="mb-4 h-3.5 w-28" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>

          {/* Versions section skeleton */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{friendlyError(error)}</p>
        </div>
      ) : protocol ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Blocks className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-medium">{protocol.name}</h2>
                <VisibilityBadge visibility={protocol.visibility} />
              </div>
              <p className="text-sm text-muted-foreground">
                {protocolId.slice(0, 8)}…
                <CopyBtn value={protocolId} />
              </p>
            </div>
          </div>

          {/* Info card */}
          <div className="max-w-2xl rounded-lg border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Protocol Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Hash className="h-3 w-3" />
                  Key
                </div>
                <p className="font-mono text-sm">{protocol.key}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  Ticker
                </div>
                <p className="text-sm">{protocol.ticker || '—'}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Created
                </div>
                <p className="text-sm">
                  {protocol.createdAt
                    ? new Date(protocol.createdAt).toLocaleString()
                    : '—'}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Updated
                </div>
                <p className="text-sm">
                  {protocol.updatedAt
                    ? new Date(protocol.updatedAt).toLocaleString()
                    : '—'}
                </p>
              </div>

              {protocol.orgId && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    Org ID
                  </div>
                  <p className="flex items-center font-mono text-xs text-muted-foreground">
                    {protocol.orgId.slice(0, 8)}…
                    <CopyBtn value={protocol.orgId} />
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  Visibility
                </div>
                <VisibilityDropdown
                  protocolId={protocolId}
                  currentVisibility={protocol.visibility}
                />
              </div>
            </div>

            {protocol.description && (
              <div className="mt-4 space-y-1 border-t border-border pt-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  Description
                </div>
                <p className="text-sm text-muted-foreground">
                  {protocol.description}
                </p>
              </div>
            )}
          </div>

          {/* Versions grouped by variant */}
          <div className="max-w-2xl rounded-lg border border-border bg-card p-5">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="flex w-full items-center justify-between text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Versions ({totalVersions})
                {variantGroups.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    across {variantGroups.length} variant
                    {variantGroups.length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
              {showVersions ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>

            {showVersions && (
              <div className="mt-4 space-y-3">
                {variantGroups.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No versions found
                  </p>
                ) : (
                  <>
                    {variantGroups.map((group) => (
                      <VariantSection
                        key={group.variantKey}
                        group={group}
                        protocolId={protocolId}
                      />
                    ))}
                    {versions &&
                      versions.length > 0 &&
                      (versions as ProtocolVersion[]).every(
                        (v) => v.visibility === Visibility.VISIBILITY_PUBLIC,
                      ) && (
                        <p className="text-[10px] text-muted-foreground italic">
                          Note: The API may filter versions by visibility.
                          Contact backend team if development versions are
                          missing.
                        </p>
                      )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
