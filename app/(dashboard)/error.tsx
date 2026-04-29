'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/friendly-error';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-warning" />
      <h2 className="text-xl font-medium">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {friendlyError(error)}
      </p>
      <Button onClick={reset} variant="outline" className="mt-6 gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
