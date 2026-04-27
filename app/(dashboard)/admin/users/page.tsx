'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userClient } from '@modules/grpc/clients/userClient';
import { invitationClient } from '@modules/grpc/clients/invitationClient';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { friendlyError } from '@/lib/friendly-error';

import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';

import { Users, UserPlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Create user form state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { page, search, limit: pageSize }],
    queryFn: () =>
      userClient.listUsers(search || undefined, {
        currentPage: page - 1,
        itemsPerPage: pageSize,
      }),
  });

  const users = data?.users ?? [];

  // Query for all organizations (for the org assignment multi-select)
  const { data: allOrgs = [] } = useQuery({
    queryKey: ['admin', 'allOrgs'],
    queryFn: async () => {
      const response = await organizationClient.listOrganizations(
        { currentPage: 0, itemsPerPage: 500 },
        undefined,
        undefined,
        true, // isAdmin
      );
      return response.orgs ?? [];
    },
    enabled: showCreateUser,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      // Generate a secure random password — the user will never see this.
      // They'll set their own password via the "Forgot Password" flow after verifying.
      const randomPassword = crypto.randomUUID() + 'Aa1!';

      // 1. Create the user
      const result = await userClient.createUser({
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail,
        password: randomPassword,
      });

      // Check for error response
      if (result && 'code' in result) {
        throw new Error((result as any).message || 'Failed to create user');
      }

      // 2. Invite to selected orgs
      const orgErrors: string[] = [];
      for (const orgId of selectedOrgIds) {
        try {
          await invitationClient.inviteOrgMember(newEmail, orgId);
        } catch (err: any) {
          const orgName =
            allOrgs.find((o: any) => o.orgId === orgId)?.name || orgId;
          orgErrors.push(orgName);
        }
      }

      return { user: result, orgErrors };
    },
    onSuccess: ({ orgErrors }) => {
      if (orgErrors.length > 0) {
        toast.success('User created', {
          description: `A verification email has been sent to ${newEmail}. Invitations failed for: ${orgErrors.join(', ')}. After verifying their email, they can set their password via "Forgot Password".`,
          duration: 8000,
        });
      } else if (selectedOrgIds.size > 0) {
        toast.success('User created', {
          description: `A verification email has been sent to ${newEmail}. They will be invited to ${selectedOrgIds.size} organization(s). After verifying their email, they can set their password via "Forgot Password".`,
          duration: 8000,
        });
      } else {
        toast.success('User created', {
          description: `A verification email has been sent to ${newEmail}. After verifying, they can set their password via "Forgot Password".`,
          duration: 6000,
        });
      }
      // Reset form
      setShowCreateUser(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');

      setSelectedOrgIds(new Set());
      setCreateError('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: any) => {
      setCreateError(friendlyError(err));
    },
  });

  const handleCreateUser = () => {
    setCreateError('');
    createUserMutation.mutate();
  };

  const closeCreateForm = () => {
    setShowCreateUser(false);
    setCreateError('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Loading...' : `${data?.total ?? 0} users`}
          </p>
          <Button className="gap-2" onClick={() => setShowCreateUser(true)}>
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
        </div>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search users..."
          className="w-64"
        />
      </div>

      {showCreateUser && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Create New User</h3>
            <Button variant="ghost" size="sm" onClick={closeCreateForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {createError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">First Name</label>
              <input
                type="text"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Last Name</label>
              <input
                type="text"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Org assignment */}
          <div className="space-y-2">
            <label className="text-xs font-medium">
              Assign to Organizations (optional)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-md border border-border p-2 space-y-1">
              {allOrgs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  Loading organizations...
                </p>
              ) : (
                allOrgs
                  .filter((o: any) => !o.personal)
                  .map((org: any) => (
                    <label
                      key={org.orgId}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOrgIds.has(org.orgId)}
                        onChange={(e) => {
                          const next = new Set(selectedOrgIds);
                          if (e.target.checked) next.add(org.orgId);
                          else next.delete(org.orgId);
                          setSelectedOrgIds(next);
                        }}
                        className="h-3.5 w-3.5 rounded border-input"
                      />
                      <span className="text-sm">{org.name}</span>
                    </label>
                  ))
              )}
            </div>
            {selectedOrgIds.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedOrgIds.size} org(s) selected — invitations will be sent
                after user creation
              </p>
            )}
          </div>

          <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground space-y-1">
            <p>
              <strong>How it works:</strong>
            </p>
            <p>1. The user will receive a verification email</p>
            <p>
              2. After verifying, they&apos;ll set their own password via
              &quot;Forgot Password&quot;
            </p>
            {selectedOrgIds.size > 0 && (
              <p>
                3. Org invitations will be sent and auto-accepted when they
                verify their email
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="gap-2"
              disabled={!newEmail.trim() || createUserMutation.isPending}
              onClick={handleCreateUser}
            >
              {createUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Create User
            </Button>
            <Button variant="outline" onClick={closeCreateForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-12 text-center">
                  <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No users found
                  </p>
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr
                  key={user.userId}
                  className="cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
                  onClick={() => router.push(`/admin/users/${user.userId}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))
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
