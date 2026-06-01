'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadBalancerClient } from '@modules/grpc/clients/loadBalancerClient';
import { hostClient } from '@modules/grpc/clients/hostClient';
import { LbPolicy } from '@modules/grpc/library/blockjoy/v1/load_balancer';
import type { RegionInfo } from '@modules/grpc/library/blockjoy/v1/host';
import { useOrganizations } from '@/lib/hooks/use-organizations';
import { friendlyError } from '@/lib/friendly-error';
import { Button } from '@/components/ui/button';
import { LoadBalancerListView } from '@/components/load-balancers/load-balancer-list-view';
import { Plus, Loader2, X } from 'lucide-react';

const NAME_REGEX = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$|^[a-z0-9]$/;

const POLICY_LABELS: Record<number, string> = {
  [LbPolicy.LB_POLICY_ROUND_ROBIN]: 'Round Robin',
  [LbPolicy.LB_POLICY_LEAST_CONN]: 'Least Connections',
  [LbPolicy.LB_POLICY_FIRST]: 'First Available',
  [LbPolicy.LB_POLICY_RANDOM]: 'Random',
  [LbPolicy.LB_POLICY_IP_HASH]: 'IP Hash',
  [LbPolicy.LB_POLICY_URI_HASH]: 'URI Hash',
};

function policyLabel(policy: LbPolicy): string {
  return POLICY_LABELS[policy] ?? `Policy ${policy}`;
}

function validateName(name: string): string | null {
  if (!name) return 'Name is required.';
  if (name.length > 40) return 'Name must be 40 characters or fewer.';
  if (!NAME_REGEX.test(name))
    return 'Only lowercase letters, digits, and hyphens; no leading or trailing hyphen.';
  return null;
}

export default function LoadBalancersPage() {
  const { defaultOrg } = useOrganizations();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [imageId, setImageId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [policy, setPolicy] = useState<LbPolicy>(LbPolicy.LB_POLICY_ROUND_ROBIN);

  const nameError = name ? validateName(name) : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ['loadBalancers', defaultOrg?.orgId],
    queryFn: () => loadBalancerClient.listLoadBalancers(defaultOrg!.orgId),
    enabled: Boolean(defaultOrg?.orgId),
  });

  const { data: offerings = [], isLoading: isLoadingOfferings } = useQuery({
    queryKey: ['lbEngineOfferings', defaultOrg?.orgId],
    queryFn: () => loadBalancerClient.listEngines(defaultOrg!.orgId),
    enabled: Boolean(defaultOrg?.orgId) && showCreate,
  });

  const selectedOffering = offerings.find((o) => o.imageId === imageId);
  const availablePolicies = selectedOffering?.policies ?? [];

  const { data: regions = [], isLoading: isLoadingRegions } = useQuery({
    queryKey: ['regions', defaultOrg?.orgId, imageId],
    queryFn: () => hostClient.listRegions(defaultOrg!.orgId, imageId),
    enabled: Boolean(defaultOrg?.orgId) && showCreate && Boolean(imageId),
  });

  function resetForm() {
    setName('');
    setImageId('');
    setRegionId('');
    setPolicy(LbPolicy.LB_POLICY_ROUND_ROBIN);
  }

  const createMutation = useMutation({
    mutationFn: () =>
      loadBalancerClient.createLoadBalancer({
        orgId: defaultOrg!.orgId,
        name,
        imageId,
        policy,
        regionId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['loadBalancers', defaultOrg?.orgId],
      });
      resetForm();
      setShowCreate(false);
    },
  });

  function handleOpenCreate() {
    setShowCreate(true);
  }

  function handleCancelCreate() {
    setShowCreate(false);
    resetForm();
    createMutation.reset();
  }

  // Selecting a different offering resets the dependent (image-scoped) region
  // choice and constrains the policy to the offering's supported subset.
  function handleSelectOffering(nextImageId: string) {
    setImageId(nextImageId);
    setRegionId('');
    const offering = offerings.find((o) => o.imageId === nextImageId);
    const policies = offering?.policies ?? [];
    setPolicy(
      policies.length > 0 ? policies[0] : LbPolicy.LB_POLICY_ROUND_ROBIN,
    );
  }

  const isSubmitDisabled =
    createMutation.isPending ||
    Boolean(nameError) ||
    !name ||
    !imageId ||
    !regionId;

  const isLoadingAny = !defaultOrg || isLoading;

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">
            Load Balancers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoadingAny
              ? 'Loading...'
              : `${data?.total ?? 0} load balancer${(data?.total ?? 0) !== 1 ? 's' : ''} in ${defaultOrg?.name ?? 'your organization'}`}
          </p>
        </div>
        {!showCreate && (
          <Button size="sm" className="gap-2" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" />
            Create load balancer
          </Button>
        )}
      </div>

      {showCreate && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">New load balancer</h2>
            <button
              onClick={handleCancelCreate}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-load-balancer"
                autoFocus
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSubmitDisabled)
                    createMutation.mutate();
                  if (e.key === 'Escape') handleCancelCreate();
                }}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>

            {/* Offering */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </label>
              <select
                value={imageId}
                onChange={(e) => handleSelectOffering(e.target.value)}
                disabled={isLoadingOfferings}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">
                  {isLoadingOfferings ? 'Loading types…' : 'Select a type'}
                </option>
                {offerings.map((o) => (
                  <option key={o.imageId} value={o.imageId}>
                    {o.displayName}
                  </option>
                ))}
              </select>
              {offerings.length === 0 && !isLoadingOfferings && (
                <p className="text-xs text-muted-foreground">
                  No load balancer types available
                </p>
              )}
            </div>

            {/* Region */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Region
              </label>
              <select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                disabled={!imageId || isLoadingRegions}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">
                  {!imageId
                    ? 'Select a type first'
                    : isLoadingRegions
                      ? 'Loading regions…'
                      : 'Select a region'}
                </option>
                {(regions as RegionInfo[]).map((ri) => {
                  const r = ri.region;
                  if (!r) return null;
                  return (
                    <option key={r.regionId} value={r.regionId}>
                      {r.displayName || r.regionKey}
                    </option>
                  );
                })}
              </select>
              {imageId && regions.length === 0 && !isLoadingRegions && (
                <p className="text-xs text-muted-foreground">
                  No regions available
                </p>
              )}
            </div>

            {/* Policy */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Policy
              </label>
              <select
                value={policy}
                onChange={(e) => setPolicy(Number(e.target.value) as LbPolicy)}
                disabled={!imageId}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {availablePolicies.map((p) => (
                  <option key={p} value={p}>
                    {policyLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isSubmitDisabled}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Create'
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelCreate}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-destructive">
              {friendlyError(createMutation.error)}
            </p>
          )}
        </div>
      )}

      <LoadBalancerListView
        loadBalancers={data?.loadBalancers ?? []}
        isLoading={isLoadingAny}
        error={error}
      />
    </div>
  );
}
