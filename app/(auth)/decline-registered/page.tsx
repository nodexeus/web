'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { invitationClient } from '@modules/grpc/clients/invitationClient';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function DeclineRegisteredPage() {
  return (
    <Suspense>
      <DeclineRegisteredContent />
    </Suspense>
  );
}

function DeclineRegisteredContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get('invitation_id') || '';

  useEffect(() => {
    if (!invitationId) {
      router.replace('/nodes');
      return;
    }

    (async () => {
      try {
        await invitationClient.declineInvitation(invitationId);
        toast.success('Invitation Declined');
        router.replace('/nodes');
      } catch (err) {
        console.error('Failed to decline invitation:', err);
        const url = new URL('/login', window.location.origin);
        url.searchParams.set('invitation_id', invitationId);
        router.replace(url.pathname + url.search);
      }
    })();
  }, [invitationId]);

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          BlockVisor
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Declining invitation...
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Please wait...</p>
      </div>
    </div>
  );
}
