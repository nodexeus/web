'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    localStorage.removeItem('identity');
    const token = searchParams.get('token');
    if (token) {
      router.replace(`/register?token=${encodeURIComponent(token)}&invited=true`);
    } else {
      router.replace('/register');
    }
  }, []);

  return null;
}
