'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LayoutDashboard,
  Server,
  HardDrive,
  Blocks,
  Building2,
  Users,
  ShieldAlert,
} from 'lucide-react';

const ADMIN_NAV = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Nodes', href: '/admin/nodes', icon: Server },
  { name: 'Hosts', href: '/admin/hosts', icon: HardDrive },
  { name: 'Protocols', href: '/admin/protocols', icon: Blocks },
  { name: 'Orgs', href: '/admin/orgs', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isSuperUser, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>

        {/* Tab bar skeleton */}
        <div className="flex gap-1 border-b border-border">
          {ADMIN_NAV.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Content skeleton — mimics the stat cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg border border-border bg-card p-5"
            >
              <Skeleton className="h-11 w-11 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isSuperUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="mb-3 h-12 w-12 text-destructive/50" />
        <h2 className="text-xl font-medium">Access Denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This section requires administrator privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform administration and monitoring
        </p>
      </div>

      {/* Admin nav tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {ADMIN_NAV.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors',
                isActive
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
