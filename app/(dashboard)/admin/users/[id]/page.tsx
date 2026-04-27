'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userClient } from '@modules/grpc/clients/userClient';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { authClient as authGrpcClient } from '@modules/grpc/clients/authClient';
import { friendlyError } from '@/lib/friendly-error';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  User,
  Loader2,
  Check,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings,
  Building2,
  Shield,
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
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [permissionsOrgId, setPermissionsOrgId] = useState<string | null>(null);

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => userClient.getUser(userId),
    enabled: Boolean(userId),
  });

  const { data: settings } = useQuery({
    queryKey: ['admin', 'userSettings', userId],
    queryFn: () => userClient.getSettings(userId),
    enabled: Boolean(userId),
  });

  // Fetch orgs this user belongs to
  const { data: userOrgs = [], isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['admin', 'userOrgs', userId],
    queryFn: async () => {
      const response = await organizationClient.listOrganizations(
        { currentPage: 0, itemsPerPage: 500 },
        undefined,
        undefined,
        false,
        true,
        userId,
      );
      return response.orgs ?? [];
    },
    enabled: Boolean(userId),
  });

  // Fetch permissions for the expanded org
  const { data: orgPermissions = [], isLoading: isLoadingPermissions } =
    useQuery({
      queryKey: ['admin', 'userPermissions', userId, permissionsOrgId],
      queryFn: () => authGrpcClient.listPermissions(userId, permissionsOrgId!),
      enabled: Boolean(userId && permissionsOrgId),
    });

  // Init form values when user data loads
  if (user && !initialized) {
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: () => userClient.updateUser({ userId, firstName, lastName }),
    onSuccess: () => {
      toast.success('User updated');
      queryClient.refetchQueries({ queryKey: ['admin', 'user', userId] });
    },
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });

  const deleteSettingsMutation = useMutation({
    mutationFn: async () => {
      await userClient.deleteSettings(userId, 'admin');
      await userClient.deleteSettings(userId, 'organization');
      await userClient.deleteSettings(userId, 'layout');
    },
    onSuccess: () => {
      toast.success('Settings deleted');
      queryClient.refetchQueries({
        queryKey: ['admin', 'userSettings', userId],
      });
    },
    onError: (err: Error) => toast.error(`Failed: ${err.message}`),
  });

  const removeFromOrgMutation = useMutation({
    mutationFn: (orgId: string) =>
      organizationClient.removeMember(userId, orgId),
    onSuccess: () => {
      toast.success('Removed from organization');
      queryClient.invalidateQueries({
        queryKey: ['admin', 'userOrgs', userId],
      });
    },
    onError: (err: any) => {
      toast.error('Failed to remove from organization', {
        description: friendlyError(err),
      });
    },
  });

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => router.push('/admin/users')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Button>

      {isLoading ? (
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>

          {/* Edit form card skeleton */}
          <div className="max-w-lg space-y-4 rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-3.5 w-20" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>

          {/* Org memberships skeleton */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-52" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>

          {/* Settings section skeleton */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{friendlyError(error)}</p>
        </div>
      ) : user ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-medium">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {user.email} · {userId.slice(0, 8)}…
                <CopyBtn value={userId} />
              </p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="max-w-lg space-y-4 rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Edit User
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-medium">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Email</label>
              <input
                type="email"
                value={user.email ?? ''}
                disabled
                className="h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Created</label>
              <p className="text-sm text-muted-foreground">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleString()
                  : '—'}
              </p>
            </div>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>

          {/* Organization Memberships */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Organization Memberships ({isLoadingOrgs ? '…' : userOrgs.length})
            </h3>

            {isLoadingOrgs ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : userOrgs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not a member of any organizations.
              </p>
            ) : (
              <div className="rounded-md border border-border divide-y divide-border">
                {userOrgs.map((org: any) => {
                  const member = org.members?.find(
                    (m: any) => m.userId === userId,
                  );
                  const roles: any[] = member?.roles || [];
                  const isExpanded = permissionsOrgId === org.orgId;

                  return (
                    <div key={org.orgId} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">
                            {org.name}
                          </span>
                          {org.personal && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Personal
                            </span>
                          )}
                          {roles.map((role: any, i: number) => (
                            <span
                              key={i}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                            >
                              {typeof role === 'object'
                                ? role.name || 'Member'
                                : role}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setPermissionsOrgId(isExpanded ? null : org.orgId)
                            }
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            Permissions
                            {isExpanded ? (
                              <ChevronUp className="ml-1 h-3 w-3" />
                            ) : (
                              <ChevronDown className="ml-1 h-3 w-3" />
                            )}
                          </Button>
                          {!org.personal && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() =>
                                removeFromOrgMutation.mutate(org.orgId)
                              }
                              disabled={removeFromOrgMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded permissions */}
                      {isExpanded && (
                        <div className="mt-2 rounded-md bg-muted/50 p-3">
                          {isLoadingPermissions ? (
                            <div className="space-y-1">
                              {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-4 w-48" />
                              ))}
                            </div>
                          ) : orgPermissions.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No permissions for this organization.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                                Permissions (read-only)
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {orgPermissions.map((perm: string) => (
                                  <span
                                    key={perm}
                                    className="rounded bg-background border border-border px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
                                  >
                                    {perm}
                                  </span>
                                ))}
                              </div>
                              <p className="mt-2 text-[10px] text-muted-foreground italic">
                                Permission editing requires backend API support
                                (not yet available).
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settings */}
          {settings && Object.keys(settings).length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  User Settings ({Object.keys(settings).length} keys)
                  {showSettings ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => deleteSettingsMutation.mutate()}
                  disabled={deleteSettingsMutation.isPending}
                >
                  {deleteSettingsMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Delete All Settings
                </Button>
              </div>
              {showSettings && (
                <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px] text-muted-foreground">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
