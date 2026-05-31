'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuItem,
  SidebarMenuItemIcon,
  SidebarMenuItemLabel,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { OrgSwitcher } from '@/components/layout/org-switcher';
import { usePermissions } from '@/lib/hooks/use-permissions';
import {
  Server,
  Rocket,
  HardDrive,
  Building2,
  Settings,
  MessageCircle,
  LayoutDashboard,
  ShieldCheck,
  Network,
} from 'lucide-react';

const navSections = [
  {
    label: 'Infrastructure',
    items: [
      { name: 'Nodes', href: '/nodes', icon: Server },
      { name: 'Launch Node', href: '/launch-node', icon: Rocket },
      { name: 'Hosts', href: '/hosts', icon: HardDrive },
      { name: 'Load Balancers', href: '/load-balancers', icon: Network },
    ],
  },
  {
    label: 'Settings',
    items: [
      {
        name: 'Organizations',
        href: '/organizations',
        icon: Building2,
      },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
  {
    label: null,
    items: [{ name: 'FAQ', href: '/faq', icon: MessageCircle }],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isOpen } = useSidebar();
  const { isSuperUser } = usePermissions();

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center justify-between">
        {isOpen ? (
          <span className="text-lg font-medium tracking-tight text-primary">
            Nodexeus
          </span>
        ) : (
          <span className="text-lg font-bold text-primary">N</span>
        )}
        <SidebarTrigger />
      </SidebarHeader>

      <div className="px-2 py-2 border-b border-sidebar-border">
        <OrgSwitcher />
      </div>

      <SidebarContent>
        {navSections.map((section, index) => (
          <SidebarGroup key={index}>
            {section.label && (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            )}
            {section.items.map((item) => (
              <SidebarMenuItem
                key={item.name}
                isActive={pathname?.startsWith(item.href)}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-3 w-full"
                >
                  <SidebarMenuItemIcon>
                    <item.icon className="h-4 w-4" />
                  </SidebarMenuItemIcon>
                  <SidebarMenuItemLabel>{item.name}</SidebarMenuItemLabel>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarGroup>
        ))}

        {isSuperUser && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenuItem isActive={pathname?.startsWith('/admin')}>
              <Link href="/admin" className="flex items-center gap-3 w-full">
                <SidebarMenuItemIcon>
                  <ShieldCheck className="h-4 w-4" />
                </SidebarMenuItemIcon>
                <SidebarMenuItemLabel>Admin</SidebarMenuItemLabel>
              </Link>
            </SidebarMenuItem>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <Separator className="mb-3" />
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center">
            <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {isOpen && (
            <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
              Dashboard by Nodexeus.
              <br />
              All rights reserved.
              {process.env.NEXT_PUBLIC_SHORT_SHA && (
                <>
                  <br />
                  <span className="font-mono">
                    {process.env.NEXT_PUBLIC_SHORT_SHA}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
