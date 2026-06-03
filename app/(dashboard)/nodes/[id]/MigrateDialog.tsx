'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { Button } from '@/components/ui/button';
import type { MigrationCandidate } from '@modules/grpc/library/blockjoy/v1/node';
import {
  ArrowLeftRight,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type Step = 'pick' | 'org' | 'confirm';

interface MigrateDialogProps {
  nodeId: string;
  nodeName: string;
  onClose: () => void;
}

// ─── In-use badge ────────────────────────────────────────────────────────────

function InUseBadge() {
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
      <AlertTriangle className="h-3 w-3" />
      In Use
    </span>
  );
}

// ─── Not-running badge ───────────────────────────────────────────────────────

function NotRunningBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Not Running
    </span>
  );
}

// ─── MigrateDialog ───────────────────────────────────────────────────────────

export function MigrateDialog({ nodeId, nodeName, onClose }: MigrateDialogProps) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('pick');
  const [targetId, setTargetId] = useState<string>('');
  const [destOrgId, setDestOrgId] = useState<string>('');

  // ── Candidates query ─────────────────────────────────────────────────────
  const {
    data: candidatesData,
    isLoading: isLoadingCandidates,
    error: candidatesError,
  } = useQuery({
    queryKey: ['node', nodeId, 'migration-candidates'],
    queryFn: () => nodeClient.listMigrationCandidates(nodeId),
    staleTime: 30000,
  });

  const candidates: MigrationCandidate[] = candidatesData?.candidates ?? [];

  // ── Orgs query (admin=true to see all orgs) ──────────────────────────────
  const { data: orgsData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['admin', 'allOrgs'],
    queryFn: async () => {
      const r = await organizationClient.listOrganizations(
        undefined,
        undefined,
        undefined,
        true, // isAdmin — fetch all orgs, not just the current user's
      );
      return (r.orgs ?? []).filter((o: any) => !o.personal);
    },
    staleTime: 60000,
  });

  const orgs = orgsData ?? [];

  // ── Migrate mutation ──────────────────────────────────────────────────────
  const migrateMutation = useMutation({
    mutationFn: () => nodeClient.migrateNode(nodeId, targetId, destOrgId),
    onSuccess: () => {
      toast.success('Migration started', {
        description: `${nodeName} is being migrated. Both nodes will restart.`,
      });
      queryClient.invalidateQueries({ queryKey: ['node', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error('Migration failed', { description: err.message });
    },
  });

  // ── Derived state ─────────────────────────────────────────────────────────
  const selectedCandidate = candidates.find(
    (c) => c.node?.nodeId === targetId,
  );
  const selectedOrg = orgs.find((o: any) => o.orgId === destOrgId);

  // ── Step renderers ────────────────────────────────────────────────────────

  const renderPickStep = () => {
    if (isLoadingCandidates) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (candidatesError) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load migration candidates. Please try again.
        </div>
      );
    }

    if (candidates.length === 0) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No migration candidates are available for this node.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {candidates.map((c) => {
          const node = c.node;
          if (!node) return null;
          const isSelected = targetId === node.nodeId;
          const disabled = !c.isRunning;

          return (
            <button
              key={node.nodeId}
              disabled={disabled}
              onClick={() => setTargetId(node.nodeId)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                disabled
                  ? 'cursor-not-allowed border-border bg-muted/30 opacity-50'
                  : isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {node.displayName || node.nodeName}
                  </span>
                  {c.inUse && <InUseBadge />}
                  {!c.isRunning && <NotRunningBadge />}
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {node.orgName} · {node.nodeId?.slice(0, 8)}…
              </p>
            </button>
          );
        })}
      </div>
    );
  };

  const renderOrgStep = () => {
    if (isLoadingOrgs) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (orgs.length === 0) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No organizations available.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Choose the org that <span className="font-medium text-foreground">{nodeName}</span> will be moved into after migration (it will be tagged <code className="rounded bg-muted px-1 text-xs">-migrated</code>).
        </p>
        <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {orgs.map((org: any) => {
            const isSelected = destOrgId === org.orgId;
            return (
              <button
                key={org.orgId}
                onClick={() => setDestOrgId(org.orgId)}
                className={`w-full rounded-lg border px-4 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{org.name}</span>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{org.orgId.slice(0, 8)}…</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderConfirmStep = () => {
    const target = selectedCandidate?.node;
    const targetName = target?.displayName || target?.nodeName || 'target node';

    return (
      <div className="space-y-4">
        {/* Restart warning banner */}
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-warning">
            Both nodes will restart during migration. Expect brief downtime on both.
          </p>
        </div>

        {/* inUse warning (if target org has active nodes) */}
        {selectedCandidate?.inUse && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">
              The target node&apos;s org is <strong>in use</strong> — it has other active nodes. Proceeding will restart a production-like environment.
            </p>
          </div>
        )}

        {/* Summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Source node (this node)</p>
            <p className="font-medium">{nodeName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Will be tagged <code className="rounded bg-muted px-1">-migrated</code> and moved to org:{' '}
              <span className="font-medium text-foreground">{selectedOrg?.name ?? destOrgId}</span>
            </p>
          </div>
          <div className="h-px bg-border" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target node (takes over identity)</p>
            <p className="font-medium">
              {targetName}
              {selectedCandidate?.inUse && <InUseBadge />}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Takes over <span className="font-medium text-foreground">{nodeName}</span>&apos;s display name, DNS, and moves into this node&apos;s current org.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ── Step metadata ─────────────────────────────────────────────────────────

  const stepTitles: Record<Step, string> = {
    pick: 'Select Migration Target',
    org: 'Choose Destination Org',
    confirm: 'Confirm Migration',
  };

  const stepSubtitles: Record<Step, string> = {
    pick: `Pick the node that will take over ${nodeName}'s identity`,
    org: `Where should ${nodeName} go after migration?`,
    confirm: 'Review the migration plan before proceeding',
  };

  // ── Can proceed ───────────────────────────────────────────────────────────

  const canProceedFromPick = Boolean(targetId);
  const canProceedFromOrg = Boolean(destOrgId);

  const handleNext = () => {
    if (step === 'pick') setStep('org');
    else if (step === 'org') setStep('confirm');
    else migrateMutation.mutate();
  };

  const handleBack = () => {
    if (step === 'org') setStep('pick');
    else if (step === 'confirm') setStep('org');
  };

  const isNextDisabled =
    (step === 'pick' && !canProceedFromPick) ||
    (step === 'org' && !canProceedFromOrg) ||
    migrateMutation.isPending;

  // ── Step indicator ────────────────────────────────────────────────────────

  const steps: Step[] = ['pick', 'org', 'confirm'];
  const currentStepIndex = steps.indexOf(step);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-fade-in-up rounded-lg border border-border bg-card p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium">{stepTitles[step]}</h3>
            <p className="text-sm text-muted-foreground">{stepSubtitles[step]}</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mt-4 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  i < currentStepIndex
                    ? 'bg-primary text-primary-foreground'
                    : i === currentStepIndex
                      ? 'border-2 border-primary text-primary'
                      : 'border border-border text-muted-foreground'
                }`}
              >
                {i < currentStepIndex ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px w-8 transition-colors ${
                    i < currentStepIndex ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="mt-5">
          {step === 'pick' && renderPickStep()}
          {step === 'org' && renderOrgStep()}
          {step === 'confirm' && renderConfirmStep()}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={step === 'pick' ? onClose : handleBack}
            disabled={migrateMutation.isPending}
          >
            {step === 'pick' ? 'Cancel' : 'Back'}
          </Button>

          <Button
            size="sm"
            variant="default"
            className="gap-2"
            onClick={handleNext}
            disabled={isNextDisabled}
          >
            {migrateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : step === 'confirm' ? (
              <ArrowLeftRight className="h-3.5 w-3.5" />
            ) : null}
            {migrateMutation.isPending
              ? 'Migrating…'
              : step === 'confirm'
                ? 'Confirm Migration'
                : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
