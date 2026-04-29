'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { friendlyError } from '@/lib/friendly-error';
import { useOrganizations } from '@/lib/hooks/use-organizations';
import { setExpectedNodeState } from '@/lib/hooks/use-mqtt';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { toast } from 'sonner';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { imageClient } from '@modules/grpc/clients/imageClient';
import { protocolClient } from '@modules/grpc/clients/protocolClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { NodeState } from '@modules/grpc/library/blockjoy/common/v1/node';
import type { Node } from '@modules/grpc/library/blockjoy/v1/node';
import {
  ArrowLeft,
  CircleCheck,
  CircleAlert,
  Clock,
  Loader2,
  Power,
  Trash2,
  Server,
  Copy,
  Check,
  ExternalLink,
  Activity,
  Shield,
  ShieldAlert,
  Blocks,
  Globe,
  HardDrive,
  MapPin,
  Calendar,
  Tag,
  RefreshCw,
  Square,
  Play,
  RotateCw,
  Percent,
  Network,
  SlidersHorizontal,
  AlertTriangle,
  ChevronDown,
  MoreHorizontal,
  Cpu,
  MemoryStick,
  Database,
  Building2,
  Pencil,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
  ArrowRightLeft,
  User,
  ArrowUpCircle,
} from 'lucide-react';

// ─── Status helpers ──────────────────────────────────────────────

function getStatusConfig(state: NodeState | undefined) {
  switch (state) {
    case NodeState.NODE_STATE_RUNNING:
      return {
        icon: CircleCheck,
        label: 'Running',
        className: 'text-success',
        bg: 'bg-success/10 border-success/20',
        pulse: 'bg-success',
      };
    case NodeState.NODE_STATE_STARTING:
      return {
        icon: Loader2,
        label: 'Starting',
        className: 'text-warning',
        bg: 'bg-warning/10 border-warning/20',
        pulse: 'bg-warning',
      };
    case NodeState.NODE_STATE_UPGRADING:
      return {
        icon: Loader2,
        label: 'Upgrading',
        className: 'text-warning',
        bg: 'bg-warning/10 border-warning/20',
        pulse: 'bg-warning',
      };
    case NodeState.NODE_STATE_STOPPED:
      return {
        icon: Power,
        label: 'Stopped',
        className: 'text-muted-foreground',
        bg: 'bg-muted border-border',
        pulse: 'bg-muted-foreground',
      };
    case NodeState.NODE_STATE_FAILED:
      return {
        icon: CircleAlert,
        label: 'Failed',
        className: 'text-destructive',
        bg: 'bg-destructive/10 border-destructive/20',
        pulse: 'bg-destructive',
      };
    case NodeState.NODE_STATE_DELETING:
      return {
        icon: Trash2,
        label: 'Deleting',
        className: 'text-warning',
        bg: 'bg-warning/10 border-warning/20',
        pulse: 'bg-warning',
      };
    case NodeState.NODE_STATE_DELETED:
      return {
        icon: Trash2,
        label: 'Deleted',
        className: 'text-muted-foreground',
        bg: 'bg-muted border-border',
        pulse: 'bg-muted-foreground',
      };
    default:
      return {
        icon: Clock,
        label: 'Unknown',
        className: 'text-muted-foreground',
        bg: 'bg-muted border-border',
        pulse: 'bg-muted-foreground',
      };
  }
}

const isActiveState = (state: NodeState | undefined) =>
  state === NodeState.NODE_STATE_RUNNING ||
  state === NodeState.NODE_STATE_STARTING ||
  state === NodeState.NODE_STATE_UPGRADING;

// ─── Clipboard helper ────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-success" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

// ─── Detail row ──────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  copyable,
  href,
}: {
  icon?: React.ElementType;
  label: string;
  value: string | undefined | null;
  mono?: boolean;
  copyable?: boolean;
  href?: string;
}) {
  if (!value && value !== '0') return null;

  return (
    <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/30">
      {Icon && (
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 flex items-center gap-1">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {value}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p
              className={`text-sm break-all ${mono ? 'font-mono text-xs leading-relaxed' : ''}`}
            >
              {value}
            </p>
          )}
          {copyable && value && (
            <span className="opacity-0 transition-opacity group-hover:opacity-100">
              <CopyButton value={value} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  accent?: 'success' | 'warning' | 'destructive' | 'default';
}) {
  const accentColors = {
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    default: 'text-foreground',
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p
        className={`mt-2 text-xl font-medium tracking-tight ${accentColors[accent ?? 'default']}`}
      >
        {value}
      </p>
      {subValue && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subValue}</p>
      )}
    </div>
  );
}

