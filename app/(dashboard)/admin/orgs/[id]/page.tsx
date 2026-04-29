'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { invitationClient } from '@modules/grpc/clients/invitationClient';
import type { Invitation } from '@modules/grpc/library/blockjoy/v1/invitation';
import { friendlyError } from '@/lib/friendly-error';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Hash,
  Loader2,
  Mail,
  Server,
  HardDrive,
  Users,
  UserCircle,
  UserPlus,
  Shield,
  X,
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

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

export default function AdminOrgDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const [showMembers, setShowMembers] = useState(true);
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const {
    data: org,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'org', orgId],
    queryFn: () => organizationClient.getOrganization(orgId),
    enabled: Boolean(orgId),
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: () => invitationClient.inviteOrgMember(inviteEmail, orgId),
    onSuccess: () => {
      toast.success('Invitation sent', {
        description: `Invited ${inviteEmail} to ${org?.name || 'this organization'}`,
      });
      setInviteEmail('');
      setShowInviteForm(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'org', orgId] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'orgInvitations', orgId],
      });
    },
    onError: (err: any) => {
      toast.error('Failed to send invitation', {
        description: friendlyError(err),
      });
    },
  });

  // Fetch pending invitations for this org
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['admin', 'orgInvitations', orgId],
    queryFn: () => invitationClient.pendingInvitations(orgId),
    enabled: Boolean(orgId && org),
  });

  // Revoke invitation mutation
  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      invitationClient.revokeInvitation(invitationId),
    onSuccess: () => {
      toast.success('Invitation revoked');
      queryClient.invalidateQueries({
        queryKey: ['admin', 'orgInvitations', orgId],
      });
    },
    onError: (err: any) => {
      toast.error('Failed to revoke invitation', {
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
        onClick={() => router.push('/admin/orgs')}
      >
        <ArrowLeft className="h-4 w-4" /> Back to Organizations
      </Button>

      {isLoading ? (
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            ))}
          </div>

          {/* Details card skeleton */}
          <div className="max-w-lg space-y-4 rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-3.5 w-16" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="mt-0.5 h-4 w-4 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            ))}
          </div>

          {/* Members table skeleton */}
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border/50 px-4 py-3"
              >
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{friendlyError(error)}</p>
        </div>
      ) : org ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-medium">{org.name}</h2>
                {org.personal && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Personal
                  </span>
                )}
              </div>
              <p className="flex items-center text-sm text-muted-foreground">
                {orgId.slice(0, 8)}…
                <CopyBtn value={orgId} />
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Users}
              label="Members"
              value={org.memberCount ?? 0}
            />
            <StatCard icon={Server} label="Nodes" value={org.nodeCount ?? 0} />
            <StatCard
              icon={HardDrive}
              label="Hosts"
              value={org.hostCount ?? 0}
            />
          </div>

          {/* Details Card */}
          <div className="max-w-lg space-y-4 rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Details
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Hash className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Organization ID
                  </p>
                  <p className="flex items-center font-mono text-sm">
                    {orgId}
                    <CopyBtn value={orgId} />
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Name
                  </p>
                  <p className="text-sm">{org.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Type
                  </p>
                  <p className="text-sm">
                    {org.personal ? 'Personal' : 'Organization'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm">
                    {org.createdAt
                      ? new Date(org.createdAt).toLocaleString()
                      : '—'}
                  </p>
                </div>
              </div>

              {org.updatedAt && (
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Updated
                    </p>
                    <p className="text-sm">
                      {new Date(org.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Members */}
          {org.members && org.members.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <button
                onClick={() => setShowMembers(!showMembers)}
                className="flex w-full items-center justify-between text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Members ({org.members.length})
                </span>
                {showMembers ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>

              {showMembers && (
                <div className="mt-4 rounded-md border border-border">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">Roles</th>
                        <th className="px-4 py-2">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {org.members.map((member) => (
                        <tr
                          key={member.userId}
                          className="cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
                          onClick={() =>
                            router.push(`/admin/users/${member.userId}`)
                          }
                        >
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <UserCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {member.name || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">
                            {member.email}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {member.roles.map((role, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  {typeof role === 'number'
                                    ? role === 1
                                      ? 'Member'
                                      : role === 2
                                        ? 'Admin'
                                        : role === 3
                                          ? 'Owner'
                                          : `Role ${role}`
                                    : String(role)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">
                            {member.joinedAt
                              ? new Date(member.joinedAt).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Invite & Pending Invitations — superuser only, non-personal orgs */}
          {!org.personal && (
            <div className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Invitations
                  {pendingInvitations.length > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      {pendingInvitations.length}
                    </span>
                  )}
                </span>
                {!showInviteForm && (
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setShowInviteForm(true)}
                  >
                    <UserPlus className="h-3 w-3" />
                    Invite User
                  </Button>
                )}
              </div>

              {/* Invite form */}
              {showInviteForm && (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address..."
                    className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inviteEmail.trim())
                        inviteMutation.mutate();
                      if (e.key === 'Escape') {
                        setShowInviteForm(false);
                        setInviteEmail('');
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={!inviteEmail.trim() || inviteMutation.isPending}
                    onClick={() => inviteMutation.mutate()}
                  >
                    {inviteMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    Send
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail('');
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Pending invitations list */}
              {pendingInvitations.length > 0 ? (
                <div className="rounded-md border border-border">
                  {(pendingInvitations as Invitation[]).map((inv) => (
                    <div
                      key={inv.invitationId}
                      className="flex items-center justify-between border-b border-border/50 px-4 py-2.5 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{inv.inviteeEmail}</span>
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                          Pending
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => revokeMutation.mutate(inv.invitationId)}
                        disabled={revokeMutation.isPending}
                      >
                        {revokeMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Revoke'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : !showInviteForm ? (
                <p className="text-xs text-muted-foreground">
                  No pending invitations
                </p>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
