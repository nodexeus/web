'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@modules/grpc/clients/authClient';
import { friendlyError } from '@/lib/friendly-error';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authClient.resetPassword(email);
      setSent(true);
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
          Reset your password
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <Mail className="mx-auto h-10 w-10 text-success" />
          <h2 className="text-lg font-medium">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a password reset link to{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-border bg-card p-6"
        >
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </p>

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

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Send Reset Link
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
      )}
    </div>
  );
}
