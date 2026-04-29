'use client';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { PageHeader } from '@/components/layout/page-header';
import { MqttProvider } from '@/components/layout/mqtt-provider';
import { ThemeInitializer } from '@/components/layout/theme-initializer';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Providers } from '@/app/providers';
import { Toaster } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <ThemeInitializer />
      <MqttProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <PageHeader />
            <main className="flex-1 p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster
          position="bottom-right"
          theme="system"
          richColors
          closeButton
        />
      </MqttProvider>
    </Providers>
  );
}