// ─── Status pill ─────────────────────────────────────────────────

function StatusPill({ node }: { node: Node }) {
  const status = getStatusConfig(node.nodeStatus?.state);
  const StatusIcon = status.icon;
  const active = isActiveState(node.nodeStatus?.state);

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 ${status.bg}`}
    >
      <div className="relative flex h-8 w-8 items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full ${status.pulse} opacity-20`}
        />
        {active && (
          <div
            className={`absolute inset-0 animate-ping rounded-full ${status.pulse} opacity-10`}
          />
        )}
        <StatusIcon className={`relative h-4 w-4 ${status.className}`} />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${status.className}`}>
            {status.label}
          </span>
          {active && (
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${status.pulse} opacity-75`}
              />
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${status.pulse}`}
              />
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {node.protocolName} · {node.semanticVersion || 'Unknown version'}
        </p>
      </div>
    </div>
  );
}

// ─── Admin actions dropdown ──────────────────────────────────────

function AdminActionsDropdown({
  node,
  onStart,
  onStop,
  onRestart,
  onDelete,
  isActing,
  canStart,
  canStop,
  canRestart,
  canDelete,
}: {
  node: Node;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onDelete: () => void;
  isActing: boolean;
  canStart: boolean;
  canStop: boolean;
  canRestart: boolean;
  canDelete: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isStopped = node.nodeStatus?.state === NodeState.NODE_STATE_STOPPED;
  const isRunning = node.nodeStatus?.state === NodeState.NODE_STATE_RUNNING;
  const isTransitioning =
    node.nodeStatus?.state === NodeState.NODE_STATE_STARTING ||
    node.nodeStatus?.state === NodeState.NODE_STATE_UPGRADING ||
    node.nodeStatus?.state === NodeState.NODE_STATE_DELETING;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as globalThis.Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  type ActionItem = {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    destructive?: boolean;
    separator?: boolean;
  };

  const items: ActionItem[] = [];

  if (isStopped && canStart) {
    items.push({
      label: 'Start',
      icon: Play,
      onClick: onStart,
    });
  }

  if (isRunning && canStop) {
    items.push({
      label: 'Stop',
      icon: Square,
      onClick: onStop,
    });
  }

  if (isRunning && canRestart) {
    items.push({
      label: 'Restart',
      icon: RotateCw,
      onClick: onRestart,
    });
  }

  if (canDelete && !isTransitioning) {
    items.push({
      label: 'Delete',
      icon: Trash2,
      onClick: onDelete,
      destructive: true,
      separator: items.length > 0,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        size="sm"
        variant="outline"
        className="gap-2"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isActing}
      >
        {isActing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <MoreHorizontal className="h-3.5 w-3.5" />
        )}
        Actions
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-md border border-border bg-popover py-1 shadow-lg">
          {items.map((item) => (
            <div key={item.label}>
              {item.separator && <div className="my-1 h-px bg-border" />}
              <button
                onClick={() => handleAction(item.onClick)}
                disabled={isActing}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  item.destructive
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-popover-foreground hover:bg-accent'
                } disabled:opacity-50`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Delete confirmation dialog ──────────────────────────────────

