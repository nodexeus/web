'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { userClient } from '@modules/grpc/clients/userClient';
import { friendlyError } from '@/lib/friendly-error';
import { decodeToken } from '@/lib/decode-token';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function isValidRedirect(path: string | null): string | null {
  if (!path) return null;
  // Must be a relative path starting with /
  if (!path.startsWith('/')) return null;
  // Block protocol-relative URLs
  if (path.startsWith('//')) return null;
  // Block destructive routes
  const blocked = ['/deactivated', '/logout'];
  if (blocked.some((b) => path.startsWith(b))) return null;
  return path;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const verified = searchParams.get('verified') === 'true';
  const reset = searchParams.get('reset') === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await res.json();
      const decoded = decodeToken(data.accessToken);

      // Build identity object — refreshToken is NOT stored client-side;
      // it lives in an httpOnly cookie managed by the BFF API routes.
      const identity = {
        userId:
          data.userId ||
          decoded?.resource_id ||
          decoded?.sub ||
          decoded?.user_id ||
          '',
        email: data.email || email,
        firstName: decoded?.first_name || '',
        lastName: decoded?.last_name || '',
        accessToken: data.accessToken,
      };

      localStorage.setItem('identity', JSON.stringify(identity));

      // Try to fetch full user info to update identity with real names
      try {
        const userInfo = await userClient.getUser(identity.userId);
        if (userInfo) {
          identity.firstName = userInfo.firstName || identity.firstName;
          identity.lastName = userInfo.lastName || identity.lastName;
          localStorage.setItem('identity', JSON.stringify(identity));
        }
      } catch {
        // Non-critical — proceed with decoded info
      }

      router.push(isValidRedirect(redirect) || '/nodes');
    } catch (err: any) {
      setError(friendlyError(err));
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
          Sign in to your account
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-card p-6"
      >
        {verified && (
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Email verified! Please sign in.
          </div>
        )}

        {reset && (
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Password reset successful. Please sign in.
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          Sign In
        </Button>

        <div className="flex justify-between text-sm">
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
          <Link href="/register" className="text-primary hover:underline">
            Create account
          </Link>
        </div>
      </form>
    </div>
  );
}
