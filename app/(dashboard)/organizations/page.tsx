'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { invitationClient } from '@modules/grpc/clients/invitationClient';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { NodeSortField } from '@modules/grpc/library/blockjoy/v1/node';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { useAuth } from '@/lib/hooks/use-auth';
import { friendlyError } from '@/lib/friendly-error';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useOrganizations } from '@/lib/hooks/use-organizations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from '@/components/ui/search-input';
import {
  Building2,
  Plus,
  Users,
  Mail,
  Trash2,
  Loader2,
  X,
  Check,
  UserPlus,
  Shield,
  Clock,
} from 'lucide-react';
import type {
  Org,
  OrgUser,
  OrgRole,
} from '@modules/grpc/library/blockjoy/v1/org';
import type { Invitation } from '@modules/grpc/library/blockjoy/v1/invitation';

export default function OrganizationsPage() {
  const { user } = useAuth();
  const { isSuperUser, hasPermission } = usePermissions();
  const { defaultOrg, switchOrg } = useOrganizations();
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Sync selected org from the persisted default (survives page refresh)
  useEffect(() => {
    if (defaultOrg?.orgId && !selectedOrgId) {
      setSelectedOrgId(defaultOrg.orgId);
    }
  }, [defaultOrg?.orgId]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>(
    'members',
  );
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch orgs — uses the same query key as useOrganizations() hook,
  // which returns response.orgs (an array), not the raw response object.
  const { data: allOrgsData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['organizations', user?.userId],
    queryFn: async () => {
      const response = await organizationClient.listOrganizations();
      return response.orgs ?? [];
    },
    enabled: Boolean(user?.userId),
  });

  const allOrgs: Org[] = allOrgsData ?? [];
  const orgs = allOrgs.filter(
    (org) => !search || org.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedOrg =
    orgs.find((o) => o.orgId === selectedOrgId) ??
    (orgs.length > 0 ? orgs[0] : null);

  // Fetch selected org detail (includes members array)
  const { data: orgDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['organizationDetail', selectedOrg?.orgId],
    queryFn: () => organizationClient.getOrganization(selectedOrg!.orgId),
    enabled: Boolean(selectedOrg?.orgId),
  });

  const members: OrgUser[] = orgDetail?.members ?? [];

  // Fetch real node count for the selected org (workaround for stale backend nodeCount)
  const { data: realNodeCount } = useQuery({
    queryKey: ['orgNodeCount', selectedOrg?.orgId],
    queryFn: async () => {
      const response = await nodeClient.listNodes(
        selectedOrg!.orgId,
        {},
        { currentPage: 0, itemsPerPage: 1 },
        [
          {
            field: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
            order: SortOrder.SORT_ORDER_DESCENDING,
          },
        ],
      );
      return response.total ?? 0;
    },
    enabled: Boolean(selectedOrg?.orgId),
  });

  // Fetch invitations for selected org
  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery({
    queryKey: ['orgInvitations', selectedOrg?.orgId],
    queryFn: () => invitationClient.pendingInvitations(selectedOrg!.orgId),
    enabled: Boolean(selectedOrg?.orgId),
  });

  // Fetch received invitations for current user
  const { data: receivedInvitations = [] } = useQuery({
    queryKey: ['receivedInvitations', user?.email],
    queryFn: () => invitationClient.receivedInvitations(user!.email),
    enabled: Boolean(user?.email),
  });

  // Create org mutation
  const createOrgMutation = useMutation({
    mutationFn: () => organizationClient.createOrganization(newOrgName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setNewOrgName('');
      setShowCreateOrg(false);
    },
  });

  // Delete org mutation
  const deleteOrgMutation = useMutation({
    mutationFn: (orgId: string) => organizationClient.deleteOrganization(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setSelectedOrgId(null);
      setShowDeleteConfirm(false);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ userId, orgId }: { userId: string; orgId: string }) =>
      organizationClient.removeMember(userId, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizationDetail', selectedOrg?.orgId],
      });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: () =>
      invitationClient.inviteOrgMember(inviteEmail, selectedOrg!.orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['orgInvitations', selectedOrg?.orgId],
      });
      setInviteEmail('');
    },
  });

  // Revoke invitation mutation
  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      invitationClient.revokeInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['orgInvitations', selectedOrg?.orgId],
      });
    },
  });

  // Accept received invitation
  const acceptMutation = useMutation({
    mutationFn: (invitationId: string) =>
      invitationClient.acceptInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['receivedInvitations'] });
    },
  });

  // Decline received invitation
  const declineMutation = useMutation({
    mutationFn: (invitationId: string) =>
      invitationClient.declineInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedInvitations'] });
    },
  });

  const isOrgOwner = members.some(
    (m: OrgUser) =>
      m.userId === user?.userId &&
      m.roles?.some((r: OrgRole) => r.name?.toLowerCase() === 'owner'),
  );
  const canInvite =
    hasPermission('invitation-create') || isOrgOwner || isSuperUser;
  const canDeleteOrg = hasPermission('org-delete') || isSuperUser;
  const canRemoveMember = hasPermission('org-remove-member') || isSuperUser;

  function formatDate(date: Date | string | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function handleSelectOrg(orgId: string) {
    setSelectedOrgId(orgId);
    setActiveTab('members');
    setShowDeleteConfirm(false);

    // Persist the selection so it survives page refresh
    const org = orgs.find((o) => o.orgId === orgId);
    if (org) {
      switchOrg({ orgId: org.orgId, name: org.name });
    }
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Organizations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organizations and team members
        </p>
      </div>

      {/* Received invitations banner */}
      {receivedInvitations.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-medium text-primary">
            Pending Invitations ({receivedInvitations.length})
          </h3>
          <div className="space-y-2">
            {(receivedInvitations as Invitation[]).map((inv) => (
              <div
                key={inv.invitationId}
                className="flex items-center justify-between rounded-md bg-background/50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {inv.orgName || 'Organization'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Invited {formatDate(inv.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => acceptMutation.mutate(inv.invitationId)}
                    disabled={acceptMutation.isPending}
                  >
                    <Check className="h-3 w-3" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() => declineMutation.mutate(inv.invitationId)}
                    disabled={declineMutation.isPending}
                  >
                    <X className="h-3 w-3" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Org list sidebar */}
        <div className="shrink-0 space-y-3 lg:w-64">
          <div className="flex gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search orgs..."
              className="flex-1"
            />
            {isSuperUser && (
              <Button
                size="sm"
                className="h-9 gap-1"
                onClick={() => setShowCreateOrg(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {isSuperUser && showCreateOrg && (
            <div className="space-y-2 rounded-md border border-border bg-card p-3">
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Organization name"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newOrgName.trim())
                    createOrgMutation.mutate();
                  if (e.key === 'Escape') {
                    setShowCreateOrg(false);
                    setNewOrgName('');
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!newOrgName.trim() || createOrgMutation.isPending}
                  onClick={() => createOrgMutation.mutate()}
                >
                  {createOrgMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Create'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowCreateOrg(false);
                    setNewOrgName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
              {createOrgMutation.isError && (
                <p className="text-xs text-destructive">
                  {friendlyError(createOrgMutation.error)}
                </p>
              )}
            </div>
          )}

          {isLoadingOrgs ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-md border border-border/50 px-3 py-3"
                >
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {orgs.map((org) => (
                <button
                  key={org.orgId}
                  onClick={() => handleSelectOrg(org.orgId)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                    selectedOrg?.orgId === org.orgId
                      ? 'bg-accent font-medium'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {org.memberCount ?? 0} member
                      {(org.memberCount ?? 0) !== 1 ? 's' : ''}
                      {' · '}
                      {org.nodeCount ?? 0} node
                      {(org.nodeCount ?? 0) !== 1 ? 's' : ''}
                      {org.personal ? ' · Personal' : ''}
                    </p>
                  </div>
                </button>
              ))}
              {orgs.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No organizations found
                </p>
              )}
            </div>
          )}
        </div>

        {/* Org detail */}
        <div className="min-w-0 flex-1">
          {selectedOrg ? (
            <div className="space-y-6">
              {/* Org header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium">{selectedOrg.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrg.memberCount ?? 0} members
                      {' · '}
                      {realNodeCount ?? selectedOrg.nodeCount ?? 0} nodes
                      {selectedOrg.personal ? ' · Personal org' : ''}
                      {selectedOrg.createdAt
                        ? ` · Created ${formatDate(selectedOrg.createdAt)}`
                        : ''}
                    </p>
                  </div>
                </div>
                {canDeleteOrg && !selectedOrg.personal && (
                  <div className="shrink-0">
                    {showDeleteConfirm ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-destructive">
                          Delete this org?
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() =>
                            deleteOrgMutation.mutate(selectedOrg.orgId)
                          }
                          disabled={deleteOrgMutation.isPending}
                        >
                          {deleteOrgMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Yes, Delete'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {deleteOrgMutation.isError && (
                <p className="text-sm text-destructive">
                  {friendlyError(deleteOrgMutation.error)}
                </p>
              )}

              {/* Tabs */}
              {!selectedOrg.personal && (
                <div className="flex gap-1 border-b border-border">
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                      activeTab === 'members'
                        ? 'border-primary font-medium text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Users className="h-4 w-4" /> Members
                  </button>
                  <button
                    onClick={() => setActiveTab('invitations')}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                      activeTab === 'invitations'
                        ? 'border-primary font-medium text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    Invitations
                    {(invitations as Invitation[]).length > 0 && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        {(invitations as Invitation[]).length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Tab content — Members */}
              {(activeTab === 'members' || selectedOrg.personal) && (
                <div className="rounded-lg border border-border bg-card">
                  <div className="border-b border-border px-5 py-3">
                    <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                      Members ({members.length || selectedOrg.memberCount || 0})
                    </h3>
                  </div>

                  {isLoadingDetail ? (
                    <div className="space-y-3 p-5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : members.length > 0 ? (
                    <div className="divide-y divide-border">
                      {members.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
                            {(member.name || member.email || '?').charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {member.name || 'Unnamed'}
                              {member.userId === user?.userId && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {member.roles && member.roles.length > 0 && (
                              <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                <Shield className="h-3 w-3" />
                                {member.roles
                                  .map((r: OrgRole) => r.name ?? 'Member')
                                  .join(', ')}
                              </span>
                            )}
                            {member.joinedAt && (
                              <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                                <Clock className="h-3 w-3" />
                                {formatDate(member.joinedAt)}
                              </span>
                            )}
                            {canRemoveMember &&
                              member.userId !== user?.userId &&
                              !selectedOrg.personal && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
                                  onClick={() =>
                                    removeMemberMutation.mutate({
                                      userId: member.userId,
                                      orgId: selectedOrg.orgId,
                                    })
                                  }
                                  disabled={removeMemberMutation.isPending}
                                >
                                  <X className="h-3 w-3" /> Remove
                                </Button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-8 text-center">
                      <Users className="mb-2 h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">
                        {selectedOrg.memberCount ?? 0} member
                        {(selectedOrg.memberCount ?? 0) !== 1 ? 's' : ''} in
                        this organization
                      </p>
                      {!selectedOrg.personal && (
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          Use the Invitations tab to add new members.
                        </p>
                      )}
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
              )}

              {/* Tab content — Invitations */}
              {activeTab === 'invitations' && !selectedOrg.personal && (
                <div className="space-y-4">
                  {/* Invite form */}
                  {canInvite && (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter email to invite..."
                        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && inviteEmail.trim())
                            inviteMutation.mutate();
                        }}
                      />
                      <Button
                        size="sm"
                        className="gap-2"
                        disabled={
                          !inviteEmail.trim() || inviteMutation.isPending
                        }
                        onClick={() => inviteMutation.mutate()}
                      >
                        {inviteMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="h-3.5 w-3.5" />
                        )}
                        Invite
                      </Button>
                    </div>
                  )}
                  {inviteMutation.isError && (
                    <p className="text-sm text-destructive">
                      {friendlyError(inviteMutation.error)}
                    </p>
                  )}
                  {inviteMutation.isSuccess && (
                    <p className="text-sm text-emerald-600">
                      Invitation sent successfully!
                    </p>
                  )}

                  {/* Invitation list */}
                  <div className="rounded-lg border border-border">
                    {isLoadingInvitations ? (
                      <div className="space-y-3 p-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-4 w-4 rounded" />
                            <Skeleton className="h-4 w-48 flex-1" />
                            <Skeleton className="h-5 w-14 rounded-full" />
                            <Skeleton className="h-7 w-16 rounded-md" />
                          </div>
                        ))}
                      </div>
                    ) : (invitations as Invitation[]).length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-center">
                        <Mail className="mb-2 h-8 w-8 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">
                          No pending invitations
                        </p>
                        {canInvite && (
                          <p className="mt-1 text-xs text-muted-foreground/70">
                            Use the form above to invite new members.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {(invitations as Invitation[]).map((inv) => (
                          <div
                            key={inv.invitationId}
                            className="flex items-center gap-3 px-4 py-3"
                          >
                            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {inv.inviteeEmail}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Sent {formatDate(inv.createdAt)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              onClick={() =>
                                revokeMutation.mutate(inv.invitationId)
                              }
                              disabled={revokeMutation.isPending}
                            >
                              {revokeMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                              Revoke
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center">
              <Building2 className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {isLoadingOrgs
                  ? 'Loading organizations...'
                  : 'Select an organization to view details'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
