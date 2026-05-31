'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loadBalancerClient } from '@modules/grpc/clients/loadBalancerClient';
import { friendlyError } from '@/lib/friendly-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LbMemberKind,
  LbMemberScheme,
  type LoadBalancerMember,
  type NewLbMember,
} from '@modules/grpc/library/blockjoy/v1/load_balancer';
import type { Node } from '@modules/grpc/library/blockjoy/v1/node';
import {
  Plus,
  Trash2,
  Loader2,
  X,
  Network,
  Server,
  Globe,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────

function kindLabel(kind: LbMemberKind): string {
  switch (kind) {
    case LbMemberKind.LB_MEMBER_KIND_NODE:
      return 'Node';
    case LbMemberKind.LB_MEMBER_KIND_EXTERNAL:
      return 'External';
    default:
      return 'Unknown';
  }
}

function schemeLabel(scheme: LbMemberScheme): string {
  switch (scheme) {
    case LbMemberScheme.LB_MEMBER_SCHEME_HTTP:
      return 'HTTP';
    case LbMemberScheme.LB_MEMBER_SCHEME_HTTPS:
      return 'HTTPS';
    default:
      return '—';
  }
}

function validatePort(val: string): string | null {
  const n = Number(val);
  if (!val) return 'Port is required.';
  if (!Number.isInteger(n) || n < 1 || n > 65535)
    return 'Port must be 1–65535.';
  return null;
}

// ─── Add Member Form ──────────────────────────────────────────────

type AddMemberFormProps = {
  lbId: string;
  orgId: string;
  nodes: Node[];
  isLoadingNodes: boolean;
  onSuccess: () => void;
};

function AddMemberForm({
  lbId,
  orgId: _orgId,
  nodes,
  isLoadingNodes,
  onSuccess,
}: AddMemberFormProps) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<LbMemberKind>(
    LbMemberKind.LB_MEMBER_KIND_NODE,
  );
  const [nodeId, setNodeId] = useState('');
  const [host, setHost] = useState('');
  const [portStr, setPortStr] = useState('');
  const [scheme, setScheme] = useState<LbMemberScheme>(
    LbMemberScheme.LB_MEMBER_SCHEME_HTTPS,
  );

  const portError = portStr ? validatePort(portStr) : null;
  const isNode = kind === LbMemberKind.LB_MEMBER_KIND_NODE;

  const isValid = isNode
    ? Boolean(nodeId) && !portError && Boolean(portStr)
    : Boolean(host.trim()) && !portError && Boolean(portStr);

  const addMemberMutation = useMutation({
    mutationFn: (member: NewLbMember) =>
      loadBalancerClient.addMember(lbId, member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loadBalancer', lbId] });
      queryClient.invalidateQueries({ queryKey: ['loadBalancers'] });
      // reset form
      setNodeId('');
      setHost('');
      setPortStr('');
      setScheme(LbMemberScheme.LB_MEMBER_SCHEME_HTTPS);
      onSuccess();
    },
  });

  function handleSubmit() {
    const port = Number(portStr);
    if (isNode) {
      addMemberMutation.mutate({
        kind: LbMemberKind.LB_MEMBER_KIND_NODE,
        nodeId,
        port,
        scheme,
      });
    } else {
      addMemberMutation.mutate({
        kind: LbMemberKind.LB_MEMBER_KIND_EXTERNAL,
        host: host.trim(),
        port,
        scheme,
      });
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-medium">Add member</h3>

      {/* Kind toggle */}
      <div className="flex gap-1 rounded-md border border-input p-0.5 w-fit bg-background">
        <button
          type="button"
          onClick={() => setKind(LbMemberKind.LB_MEMBER_KIND_NODE)}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            isNode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Server className="h-3 w-3" />
          Node
        </button>
        <button
          type="button"
          onClick={() => setKind(LbMemberKind.LB_MEMBER_KIND_EXTERNAL)}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            !isNode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="h-3 w-3" />
          External
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Node picker or host input */}
        {isNode ? (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Node
            </label>
            <select
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              disabled={isLoadingNodes}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="">
                {isLoadingNodes ? 'Loading nodes…' : 'Select a node'}
              </option>
              {nodes.map((n) => (
                <option key={n.nodeId} value={n.nodeId}>
                  {n.displayName || n.nodeName || n.nodeId}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Host
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="e.g. 10.0.0.5 or api.example.com"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}

        {/* Port */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Port
          </label>
          <input
            type="number"
            min={1}
            max={65535}
            value={portStr}
            onChange={(e) => setPortStr(e.target.value)}
            placeholder="e.g. 8545"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid && !addMemberMutation.isPending)
                handleSubmit();
            }}
          />
          {portError && (
            <p className="text-xs text-destructive">{portError}</p>
          )}
        </div>

        {/* Scheme */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Scheme
          </label>
          <select
            value={scheme}
            onChange={(e) => setScheme(Number(e.target.value) as LbMemberScheme)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value={LbMemberScheme.LB_MEMBER_SCHEME_HTTPS}>HTTPS</option>
            <option value={LbMemberScheme.LB_MEMBER_SCHEME_HTTP}>HTTP</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!isValid || addMemberMutation.isPending}
          onClick={handleSubmit}
        >
          {addMemberMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            'Add member'
          )}
        </Button>
      </div>

      {addMemberMutation.isError && (
        <p className="text-sm text-destructive">
          {friendlyError(addMemberMutation.error)}
        </p>
      )}
    </div>
  );
}

// ─── Members Table ────────────────────────────────────────────────

type LoadBalancerMembersProps = {
  lbId: string;
  orgId: string;
  members: LoadBalancerMember[];
  nodes: Node[];
  isLoadingNodes: boolean;
};

export function LoadBalancerMembers({
  lbId,
  orgId,
  members,
  nodes,
  isLoadingNodes,
}: LoadBalancerMembersProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Build a nodeId → displayName map for resolving NODE targets
  const nodeMap = new Map<string, string>();
  for (const n of nodes) {
    if (n.nodeId) {
      nodeMap.set(n.nodeId, n.displayName || n.nodeName || n.nodeId);
    }
  }

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      loadBalancerClient.removeMember(lbId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loadBalancer', lbId] });
      queryClient.invalidateQueries({ queryKey: ['loadBalancers'] });
      setRemovingId(null);
    },
    onError: () => {
      setRemovingId(null);
    },
  });

  function getTarget(member: LoadBalancerMember): string {
    if (member.kind === LbMemberKind.LB_MEMBER_KIND_NODE) {
      const name = member.nodeId ? nodeMap.get(member.nodeId) : undefined;
      return name || member.nodeId || '—';
    }
    return member.host || '—';
  }

  function handleRemoveClick(memberId: string) {
    if (removingId === memberId) {
      removeMemberMutation.mutate(memberId);
    } else {
      setRemovingId(memberId);
    }
  }

  return (
    <div className="space-y-4">
      {/* Members table */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            <Network className="h-4 w-4" />
            Members ({members.length})
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => setShowAddForm((v) => !v)}
          >
            {showAddForm ? (
              <>
                <X className="h-3 w-3" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" /> Add member
              </>
            )}
          </Button>
        </div>

        {members.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Network className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No members yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Use the button above to add a backend member.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Kind</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Port</th>
                  <th className="px-4 py-3">Scheme</th>
                  <th className="px-4 py-3">Enabled</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isRemoving =
                    removingId === member.memberId &&
                    removeMemberMutation.isPending;
                  const isPendingConfirm =
                    removingId === member.memberId &&
                    !removeMemberMutation.isPending;

                  return (
                    <tr
                      key={member.memberId}
                      className="border-b border-border/50 transition-colors hover:bg-accent/30"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {member.kind === LbMemberKind.LB_MEMBER_KIND_NODE ? (
                            <Server className="h-3 w-3" />
                          ) : (
                            <Globe className="h-3 w-3" />
                          )}
                          {kindLabel(member.kind)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {isLoadingNodes && member.kind === LbMemberKind.LB_MEMBER_KIND_NODE ? (
                          <Skeleton className="h-3 w-24" />
                        ) : (
                          getTarget(member)
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {member.port || '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {schemeLabel(member.scheme)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium ${member.enabled ? 'text-green-500' : 'text-muted-foreground'}`}
                        >
                          {member.enabled ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isPendingConfirm ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-destructive">
                              Remove?
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-6 text-xs"
                              onClick={() =>
                                handleRemoveClick(member.memberId)
                              }
                            >
                              Yes
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                              onClick={() => setRemovingId(null)}
                            >
                              No
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              handleRemoveClick(member.memberId)
                            }
                            disabled={isRemoving || removeMemberMutation.isPending}
                          >
                            {isRemoving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {removeMemberMutation.isError && (
          <div className="border-t border-border px-5 py-2">
            <p className="text-xs text-destructive">
              {friendlyError(removeMemberMutation.error)}
            </p>
          </div>
        )}
      </div>

      {/* Add member form (toggled) */}
      {showAddForm && (
        <AddMemberForm
          lbId={lbId}
          orgId={orgId}
          nodes={nodes}
          isLoadingNodes={isLoadingNodes}
          onSuccess={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}
