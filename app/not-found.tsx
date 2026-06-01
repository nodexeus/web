'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <h1 className="text-6xl font-medium tracking-tight text-muted-foreground">
        404
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
      <p className="mt-2 text-sm text-muted-foreground/70">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <button
        onClick={() => router.push('/nodes')}
        className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go to Dashboard
      </button>
    </div>
  );
}
