'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/use-auth';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useOrganizations } from '@/lib/hooks/use-organizations';
import { friendlyError } from '@/lib/friendly-error';
import { userClient } from '@modules/grpc/clients/userClient';
import { authClient } from '@modules/grpc/clients/authClient';
import { apiKeyClient } from '@modules/grpc/clients/apiKeyClient';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { InvoiceStatus } from '@modules/grpc/library/blockjoy/v1/org';
import type { Address } from '@modules/grpc/library/blockjoy/common/v1/address';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { validatePassword } from '@/lib/password-validation';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Check,
  User,
  Lock,
  AlertTriangle,
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  CreditCard,
  MapPin,
  FileText,
  Download,
  Pencil,
  Receipt,
} from 'lucide-react';

function getHasStripe(): boolean {
  return !!process.env.NEXT_PUBLIC_STRIPE_KEY;
}

function getStripeKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_KEY;
}

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  if (!stripePromise) {
    const key = getStripeKey();
    if (key) stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// ─── Helpers ─────────────────────────────────────────────────────

function groupPermissions(permissions: string[]): Record<string, string[]> {
  const grouped = permissions.reduce(
    (acc: Record<string, string[]>, perm) => {
      const group = perm.split('-')[0];
      if (!acc[group]) acc[group] = [];
      acc[group].push(perm);
      return acc;
    },
    {} as Record<string, string[]>,
  );
  return Object.keys(grouped)
    .sort()
    .reduce(
      (sorted, group) => {
        sorted[group] = grouped[group].sort();
        return sorted;
      },
      {} as Record<string, string[]>,
    );
}

function formatPermissionName(perm: string): string {
  return perm.split('-').slice(1).join('-');
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
      title="Copy"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      {children}
    </section>
  );
}

// ─── Profile section ─────────────────────────────────────────────

function ProfileSection() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () => {
      await userClient.updateUser({
        userId: user!.userId,
        firstName,
        lastName,
      });
      const raw = localStorage.getItem('identity');
      if (raw) {
        const identity = JSON.parse(raw);
        identity.firstName = firstName;
        identity.lastName = lastName;
        localStorage.setItem('identity', JSON.stringify(identity));
      }
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  return (
    <Section id="profile">
      <div className="mb-4">
        <h2 className="text-lg font-medium">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Update your personal information
        </p>
      </div>
      <div className="max-w-lg space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={user?.email ?? ''}
            disabled
            className="h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-2"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>
    </Section>
  );
}

// ─── Account section ─────────────────────────────────────────────

