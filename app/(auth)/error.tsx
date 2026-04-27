'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/friendly-error';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          BlockVisor
        </h1>
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
        <h2 className="text-lg font-medium">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{friendlyError(error)}</p>
        <Button onClick={reset} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
