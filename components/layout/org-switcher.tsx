'use client';

import { useState, useRef, useEffect } from 'react';
import { useOrganizations } from '@/lib/hooks/use-organizations';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';

export function OrgSwitcher() {
  const { organizations, defaultOrg, switchOrg, isSwitching, isLoading } =
    useOrganizations();
  const { isOpen: isSidebarOpen } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {isSidebarOpen && (
          <span className="text-xs text-muted-foreground">Loading...</span>
        )}
      </div>
    );
  }

  if (!defaultOrg) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent',
          isDropdownOpen && 'bg-sidebar-accent',
          !isSidebarOpen && 'justify-center px-2',
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        {isSidebarOpen && (
          <>
            <span className="flex-1 truncate text-left text-xs font-medium">
              {defaultOrg.name}
            </span>
            <ChevronDown
              className={cn(
                'h-3 w-3 shrink-0 text-muted-foreground transition-transform',
                isDropdownOpen && 'rotate-180',
              )}
            />
          </>
        )}
      </button>

      {isDropdownOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 max-h-64 w-56 overflow-auto rounded-md border border-border bg-popover py-1 shadow-lg',
            isSidebarOpen ? 'left-0' : 'left-full ml-2 top-0',
          )}
        >
          <p className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Organizations
          </p>
          {organizations.map((org) => (
            <button
              key={org.orgId}
              disabled={isSwitching}
              onClick={() => {
                switchOrg({ orgId: org.orgId, name: org.name });
                setIsDropdownOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                org.orgId === defaultOrg.orgId && 'text-primary',
              )}
            >
              <span className="flex-1 truncate">{org.name}</span>
              {org.orgId === defaultOrg.orgId && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
            </button>
          ))}
          {organizations.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No organizations found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