function AccountSection() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [showDeactivate, setShowDeactivate] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword)
        throw new Error('Passwords do not match');
      const passwordCheck = validatePassword(newPassword);
      if (!passwordCheck.isValid)
        throw new Error(passwordCheck.errors.join('. '));
      await authClient.updatePassword({
        old_pwd: currentPassword,
        new_pwd: newPassword,
        new_pwd_confirmation: confirmPassword,
      });
    },
    onSuccess: () => {
      setPasswordSaved(true);
      setPasswordError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 3000);
    },
    onError: (err: Error) => setPasswordError(err.message),
  });

  const handleDeactivate = () => {
    if (confirmEmail === user?.email) {
      localStorage.removeItem('identity');
      window.location.href = '/deactivated';
    }
  };

  return (
    <Section id="account">
      <div className="mb-4">
        <h2 className="text-lg font-medium">Account</h2>
        <p className="text-sm text-muted-foreground">
          Security and account management
        </p>
      </div>

      {/* Change password */}
      <div className="max-w-lg space-y-4 rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-medium">Change Password</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">New Password</label>
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            showStrength
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {passwordError && (
          <p className="text-sm text-destructive">{passwordError}</p>
        )}
        <Button
          onClick={() => passwordMutation.mutate()}
          disabled={
            passwordMutation.isPending ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword
          }
          className="gap-2"
        >
          {passwordMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : passwordSaved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {passwordSaved ? 'Password Updated!' : 'Update Password'}
        </Button>
      </div>

      {/* Danger zone */}
      <div className="mt-6 max-w-lg rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h3 className="mb-3 text-sm font-medium text-destructive">
          Danger Zone
        </h3>
        {!showDeactivate ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Deactivate Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently deactivate your account and all data
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeactivate(true)}
            >
              Deactivate
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-medium">Are you sure?</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Type{' '}
              <span className="font-medium text-foreground">{user?.email}</span>{' '}
              to confirm deactivation.
            </p>
            <input
              type="text"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Type your email to confirm"
              className="h-9 w-full rounded-md border border-destructive/40 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeactivate(false);
                  setConfirmEmail('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={confirmEmail !== user?.email}
                onClick={handleDeactivate}
              >
                Permanently Deactivate
              </Button>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Permission display badges ───────────────────────────────────

function PermissionBadges({ permissions }: { permissions: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);
  const groupNames = Object.keys(grouped);

  if (permissions.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">
        No permissions
      </span>
    );
  }

  if (!expanded) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {groupNames.slice(0, 5).map((group) => (
          <span
            key={group}
            className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {group}
            <span className="ml-1 text-foreground/70">
              ({grouped[group].length})
            </span>
          </span>
        ))}
        {groupNames.length > 5 && (
          <span className="text-[10px] text-muted-foreground">
            +{groupNames.length - 5} more
          </span>
        )}
        <button
          onClick={() => setExpanded(true)}
          className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
        >
          show all <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groupNames.map((group) => (
        <div key={group}>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {group}
          </span>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {grouped[group].map((perm) => (
              <span
                key={perm}
                className="inline-flex items-center rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {formatPermissionName(perm)}
              </span>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={() => setExpanded(false)}
        className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
      >
        collapse <ChevronUp className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Permission selector (create form) ───────────────────────────

function PermissionSelector({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: string[];
  onChange: (perms: string[]) => void;
}) {
  const grouped = useMemo(() => groupPermissions(available), [available]);
  const groupNames = Object.keys(grouped);
  const allSelected =
    selected.length === available.length && available.length > 0;

  const togglePermission = (perm: string) => {
    if (selected.includes(perm)) {
      onChange(selected.filter((p) => p !== perm));
    } else {
      onChange([...selected, perm]);
    }
  };

  const toggleGroup = (group: string) => {
    const groupPerms = grouped[group];
    const allGroupSelected = groupPerms.every((p) => selected.includes(p));
    if (allGroupSelected) {
      onChange(selected.filter((p) => !groupPerms.includes(p)));
    } else {
      onChange(Array.from(new Set([...selected, ...groupPerms])));
    }
  };

  const toggleAll = () => onChange(allSelected ? [] : [...available]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Permissions</label>
        <button
          type="button"
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          {allSelected ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="max-h-64 overflow-auto rounded-md border border-input bg-background p-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {groupNames.map((group) => {
            const groupPerms = grouped[group];
            const allGroupSelected = groupPerms.every((p) =>
              selected.includes(p),
            );
            const someGroupSelected =
              !allGroupSelected && groupPerms.some((p) => selected.includes(p));
            return (
              <div key={group} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-2 rounded px-1 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
                      allGroupSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : someGroupSelected
                          ? 'border-primary bg-primary/30'
                          : 'border-input'
                    }`}
                  >
                    {allGroupSelected && <Check className="h-2.5 w-2.5" />}
                    {someGroupSelected && !allGroupSelected && (
                      <span className="block h-1.5 w-1.5 rounded-sm bg-primary" />
                    )}
                  </span>
                  {group}
                </button>
                <div className="space-y-0.5 pl-1">
                  {groupPerms.map((perm) => {
                    const isSelected = selected.includes(perm);
                    return (
                      <label
                        key={perm}
                        className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs transition-colors hover:bg-accent/50"
                      >
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input'
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span className="text-muted-foreground">
                          {formatPermissionName(perm)}
                        </span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePermission(perm)}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {selected.length} of {available.length} permissions selected
      </p>
    </div>
  );
}

// ─── API Keys section ────────────────────────────────────────────

function ApiKeysSection() {
  const { user } = useAuth();
  const { isSuperUser, permissions: userPermissions } = usePermissions();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>([]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => apiKeyClient.listApiKeys(),
    enabled: Boolean(user?.userId),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = await apiKeyClient.createApiKey({
        label: newKeyLabel,
        resource: undefined,
        permissions: newKeyPermissions,
      });
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      setNewKeyLabel('');
      setNewKeyPermissions([]);
      setShowCreate(false);
      if (data?.apiKey) {
        setCreatedToken(data.apiKey);
        setShowToken(true);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (apiKeyId: string) => apiKeyClient.deleteApiKey({ apiKeyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      setDeletingId(null);
    },
  });

  // Auto-dismiss created API key token after 60 seconds or tab switch
  useEffect(() => {
    if (!showToken || !createdToken) return;

    // Auto-dismiss after 60 seconds
    const timer = setTimeout(() => {
      setCreatedToken(null);
      setShowToken(false);
    }, 60_000);

    // Clear when user switches away from tab
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCreatedToken(null);
        setShowToken(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showToken, createdToken]);

  if (!isSuperUser) {
    return null;
  }

  return (
    <Section id="api-keys">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access
          </p>
        </div>
        {!showCreate && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => {
              setNewKeyPermissions([...userPermissions]);
              setShowCreate(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Key
          </Button>
        )}
      </div>

      {/* Created token banner */}
      {createdToken && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="mb-2 text-sm font-medium text-success">
            API Key Created
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            Copy this token now — you won't be able to see it again.
          </p>
          <div className="flex items-center gap-2 rounded-md bg-background p-2">
            <code className="flex-1 break-all text-xs">
              {showToken ? createdToken : '••••••••••••••••••••••••'}
            </code>
            <button
              onClick={() => setShowToken((p) => !p)}
              className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent"
            >
              {showToken ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
            <CopyBtn value={createdToken} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            This key will be hidden automatically for security. Copy it now.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setCreatedToken(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 space-y-4 rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium">Create New API Key</h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Label</label>
            <input
              type="text"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="e.g. CI/CD Pipeline"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
          </div>
          <Separator />
          <PermissionSelector
            available={userPermissions}
            selected={newKeyPermissions}
            onChange={setNewKeyPermissions}
          />
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowCreate(false);
                setNewKeyLabel('');
                setNewKeyPermissions([]);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                !newKeyLabel.trim() ||
                newKeyPermissions.length === 0 ||
                createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
              className="gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Key className="h-3.5 w-3.5" />
              )}
              Create Key
            </Button>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-destructive">
              {friendlyError(createMutation.error)}
            </p>
          )}
        </div>
      )}

      {/* Key list */}
      <div className="rounded-lg border border-border">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Key className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No API keys yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              Create a key to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {apiKeys.map((key: any) => {
              const isExpanded = expandedKeyId === key.apiKeyId;
              const keyPermissions: string[] = key.permissions ?? [];
              return (
                <div key={key.apiKeyId} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Key className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {key.label || 'Unnamed Key'}
                        </p>
                        {key.createdAt && (
                          <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(key.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {key.apiKeyId}
                      </p>
                      <div className="mt-2">
                        {isExpanded ? (
                          <>
                            <PermissionBadges permissions={keyPermissions} />
                            <button
                              onClick={() => setExpandedKeyId(null)}
                              className="mt-1 text-[10px] text-primary hover:underline"
                            >
                              hide permissions
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {keyPermissions.length} permission
                              {keyPermissions.length !== 1 ? 's' : ''}
                            </span>
                            <button
                              onClick={() => setExpandedKeyId(key.apiKeyId)}
                              className="text-[10px] text-primary hover:underline"
                            >
                              show
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {deletingId === key.apiKeyId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-destructive">
                            Delete?
                          </span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => deleteMutation.mutate(key.apiKeyId)}
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Yes'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => setDeletingId(null)}
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(key.apiKeyId)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Main page ───────────────────────────────────────────────────

// ─── Subscription section ────────────────────────────────────────

function SubscriptionSection() {
  const { defaultOrg } = useOrganizations();
  const { hasPermission } = usePermissions();
  const orgId = defaultOrg?.orgId;

  const canView = hasPermission('org-billing-get-billing-details');

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => organizationClient.getSubscription(orgId!),
    enabled: Boolean(orgId && canView),
  });

  if (!canView) return null;

  const formatDate = (d: Date | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (cents: number | undefined) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Section id="subscription">
      <h2 className="text-lg font-medium">Subscription</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your current plan and billing cycle
      </p>

      {isLoading ? (
        <div className="mt-4 rounded-lg border bg-card p-5 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
      ) : !subscription ? (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No active subscription
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                subscription.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : subscription.status === 'trialing'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-yellow-500/10 text-yellow-500'
              }`}
            >
              {subscription.status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Period</span>
            <span className="text-sm text-muted-foreground">
              {formatDate(subscription.currentPeriodStart)} –{' '}
              {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>

          {subscription.items.length > 0 && (
            <div className="border-t pt-3">
              <span className="text-sm font-medium">Plan Items</span>
              <div className="mt-2 space-y-2">
                {subscription.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span>{item.name ?? 'Item'}</span>
                    <span className="text-muted-foreground">
                      {formatAmount(item.unitAmount)}
                      {item.quantity != null && item.quantity > 1
                        ? ` × ${item.quantity}`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ─── Payment Methods section ─────────────────────────────────────

function AddCardForm({
  orgId,
  userId,
  onSuccess,
  onCancel,
}: {
  orgId: string;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setError('');
    try {
      const clientSecret = await organizationClient.initCard(orgId, userId);
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error: stripeError } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: { name },
          },
        },
      );

      if (stripeError) throw new Error(stripeError.message);

      // Wait for Stripe webhook to process
      await new Promise((resolve) => setTimeout(resolve, 5000));
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 rounded-lg border bg-card p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Cardholder Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Name on card"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Card Details
        </label>
        <div className="rounded-md border bg-background px-3 py-2.5">
          <CardElement
            options={{
              style: {
                base: {
                  color: '#f0f0f2',
                  fontSize: '14px',
                  '::placeholder': { color: '#6e6e73' },
                },
                invalid: { color: '#da3d2f' },
              },
            }}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !stripe || !elements}
        >
          {isSubmitting && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          Save Card
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PaymentMethodsSection() {
  const { user } = useAuth();
  const { defaultOrg } = useOrganizations();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const orgId = defaultOrg?.orgId;

  const canView = hasPermission('org-billing-list-payment-methods');

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['paymentMethods', orgId],
    queryFn: () => organizationClient.listPaymentMethods(orgId!),
    enabled: Boolean(orgId && canView),
  });

  const [showAddCard, setShowAddCard] = useState(false);

  if (!canView) return null;

  const brandIcon = (brand: string) => {
    const b = brand.toLowerCase();
    if (b === 'visa') return '💳 Visa';
    if (b === 'mastercard') return '💳 Mastercard';
    if (b === 'amex') return '💳 Amex';
    if (b === 'discover') return '💳 Discover';
    return `💳 ${brand}`;
  };

  return (
    <Section id="payment-methods">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Payment Methods</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cards on file for your organization
          </p>
        </div>
        {!showAddCard && !isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCard(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Card
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
            >
              <Skeleton className="h-8 w-12 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : methods.length === 0 && !showAddCard ? (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No payment methods on file
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setShowAddCard(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Card
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {methods.map((pm) => (
            <div
              key={pm.id}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {pm.card ? brandIcon(pm.card.brand) : 'Card'} ····{' '}
                    {pm.card?.last4 ?? '????'}
                  </p>
                  {pm.card && (
                    <p className="text-xs text-muted-foreground">
                      Expires {String(pm.card.expMonth).padStart(2, '0')}/
                      {pm.card.expYear}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddCard && orgId && user?.userId && getStripe() && (
        <Elements stripe={getStripe()}>
          <AddCardForm
            orgId={orgId}
            userId={user.userId}
            onSuccess={() => {
              setShowAddCard(false);
              queryClient.refetchQueries({
                queryKey: ['paymentMethods', orgId],
              });
            }}
            onCancel={() => setShowAddCard(false)}
          />
        </Elements>
      )}
    </Section>
  );
}

// ─── Billing Address section ─────────────────────────────────────

function BillingAddressSection() {
  const { defaultOrg } = useOrganizations();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const orgId = defaultOrg?.orgId;

  const canView = hasPermission('org-address-get');

  const { data: address, isLoading } = useQuery({
    queryKey: ['billingAddress', orgId],
    queryFn: () => organizationClient.getBillingAddress(orgId!),
    enabled: Boolean(orgId && canView),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (address) {
      // Map fields – handle potential alternate field names from the API
      const raw = address as any;
      setForm({
        line1: address.line1 ?? raw.address ?? '',
        line2: address.line2 ?? '',
        city: address.city ?? '',
        state: address.state ?? '',
        postalCode: address.postalCode ?? raw.postal_code ?? raw.zip ?? '',
        country: address.country ?? '',
      });
    }
  }, [address]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await organizationClient.createBillingAddress(orgId!, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingAddress', orgId] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (!canView) {
    return null;
  }

  const updateField = (field: keyof Address, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      line1: 'Address Line 1',
      line2: 'Address Line 2',
      city: 'City',
      state: 'State / Province',
      postalCode: 'Postal Code',
      country: 'Country',
    };
    return labels[field] ?? field;
  };

  // Determine if the address object has any meaningful content
  const addressHasContent = address
    ? Boolean(
        address.line1 ||
        address.line2 ||
        address.city ||
        address.state ||
        address.postalCode ||
        address.country ||
        (address as any).address ||
        (address as any).postal_code ||
        (address as any).zip,
      )
    : false;

  return (
    <Section id="billing-address">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Billing Address</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Address used for invoices
          </p>
        </div>
        {!editing && !isLoading && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-lg border bg-card p-5 space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
      ) : editing ? (
        <div className="mt-4 space-y-4 rounded-lg border bg-card p-5">
          {(
            [
              'line1',
              'line2',
              'city',
              'state',
              'postalCode',
              'country',
            ] as const
          ).map((field) => (
            <div key={field}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {fieldLabel(field)}
              </label>
              <input
                type="text"
                value={form[field] ?? ''}
                onChange={(e) => updateField(field, e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder={fieldLabel(field)}
              />
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Save Address
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                if (address) {
                  const raw = address as any;
                  setForm({
                    line1: address.line1 ?? raw.address ?? '',
                    line2: address.line2 ?? '',
                    city: address.city ?? '',
                    state: address.state ?? '',
                    postalCode:
                      address.postalCode ?? raw.postal_code ?? raw.zip ?? '',
                    country: address.country ?? '',
                  });
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : !address || !addressHasContent ? (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No billing address on file
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setEditing(true)}
          >
            Add Address
          </Button>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border bg-card p-5 text-sm leading-relaxed">
          {(address.line1 || (address as any).address) && (
            <p>{address.line1 || (address as any).address}</p>
          )}
          {address.line2 && <p>{address.line2}</p>}
          {(address.city ||
            address.state ||
            address.postalCode ||
            (address as any).postal_code ||
            (address as any).zip) && (
            <p>
              {[
                address.city,
                address.state,
                address.postalCode ||
                  (address as any).postal_code ||
                  (address as any).zip,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {address.country && <p>{address.country}</p>}
          {saved && (
            <p className="mt-2 flex items-center gap-1 text-xs text-emerald-500">
              <Check className="h-3.5 w-3.5" /> Address saved
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

// ─── Invoices section ────────────────────────────────────────────

function InvoicesSection() {
  const { defaultOrg } = useOrganizations();
  const { hasPermission } = usePermissions();
  const orgId = defaultOrg?.orgId;

  const canView = hasPermission('org-billing-get-billing-details');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', orgId],
    queryFn: () => organizationClient.getInvoices(orgId!),
    enabled: Boolean(orgId && canView),
  });

  if (!canView) return null;

  const statusLabel = (s: InvoiceStatus | undefined): string => {
    switch (s) {
      case InvoiceStatus.INVOICE_STATUS_PAID:
        return 'Paid';
      case InvoiceStatus.INVOICE_STATUS_OPEN:
        return 'Open';
      case InvoiceStatus.INVOICE_STATUS_DRAFT:
        return 'Draft';
      case InvoiceStatus.INVOICE_STATUS_VOID:
        return 'Void';
      case InvoiceStatus.INVOICE_STATUS_UNCOLLECTIBLE:
        return 'Uncollectible';
      default:
        return 'Unknown';
    }
  };

  const statusColor = (s: InvoiceStatus | undefined): string => {
    switch (s) {
      case InvoiceStatus.INVOICE_STATUS_PAID:
        return 'bg-emerald-500/10 text-emerald-500';
      case InvoiceStatus.INVOICE_STATUS_OPEN:
        return 'bg-blue-500/10 text-blue-500';
      case InvoiceStatus.INVOICE_STATUS_DRAFT:
        return 'bg-zinc-500/10 text-zinc-400';
      case InvoiceStatus.INVOICE_STATUS_VOID:
        return 'bg-red-500/10 text-red-400';
      case InvoiceStatus.INVOICE_STATUS_UNCOLLECTIBLE:
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const formatDate = (d: Date | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (cents: number | undefined) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Section id="invoices">
      <h2 className="text-lg font-medium">Invoices</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Billing history for your organization
      </p>

      {isLoading ? (
        <div className="mt-4 overflow-hidden rounded-lg border">
          <div className="flex gap-4 border-b bg-muted/50 px-4 py-2.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border/50 px-4 py-3"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-auto h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No invoices yet</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Invoice
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Total
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr
                  key={inv.number ?? i}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {inv.number ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(inv.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(inv.status)}`}
                    >
                      {statusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatAmount(inv.total)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {inv.pdfUrl ? (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Download PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-12 pb-[50vh]">
      <ProfileSection />
      <Separator />
      <AccountSection />
      <Separator />
      <ApiKeysSection />
    </div>
  );
}
