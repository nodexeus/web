'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { userClient } from '@modules/grpc/clients/userClient';
import { friendlyError } from '@/lib/friendly-error';
import { decodeToken } from '@/lib/decode-token';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { validatePassword } from '@/lib/password-validation';
import { Loader2, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const invited = searchParams.get('invited') === 'true';

  // Pre-fill from invitation token if present
  const tokenData = token ? decodeToken(token) : null;

  const [firstName, setFirstName] = useState(tokenData?.data?.first_name || '');
  const [lastName, setLastName] = useState(tokenData?.data?.last_name || '');
  const [email, setEmail] = useState(tokenData?.data?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear any stale session on mount
  useState(() => {
    localStorage.removeItem('identity');
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setError('Please fix the password requirements below.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await userClient.createUser(
        { firstName, lastName, email, password },
        token || undefined,
      );

      // createUser returns StatusResponse on failure instead of throwing
      if (
        result &&
        'code' in result &&
        'message' in result &&
        'source' in result
      ) {
        const msg = (result as any).message || '';
        if (
          msg.toLowerCase().includes('already') ||
          msg.toLowerCase().includes('exists')
        ) {
          setError('Email address already registered. Please sign in instead.');
        } else {
          setError(friendlyError(result));
        }
        return;
      }

      router.push('/verify');
    } catch (err: any) {
      const msg = err?.message || '';
      if (
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('exists')
      ) {
        setError('Email address already registered. Please sign in instead.');
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          BlockVisor
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your account
        </p>
      </div>

      {invited && (
        <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
          You&apos;ve been invited to a BlockVisor organization. Create an
          account to get started.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-card p-6"
      >
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoFocus
              autoComplete="given-name"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={!!tokenData?.data?.email}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <PasswordInput
            value={password}
            onChange={setPassword}
            showStrength
            autoFocus={false}
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Create Account
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            Already have an account?{' '}
          </span>
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
