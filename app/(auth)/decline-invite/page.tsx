'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { invitationClient } from '@modules/grpc/clients/invitationClient';
import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { decodeToken } from '@/lib/decode-token';

export default function DeclineInvitePage() {
  return (
    <Suspense>
      <DeclineInviteContent />
    </Suspense>
  );
}

function DeclineInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!token) return;
    const tokenData = decodeToken(token);
    const invitationId = tokenData?.data?.invitation_id;

    if (invitationId) {
      (async () => {
        try {
          await invitationClient.declineInvitation(invitationId, token);
        } catch (err) {
          console.error('Failed to decline invitation:', err);
        } finally {
          setDeclined(true);
        }
      })();
    } else {
      setDeclined(true);
    }
  }, [token]);

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          BlockVisor
        </h1>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-medium">Invitation Declined</h2>
        <p className="text-sm text-muted-foreground">
          You have declined this invitation.
        </p>
        <Link href="/login">
          <Button variant="outline">Go to Sign In</Button>
        </Link>
      </div>
    </div>
  );
}
