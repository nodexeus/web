'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@modules/grpc/clients/authClient';
import { friendlyError } from '@/lib/friendly-error';
import { validatePassword } from '@/lib/password-validation';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound } from 'lucide-react';

import { decodeToken } from '@/lib/decode-token';

export default function PasswordResetPage() {
  return (
    <Suspense>
      <PasswordResetForm />
    </Suspense>
  );
}

function PasswordResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const tokenData = decodeToken(token);
  const email = tokenData?.data?.email || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setError('Please fix the password requirements below.');
      return;
    }

    setIsLoading(true);

    try {
      // Reset the password using the token
      await authClient.updateResetPassword(token, password);

      // Strip the token from the URL to prevent it appearing in browser history or Referer headers
      window.history.replaceState({}, '', window.location.pathname);

      // Redirect to login with success message — user will sign in through the BFF flow
      router.push('/login?reset=true');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('TOKEN_EXPIRED') || msg.includes('expired')) {
        setError('This reset link has expired. Please request a new one.');
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-medium tracking-tight text-primary">
            BlockVisor
          </h1>
        </div>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Invalid or missing reset token.
          </p>
          <Link href="/forgot-password">
            <Button variant="outline">Request a new reset link</Button>
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
          Set your new password
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-card p-6"
      >
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
            {error.includes('expired') && (
              <Link
                href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                className="ml-1 underline"
              >
                Request a new link
              </Link>
            )}
          </div>
        )}

        {email && (
          <p className="text-sm text-muted-foreground">
            Resetting password for{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">New Password</label>
          <PasswordInput
            value={password}
            onChange={setPassword}
            showStrength
            autoFocus
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Confirm Password</label>
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          Reset Password
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
