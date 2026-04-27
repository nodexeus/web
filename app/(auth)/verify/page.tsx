'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';

export default function VerifyPage() {
  // Clear any stale session
  if (typeof window !== 'undefined') {
    localStorage.removeItem('identity');
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          BlockVisor
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your email
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <Mail className="mx-auto h-10 w-10 text-success" />
        <h2 className="text-lg font-medium">Verification email sent</h2>
        <p className="text-sm text-muted-foreground">
          We have sent a link to your email address. Check your email and start
          using BlockVisor!
        </p>
        <Link href="/login">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
