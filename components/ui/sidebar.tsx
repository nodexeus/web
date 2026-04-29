'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type SidebarContextValue = {
  isOpen: boolean;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue>({
  isOpen: true,
  toggle: () => {},
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      <div className="flex min-h-screen">{children}</div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isOpen } = useSidebar();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        isOpen ? 'w-60' : 'w-16',
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex h-16 items-center border-b border-sidebar-border px-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex-1 overflow-auto py-4', className)}>{children}</div>
  );
}

export function SidebarFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('border-t border-sidebar-border p-4', className)}>
      {children}
    </div>
  );
}

export function SidebarGroup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('px-3 py-2', className)}>{children}</div>;
}

export function SidebarGroupLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isOpen } = useSidebar();
  if (!isOpen) return null;

  return (
    <p
      className={cn(
        'mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SidebarMenuItem({
  className,
  children,
  isActive,
}: {
  className?: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  const { isOpen } = useSidebar();

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-sidebar-accent text-primary font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        !isOpen && 'justify-center px-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarMenuItemIcon({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      {children}
    </span>
  );
}

export function SidebarMenuItemLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen } = useSidebar();
  if (!isOpen) return null;
  return <span className="truncate">{children}</span>;
}

export function SidebarInset({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { isOpen } = useSidebar();

  return (
    <div
      className={cn(
        'flex-1 transition-all duration-300',
        isOpen ? 'ml-60' : 'ml-16',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggle } = useSidebar();

  return (
    <button
      onClick={toggle}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
        className,
      )}
      aria-label="Toggle sidebar"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="9" x2="9" y1="3" y2="21" />
      </svg>
    </button>
  );
}
