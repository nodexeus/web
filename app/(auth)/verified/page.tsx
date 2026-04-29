'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@modules/grpc/clients/authClient';
import { invitationClient } from '@modules/grpc/clients/invitationClient';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { decodeToken } from '@/lib/decode-token';

export default function VerifiedPage() {
  return (
    <Suspense>
      <VerifiedContent />
    </Suspense>
  );
}

function VerifiedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided.');
      return;
    }

    (async () => {
      try {
        // Clear any stale session state to prevent session fixation
        localStorage.clear();

        // 1. Confirm registration — returns a temporary access token
        const accessToken = await authClient.registrationConfirmation(token);

        // 2. Decode the access token to get user info for invitation handling
        const decoded = decodeToken(accessToken);
        const userId =
          decoded?.resource_id || decoded?.sub || decoded?.user_id || '';
        const email = decoded?.email || '';

        // 3. Accept ALL pending invitations for this user
        //    When an admin creates a user and invites them to multiple orgs,
        //    all invitations are auto-accepted on verification so the user
        //    doesn't have to manually accept each one.
        if (email) {
          try {
            // Temporarily store identity so gRPC clients can authenticate
            localStorage.setItem(
              'identity',
              JSON.stringify({ accessToken, userId, email }),
            );

            const receivedInvitations =
              await invitationClient.receivedInvitations(email);

            // Accept all open invitations in parallel
            const acceptPromises = receivedInvitations.map((inv) =>
              invitationClient.acceptInvitation(inv.invitationId).catch(() => {
                // Individual failures are non-critical — log and continue
              }),
            );
            await Promise.allSettled(acceptPromises);
          } catch {
            // Invitation fetching/acceptance is non-critical
          }
        }

        // Clear temporary identity — user will sign in properly via the BFF flow
        localStorage.clear();

        // Strip the token from the URL to prevent it appearing in browser history or Referer headers
        window.history.replaceState({}, '', window.location.pathname);

        // 4. Redirect to login — user will sign in through the BFF flow
        setStatus('success');
        router.push('/login?verified=true');
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(
          err?.message || 'Error verifying your email. Please try again.',
        );
      }
    })();
  }, [token, router]);

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          BlockVisor
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Email verification</p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h2 className="text-lg font-medium">Verifying your email...</h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we confirm your account.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-10 w-10 text-success" />
            <h2 className="text-lg font-medium">Email verified!</h2>
            <p className="text-sm text-muted-foreground">
              Redirecting you to sign in...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="text-lg font-medium">Verification failed</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Link href="/login">
              <Button variant="outline" className="gap-2">
                Go to Sign In
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