function DeleteConfirmation({
  nodeName,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  nodeName: string;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-in-up rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Delete Node</h3>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Are you sure you want to delete{' '}
          <span className="font-medium text-foreground">{nodeName}</span>? Type
          the node name below to confirm.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={nodeName}
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConfirmText('');
              onCancel();
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-2"
            onClick={onConfirm}
            disabled={isDeleting || confirmText !== nodeName}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {isDeleting ? 'Deleting…' : 'Delete Node'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline edit: Display Name ───────────────────────────────────

function EditDisplayName({
  nodeId,
  currentName,
}: {
  nodeId: string;
  currentName: string;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentName);

  const mutation = useMutation({
    mutationFn: (newDisplayName: string) =>
      nodeClient.updateNode({
        nodeId,
        newDisplayName,
        newValues: [],
      }),
    onSuccess: () => {
      toast.success('Display name updated');
      queryClient.refetchQueries({ queryKey: ['admin-node', nodeId] });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      toast.error('Failed to update display name', {
        description: err.message,
      });
    },
  });

  const handleSave = () => {
    if (value.trim() && value.trim() !== currentName) {
      mutation.mutate(value.trim());
    } else {
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/30">
        <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Display Name</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-sm">{currentName || '—'}</p>
            <button
              onClick={() => {
                setValue(currentName);
                setIsEditing(true);
              }}
              className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100"
              title="Edit display name"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-md bg-accent/20 px-3 py-2.5">
      <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Display Name</p>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setIsEditing(false);
            }}
          />
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="rounded p-1.5 text-success hover:bg-success/10 disabled:opacity-50"
            title="Save"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            disabled={mutation.isPending}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline edit: Note ───────────────────────────────────────────

function EditNote({
  nodeId,
  currentNote,
}: {
  nodeId: string;
  currentNote: string;
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentNote);

  const mutation = useMutation({
    mutationFn: (newNote: string) =>
      nodeClient.updateNode({
        nodeId,
        newNote,
        newValues: [],
      }),
    onSuccess: () => {
      toast.success('Note updated');
      queryClient.refetchQueries({ queryKey: ['admin-node', nodeId] });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      toast.error('Failed to update note', { description: err.message });
    },
  });

  const handleSave = () => {
    if (value.trim() !== currentNote) {
      mutation.mutate(value.trim());
    } else {
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/30">
        <Tag className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Note</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-sm whitespace-pre-wrap">{currentNote || '—'}</p>
            <button
              onClick={() => {
                setValue(currentNote);
                setIsEditing(true);
              }}
              className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100"
              title="Edit note"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-md bg-accent/20 px-3 py-2.5">
      <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Note</p>
        <div className="mt-1 space-y-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline edit: Change Org ─────────────────────────────────────

function ChangeOrg({
  nodeId,
  currentOrgId,
  currentOrgName,
}: {
  nodeId: string;
  currentOrgId: string;
  currentOrgName: string;
}) {
  const queryClient = useQueryClient();
  const { organizations } = useOrganizations();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState(currentOrgId);

  const mutation = useMutation({
    mutationFn: (newOrgId: string) =>
      nodeClient.updateNode({
        nodeId,
        newOrgId,
        newValues: [],
      }),
    onSuccess: () => {
      toast.success('Organization changed');
      queryClient.refetchQueries({ queryKey: ['admin-node', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'nodes'] });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      toast.error('Failed to change organization', {
        description: err.message,
      });
    },
  });

  const handleSave = () => {
    if (selectedOrgId && selectedOrgId !== currentOrgId) {
      mutation.mutate(selectedOrgId);
    } else {
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/30">
        <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Change Organization</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-sm">{currentOrgName}</p>
            <button
              onClick={() => {
                setSelectedOrgId(currentOrgId);
                setIsEditing(true);
              }}
              className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-accent hover:text-foreground group-hover:opacity-100"
              title="Change org"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-md bg-accent/20 px-3 py-2.5">
      <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Change Organization</p>
        <div className="mt-1 flex items-center gap-2">
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {organizations.map((org) => (
              <option key={org.orgId} value={org.orgId}>
                {org.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={mutation.isPending || selectedOrgId === currentOrgId}
            className="rounded p-1.5 text-success hover:bg-success/10 disabled:opacity-50"
            title="Save"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            disabled={mutation.isPending}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline edit: Auto-Upgrade toggle ────────────────────────────

function AutoUpgradeToggle({
  nodeId,
  currentValue,
}: {
  nodeId: string;
  currentValue: boolean;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (autoUpgrade: boolean) =>
      nodeClient.updateNode({
        nodeId,
        autoUpgrade,
        newValues: [],
      }),
    onSuccess: () => {
      toast.success('Auto-upgrade setting updated');
      queryClient.refetchQueries({ queryKey: ['admin-node', nodeId] });
    },
    onError: (err: Error) => {
      toast.error('Failed to update auto-upgrade', {
        description: err.message,
      });
    },
  });

  const ToggleIcon = currentValue ? ToggleRight : ToggleLeft;

  return (
    <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/30">
      <ToggleIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Auto-Upgrade</p>
        <div className="mt-1 flex items-center gap-3">
          <button
            onClick={() => mutation.mutate(!currentValue)}
            disabled={mutation.isPending}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
              currentValue ? 'bg-primary' : 'bg-border'
            }`}
            role="switch"
            aria-checked={currentValue}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                currentValue ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className="text-sm">
            {currentValue ? 'Enabled' : 'Disabled'}
          </span>
          {mutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Upgrade / Downgrade Version ─────────────────────────────────

function UpgradeVersion({ nodeId, node }: { nodeId: string; node: Node }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentVersion = node.semanticVersion || 'unknown';
  const versionKey = node.versionKey;

  const {
    data: versions,
    isLoading: versionsLoading,
    error: versionsError,
  } = useQuery({
    queryKey: [
      'admin',
      'versions',
      versionKey?.protocolKey,
      versionKey?.variantKey,
      node.orgId,
    ],
    queryFn: () =>
      protocolClient.listVersions({
        versionKey: versionKey!,
        orgId: node.orgId,
      }),
    enabled: isEditing && !!versionKey,
  });

  const toNums = (v: string) =>
    v.split('.').map((s) => parseInt(s.replace(/\D/g, ''), 10) || 0);

  const sortedVersions = (versions ?? [])
    .map((v) => v.semanticVersion)
    .filter(Boolean)
    .sort((a, b) => {
      const pa = toNums(a);
      const pb = toNums(b);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

  const upgradeMutation = useMutation({
    mutationFn: async (newVersion: string) => {
      const imageResp = await imageClient.getImage({
        versionKey: node.versionKey,
        orgId: node.orgId,
        semanticVersion: newVersion,
      });
      const newImageId = imageResp.image?.imageId;
      if (!newImageId) throw new Error('Image not found for selected version');
      await nodeClient.upgradeNode([nodeId], newImageId);
    },
    onSuccess: () => {
      toast.success('Version change requested');
      queryClient.refetchQueries({ queryKey: ['admin-node', nodeId] });
      setIsEditing(false);
      setSelectedVersion('');
    },
    onError: (err: Error) => toast.error(`Upgrade failed: ${err.message}`),
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as globalThis.Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleApply = () => {
    if (!selectedVersion || selectedVersion === currentVersion) return;
    upgradeMutation.mutate(selectedVersion);
  };

  return (
    <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/30">
      <ArrowUpCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          Upgrade/Downgrade Version
        </p>
        {!isEditing ? (
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-sm font-mono">{currentVersion}</span>
            <button
              onClick={() => setIsEditing(true)}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="mt-1 space-y-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent/30"
              >
                <span
                  className={selectedVersion ? '' : 'text-muted-foreground'}
                >
                  {selectedVersion || 'Select a version...'}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isDropdownOpen && (
                <div className="absolute left-0 z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg">
                  {versionsLoading ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-xs text-muted-foreground">
                        Loading versions...
                      </span>
                    </div>
                  ) : versionsError ? (
                    <p className="px-3 py-2 text-xs text-destructive">
                      Failed to load versions
                    </p>
                  ) : sortedVersions.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No versions available
                    </p>
                  ) : (
                    sortedVersions.map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          setSelectedVersion(v);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                          v === selectedVersion ? 'bg-accent font-medium' : ''
                        }`}
                      >
                        <span className="font-mono">{v}</span>
                        {v === currentVersion && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            current
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="h-7 gap-1.5 text-xs"
                disabled={
                  !selectedVersion ||
                  selectedVersion === currentVersion ||
                  upgradeMutation.isPending
                }
                onClick={handleApply}
              >
                {upgradeMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowUpCircle className="h-3 w-3" />
                )}
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 text-xs"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedVersion('');
                  setIsDropdownOpen(false);
                }}
              >
                <X className="h-3 w-3" />
                Cancel
              </Button>
              {selectedVersion && selectedVersion !== currentVersion && (
                <span className="text-xs text-muted-foreground">
                  {currentVersion} → {selectedVersion}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-5 space-y-4"
          >
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page component ─────────────────────────────────────────

export default function AdminNodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const nodeId = params.id as string;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    isSuperUser,
    canStartNode,
    canStopNode,
    canRestartNode,
    canDeleteNode,
  } = usePermissions();

  const addNotification = useNotificationStore((s) => s.addNotification);

  const {
    data: node,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-node', nodeId],
    queryFn: () => nodeClient.getNode(nodeId),
    enabled: Boolean(nodeId),
    staleTime: 0,
    refetchInterval: 5000,
  });

  const nodeName =
    node?.sqdName || node?.displayName || node?.nodeName || 'Node';

  // ─── Mutations ──────────────────────────────────────────────────

  const startMutation = useMutation({
    mutationFn: () => nodeClient.startNode(nodeId),
    onSuccess: () => {
      toast.success('Command sent', { description: `Starting ${nodeName}` });
      setExpectedNodeState(nodeId, NodeState.NODE_STATE_STARTING);
      addNotification({
        type: 'node-updated',
        title: 'Start Requested',
        message: `${nodeName} is starting`,
        nodeId,
      });
      queryClient.refetchQueries({ queryKey: ['admin-node', nodeId] });
      queryClient.refetchQueries({ queryKey: ['admin', 'nodes'] });
    },
    onError: (err: Error) => {
      toast.error('Command failed', { description: err.message });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => nodeClient.stopNode(nodeId),
    onSuccess: () => {
      toast.success('Command sent', { description: `Stopping ${nodeName}` });
      setExpectedNodeState(nodeId, NodeState.NODE_STATE_STOPPED);
      addNotification({
        type: 'node-updated',
        title: 'Stop Requested',
        message: `${nodeName} is stopping`,
        nodeId,
      });
      queryClient.refetchQueries({ queryKey: ['admin-node', nodeId] });
      queryClient.refetchQueries({ queryKey: ['admin', 'nodes'] });
    },
    onError: (err: Error) => {
      toast.error('Command failed', { description: err.message });
    },
  });

  const restartMutation = useMutation({
    mutationFn: () => nodeClient.restartNode(nodeId),
    onSuccess: () => {
      toast.success('Command sent', { description: `Restarting ${nodeName}` });
      setExpectedNodeState(nodeId, NodeState.NODE_STATE_STARTING);
      addNotification({
        type: 'node-updated',
        title: 'Restart Requested',
        message: `${nodeName} is restarting`,
        nodeId,
      });
      queryClient.refetchQueries({ queryKey: ['admin-node', nodeId] });
      queryClient.refetchQueries({ queryKey: ['admin', 'nodes'] });
    },
    onError: (err: Error) => {
      toast.error('Command failed', { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => nodeClient.deleteNode(nodeId),
    onSuccess: () => {
      toast.success('Command sent', { description: `Deleting ${nodeName}` });
      setExpectedNodeState(nodeId, NodeState.NODE_STATE_DELETED);
      addNotification({
        type: 'node-deleted',
        title: 'Node Deleted',
        message: `${nodeName} was deleted`,
        nodeId,
      });
      queryClient.refetchQueries({ queryKey: ['admin', 'nodes'] });
      router.push('/admin/nodes');
    },
    onError: (err: Error) => {
      toast.error('Command failed', { description: err.message });
      setShowDeleteConfirm(false);
    },
  });

  const isActing =
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending ||
    deleteMutation.isPending;

  // ─── Derived data ───────────────────────────────────────────────

  const rpcUrl = node?.dnsName ? `https://${node.dnsName}` : undefined;

  const nodeType = node?.versionMetadata?.find(
    (m) => m.metadataKey === 'node-type',
  )?.value;

  const networkName = node?.versionMetadata?.find(
    (m) => m.metadataKey === 'network',
  )?.value;

  const healthLabels = ['Unknown', 'Healthy', 'Unhealthy', 'Degraded'];
  const protocolHealth =
    node?.nodeStatus?.protocol?.health !== undefined
      ? (healthLabels[node.nodeStatus.protocol.health] ?? 'Unknown')
      : '—';

  const protocolState = node?.nodeStatus?.protocol?.state || '—';

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => router.push('/admin/nodes')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Nodes
      </Button>

      {isLoading ? (
        <DetailSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <CircleAlert className="mb-3 h-10 w-10 text-destructive" />
          <h3 className="text-lg font-medium">Failed to load node</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {friendlyError(error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : node ? (
        <>
          {/* ─── Header ──────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <SlidersHorizontal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-medium tracking-tight">
                    {node.sqdName || node.displayName || node.nodeName}
                  </h1>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    ADMIN
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {node.orgName} · {node.nodeId?.slice(0, 8)}…
                  <CopyButton value={node.nodeId} />
                </p>
              </div>
            </div>
          </div>

          {/* ─── Status + Actions row ────────────────────── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <StatusPill node={node} />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => router.push(`/nodes/${node.nodeId}`)}
              >
                <Server className="h-3.5 w-3.5" />
                User View
              </Button>
              <AdminActionsDropdown
                node={node}
                onStart={() => startMutation.mutate()}
                onStop={() => stopMutation.mutate()}
                onRestart={() => restartMutation.mutate()}
                onDelete={() => setShowDeleteConfirm(true)}
                isActing={isActing}
                canStart={canStartNode}
                canStop={canStopNode}
                canRestart={canRestartNode}
                canDelete={canDeleteNode}
              />
            </div>
          </div>

          {/* Delete confirmation dialog */}
          <DeleteConfirmation
            nodeName={node.sqdName || node.displayName || node.nodeName}
            isOpen={showDeleteConfirm}
            isDeleting={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate()}
            onCancel={() => setShowDeleteConfirm(false)}
          />

          {/* ─── Jailed alert ────────────────────────────── */}
          {node.jailed && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Node is Jailed
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {node.jailedReason || 'No reason provided.'}
                </p>
              </div>
            </div>
          )}

          {/* ─── Key metrics row ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Blocks}
              label="Block Height"
              value={
                node.blockHeight !== undefined && node.blockHeight > -1
                  ? node.blockHeight.toLocaleString()
                  : '—'
              }
              accent={
                node.blockHeight !== undefined && node.blockHeight > -1
                  ? 'default'
                  : 'warning'
              }
              subValue={
                node.blockHeight !== undefined && node.blockHeight > -1
                  ? 'Synced'
                  : 'Syncing…'
              }
            />
            <StatCard
              icon={Activity}
              label="Protocol Health"
              value={protocolHealth}
              accent={
                node.nodeStatus?.protocol?.health === 1
                  ? 'success'
                  : node.nodeStatus?.protocol?.health === 3
                    ? 'warning'
                    : node.nodeStatus?.protocol?.health === 2
                      ? 'destructive'
                      : 'default'
              }
            />
            {node.apr !== undefined ? (
              <StatCard
                icon={Percent}
                label="APR"
                value={`${Number(node.apr).toFixed(2)}%`}
                accent={Number(node.apr) > 0 ? 'success' : 'default'}
              />
            ) : (
              <StatCard
                icon={Globe}
                label="Network"
                value={
                  networkName
                    ? networkName.charAt(0).toUpperCase() + networkName.slice(1)
                    : node.versionKey?.variantKey || '—'
                }
              />
            )}
            <StatCard
              icon={Calendar}
              label="Created"
              value={
                node.createdAt
                  ? new Date(node.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'
              }
              subValue={
                node.createdAt
                  ? new Date(node.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : undefined
              }
            />
          </div>

          {/* ─── VM Resources ────────────────────────────── */}
          {node.config?.vm && (
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={Cpu}
                label="CPU Cores"
                value={`${node.config.vm.cpuCores}`}
                subValue="allocated"
              />
              <StatCard
                icon={MemoryStick}
                label="Memory"
                value={
                  node.config.vm.memoryBytes > 0
                    ? `${(node.config.vm.memoryBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
                    : '—'
                }
                subValue="allocated"
              />
              <StatCard
                icon={Database}
                label="Disk"
                value={
                  node.config.vm.diskBytes > 0
                    ? node.config.vm.diskBytes >= 1024 ** 4
                      ? `${(node.config.vm.diskBytes / 1024 ** 4).toFixed(2)} TB`
                      : `${(node.config.vm.diskBytes / (1024 * 1024 * 1024)).toFixed(0)} GB`
                    : '—'
                }
                subValue="allocated"
              />
            </div>
          )}

          {/* ─── Admin editable fields ───────────────────── */}
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-primary">
              <SlidersHorizontal className="h-4 w-4" />
              Admin Controls
            </h2>
            <div className="-mx-3 divide-y divide-border/50">
              <EditDisplayName
                nodeId={node.nodeId}
                currentName={node.displayName || ''}
              />
              <ChangeOrg
                nodeId={node.nodeId}
                currentOrgId={node.orgId}
                currentOrgName={node.orgName}
              />
              <AutoUpgradeToggle
                nodeId={node.nodeId}
                currentValue={node.autoUpgrade}
              />
              <EditNote nodeId={node.nodeId} currentNote={node.note || ''} />
              <UpgradeVersion nodeId={node.nodeId} node={node} />
            </div>
          </div>

          {/* ─── Detail cards: ALL fields ─────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Identity */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Tag className="h-4 w-4" />
                Identity
              </h2>
              <div className="-mx-3">
                <DetailRow
                  icon={Server}
                  label="Node ID"
                  value={node.nodeId}
                  mono
                  copyable
                />
                <DetailRow
                  icon={Server}
                  label="Node Name"
                  value={node.nodeName}
                  copyable
                />
                <DetailRow
                  icon={Pencil}
                  label="Display Name"
                  value={node.displayName}
                  copyable
                />
                {node.sqdName && (
                  <DetailRow
                    icon={Tag}
                    label="SQD Name"
                    value={node.sqdName}
                    copyable
                  />
                )}
                <DetailRow
                  icon={Globe}
                  label="DNS Name"
                  value={node.dnsName}
                  mono
                  copyable
                />
                {node.dnsUrl && (
                  <DetailRow
                    icon={ExternalLink}
                    label="DNS URL"
                    value={node.dnsUrl}
                    href={node.dnsUrl}
                    copyable
                  />
                )}
                <DetailRow
                  icon={Building2}
                  label="Org Name"
                  value={node.orgName}
                />
                <DetailRow
                  icon={Building2}
                  label="Org ID"
                  value={node.orgId}
                  mono
                  copyable
                />
              </div>
            </div>

            {/* Network */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Network className="h-4 w-4" />
                Network
              </h2>
              <div className="-mx-3">
                <DetailRow
                  icon={Globe}
                  label="IP Address"
                  value={node.ipAddress}
                  mono
                  copyable
                />
                <DetailRow
                  icon={Globe}
                  label="IP Gateway"
                  value={node.ipGateway}
                  mono
                  copyable
                />
                {node.p2pAddress && (
                  <DetailRow
                    icon={Network}
                    label="P2P Address"
                    value={node.p2pAddress}
                    mono
                    copyable
                  />
                )}
                <DetailRow
                  icon={HardDrive}
                  label="Host Display Name"
                  value={node.hostDisplayName || undefined}
                />
                <DetailRow
                  icon={HardDrive}
                  label="Host ID"
                  value={node.hostId}
                  mono
                  copyable
                />
                <DetailRow
                  icon={HardDrive}
                  label="Host Network Name"
                  value={node.hostNetworkName}
                />
                {node.hostOrgId && (
                  <DetailRow
                    icon={Building2}
                    label="Host Org ID"
                    value={node.hostOrgId}
                    mono
                    copyable
                  />
                )}
                <DetailRow
                  icon={MapPin}
                  label="Region Name"
                  value={node.regionName}
                />
                <DetailRow
                  icon={MapPin}
                  label="Region Key"
                  value={node.regionKey}
                  mono
                  copyable
                />
                <DetailRow
                  icon={MapPin}
                  label="Region ID"
                  value={node.regionId}
                  mono
                  copyable
                />
              </div>
            </div>

            {/* Protocol */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Blocks className="h-4 w-4" />
                Protocol
              </h2>
              <div className="-mx-3">
                <DetailRow label="Protocol Name" value={node.protocolName} />
                <DetailRow
                  label="Protocol ID"
                  value={node.protocolId}
                  mono
                  copyable
                />
                <DetailRow
                  label="Protocol Version ID"
                  value={node.protocolVersionId}
                  mono
                  copyable
                />
                <DetailRow
                  label="Semantic Version"
                  value={node.semanticVersion || 'Latest'}
                />
                <DetailRow
                  label="Variant Key"
                  value={node.versionKey?.variantKey}
                  mono
                />
                <DetailRow
                  label="Protocol Key"
                  value={node.versionKey?.protocolKey}
                  mono
                />
                {nodeType && (
                  <DetailRow
                    label="Node Type"
                    value={nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}
                  />
                )}
                <DetailRow
                  icon={Blocks}
                  label="Block Height"
                  value={
                    node.blockHeight !== undefined && node.blockHeight > -1
                      ? node.blockHeight.toLocaleString()
                      : '—'
                  }
                />
                {node.apr !== undefined && (
                  <DetailRow
                    icon={Percent}
                    label="APR"
                    value={`${Number(node.apr).toFixed(2)}%`}
                  />
                )}
                <DetailRow
                  icon={node.jailed ? ShieldAlert : Shield}
                  label="Jailed"
                  value={node.jailed ? 'Yes' : 'No'}
                />
                {node.jailedReason && (
                  <DetailRow
                    icon={CircleAlert}
                    label="Jailed Reason"
                    value={node.jailedReason}
                  />
                )}
              </div>
            </div>

            {/* Status */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Activity className="h-4 w-4" />
                Status
              </h2>
              <div className="-mx-3">
                <DetailRow
                  label="Node State"
                  value={getStatusConfig(node.nodeStatus?.state).label}
                />
                <DetailRow
                  label="Node State (raw)"
                  value={
                    node.nodeStatus?.state !== undefined
                      ? String(node.nodeStatus.state)
                      : '—'
                  }
                  mono
                />
                <DetailRow label="Protocol Health" value={protocolHealth} />
                <DetailRow label="Protocol State" value={protocolState} />
                {node.nodeStatus?.next !== undefined && (
                  <DetailRow
                    label="Next State"
                    value={String(node.nodeStatus.next)}
                    mono
                  />
                )}
                <DetailRow
                  label="Image ID"
                  value={node.imageId}
                  mono
                  copyable
                />
                <DetailRow
                  label="Config ID"
                  value={node.configId}
                  mono
                  copyable
                />
              </div>
            </div>

            {/* Config */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Cpu className="h-4 w-4" />
                Config
              </h2>
              <div className="-mx-3">
                <DetailRow
                  label="Auto-Upgrade"
                  value={node.autoUpgrade ? 'Enabled' : 'Disabled'}
                />
                {node.config?.vm && (
                  <>
                    <DetailRow
                      icon={Cpu}
                      label="VM CPU Cores"
                      value={String(node.config.vm.cpuCores)}
                    />
                    <DetailRow
                      icon={MemoryStick}
                      label="VM Memory"
                      value={
                        node.config.vm.memoryBytes > 0
                          ? `${(node.config.vm.memoryBytes / (1024 * 1024 * 1024)).toFixed(1)} GB (${node.config.vm.memoryBytes} bytes)`
                          : '—'
                      }
                    />
                    <DetailRow
                      icon={Database}
                      label="VM Disk"
                      value={
                        node.config.vm.diskBytes > 0
                          ? node.config.vm.diskBytes >= 1024 ** 4
                            ? `${(node.config.vm.diskBytes / 1024 ** 4).toFixed(2)} TB (${node.config.vm.diskBytes} bytes)`
                            : `${(node.config.vm.diskBytes / (1024 * 1024 * 1024)).toFixed(0)} GB (${node.config.vm.diskBytes} bytes)`
                          : '—'
                      }
                    />
                  </>
                )}
                {rpcUrl && (
                  <DetailRow
                    icon={ExternalLink}
                    label="RPC URL"
                    value={rpcUrl}
                    href={rpcUrl}
                    copyable
                  />
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Timestamps
              </h2>
              <div className="-mx-3">
                <DetailRow
                  icon={Calendar}
                  label="Created At"
                  value={
                    node.createdAt
                      ? new Date(node.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '—'
                  }
                />
                <DetailRow
                  icon={Calendar}
                  label="Updated At"
                  value={
                    node.updatedAt
                      ? new Date(node.updatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '—'
                  }
                />
                <DetailRow
                  icon={User}
                  label="Created By"
                  value={
                    node.createdBy
                      ? `${node.createdBy.resourceType ?? 'unknown'}:${node.createdBy.resourceId ?? '—'}`
                      : '—'
                  }
                  mono
                  copyable
                />
              </div>
            </div>
          </div>

          {/* ─── Version Metadata ────────────────────────── */}
          {node.versionMetadata && node.versionMetadata.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                <Tag className="h-4 w-4" />
                Version Metadata
              </h2>
              <div className="-mx-3">
                {node.versionMetadata.map((meta) => (
                  <DetailRow
                    key={meta.metadataKey}
                    label={meta.metadataKey}
                    value={meta.value}
                    mono
                    copyable
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── Note section ────────────────────────────── */}
          {node.note && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Note
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {node.note}
              </p>
            </div>
          )}

          {/* ─── Raw IDs (debug) ─────────────────────────── */}
          <div className="rounded-lg border border-dashed border-border/50 bg-muted/30 p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              <Database className="h-4 w-4" />
              Raw IDs (Debug)
            </h2>
            <div className="grid grid-cols-1 gap-1 text-xs font-mono text-muted-foreground md:grid-cols-2">
              <div className="flex items-center gap-2 py-1">
                <span className="text-foreground/60">nodeId:</span>
                <span className="break-all">{node.nodeId}</span>
                <CopyButton value={node.nodeId} />
              </div>
              <div className="flex items-center gap-2 py-1">
                <span className="text-foreground/60">orgId:</span>
                <span className="break-all">{node.orgId}</span>
                <CopyButton value={node.orgId} />
              </div>
              <div className="flex items-center gap-2 py-1">
                <span className="text-foreground/60">hostId:</span>
                <span className="break-all">{node.hostId}</span>
                <CopyButton value={node.hostId} />
              </div>
              <div className="flex items-center gap-2 py-1">
                <span className="text-foreground/60">imageId:</span>
                <span className="break-all">{node.imageId}</span>
                <CopyButton value={node.imageId} />
              </div>
              <div className="flex items-center gap-2 py-1">
                <span className="text-foreground/60">configId:</span>
                <span className="break-all">{node.configId}</span>
                <CopyButton value={node.configId} />
              </div>
              <div className="flex items-center gap-2 py-1">
                <span className="text-foreground/60">protocolId:</span>
                <span className="break-all">{node.protocolId}</span>
                <CopyButton value={node.protocolId} />
              </div>
              <div className="flex items-center gap-2 py-1">
                <span className="text-foreground/60">protocolVersionId:</span>
                <span className="break-all">{node.protocolVersionId}</span>
                <CopyButton value={node.protocolVersionId} />
              </div>
              <div className="flex items-center gap-2 py-1">
                <span className="text-foreground/60">regionId:</span>
                <span className="break-all">{node.regionId}</span>
                <CopyButton value={node.regionId} />
              </div>
              {node.oldNodeId && (
                <div className="flex items-center gap-2 py-1">
                  <span className="text-foreground/60">oldNodeId:</span>
                  <span className="break-all">{node.oldNodeId}</span>
                  <CopyButton value={node.oldNodeId} />
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
