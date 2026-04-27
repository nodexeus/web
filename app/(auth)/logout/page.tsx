'use client';

import { useEffect } from 'react';
import { performLogout } from '@/lib/logout';

export default function LogoutPage() {
  useEffect(() => {
    performLogout();
  }, []);

  return null;
}
