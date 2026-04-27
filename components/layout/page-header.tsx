'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { performLogout } from '@/lib/logout';
import { useAuth } from '@/lib/hooks/use-auth';
import { useThemeStore } from '@/lib/stores/theme-store';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { NotificationPanel } from '@/components/layout/notification-panel';
import { User, LogOut, Sun, Moon } from 'lucide-react';

// Lazy-load CommandPalette to avoid SSR — cmdk's internal JSX
// conflicts with the global @emotion/react jsxImportSource during pre-rendering.
const CommandPalette = dynamic(
  () =>
    import('@/components/layout/command-palette').then(
      (mod) => mod.CommandPalette,
    ),
  { ssr: false },
);

function getBreadcrumb(pathname: string | null): string {
  if (!pathname) return 'Dashboard';
  const segments = pathname.split('/').filter(Boolean);
  // Remove 'preview' prefix for display
  const display = segments.filter((s) => s !== 'preview');
  if (display.length === 0) return 'Dashboard';
  return display.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' / ');
}

export function PageHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    performLogout();
  };

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="lg:hidden" />
      <Separator orientation="vertical" className="h-5 lg:hidden" />

      <p className="text-sm font-medium text-muted-foreground">
        {getBreadcrumb(pathname)}
      </p>

      <div className="ml-auto flex items-center gap-3">
        <CommandPalette />
        <NotificationPanel />
        <button
          onClick={toggleTheme}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={
            mounted
              ? theme === 'dark'
                ? 'Switch to light mode'
                : 'Switch to dark mode'
              : undefined
          }
        >
          {!mounted ? (
            <span className="h-4 w-4" />
          ) : theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
