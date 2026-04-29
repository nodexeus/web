'use client';

import { useState } from 'react';
import { userClient } from '@modules/grpc/clients/userClient';
import Link from 'next/link';
import { AlertTriangle, Loader2, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DeactivatedPage() {
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [processed, setProcessed] = useState(false);

  const handleDeactivate = async () => {
    setIsDeleting(true);
    try {
      const raw = localStorage.getItem('identity');
      if (raw) {
        const identity = JSON.parse(raw);
        if (identity.userId) {
          await userClient.deleteUser(identity.userId);
        }
      }
    } catch (err) {
      console.error('Failed to delete user account:', err);
    } finally {
      // Clear server-side httpOnly cookies
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // Best effort
      }
      localStorage.removeItem('identity');
      setProcessed(true);
      setIsDeleting(false);
    }
  };

  if (processed) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-medium tracking-tight text-primary">
            BlockVisor
          </h1>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <UserX className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-medium">Account Deactivated</h2>
          <p className="text-sm text-muted-foreground">
            Thank you for using BlockVisor. Your account has been deactivated.
          </p>
          <Link href="/login">
            <Button variant="outline">Back to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          BlockVisor
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Account Deactivation
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 text-destructive" />
          <h2 className="text-lg font-medium">
            Warning: This action is permanent
          </h2>
        </div>

        <p className="text-sm text-muted-foreground">
          You are about to permanently delete your BlockVisor account. All of
          your data, nodes, and configurations will be irreversibly removed.
          This action cannot be undone.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Type{' '}
            <span className="font-mono font-bold text-destructive">
              DEACTIVATE
            </span>{' '}
            to confirm
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DEACTIVATE"
            autoComplete="off"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/nodes" className="flex-1">
            <Button variant="outline" className="w-full" disabled={isDeleting}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="destructive"
            className="flex-1 gap-2"
            disabled={confirmation !== 'DEACTIVATE' || isDeleting}
            onClick={handleDeactivate}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            Confirm Deactivation
          </Button>
        </div>
      </div>
    </div>
  );
}
