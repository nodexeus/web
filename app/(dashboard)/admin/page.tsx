'use client';

import { useQuery } from '@tanstack/react-query';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { hostClient } from '@modules/grpc/clients/hostClient';
import { protocolClient } from '@modules/grpc/clients/protocolClient';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { userClient } from '@modules/grpc/clients/userClient';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Server,
  HardDrive,
  Blocks,
  Building2,
  Users,
  ArrowRight,
} from 'lucide-react';

function StatCard({
  icon: Icon,
  label,
  href,
  queryKey,
  queryFn,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  queryKey: string[];
  queryFn: () => Promise<number>;
}) {
  const { data: count, isLoading } = useQuery({
    queryKey,
    queryFn,
    staleTime: 30000,
  });

  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-accent/30"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className="text-2xl font-medium tracking-tight">
              {count?.toLocaleString() ?? '—'}
            </p>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Server}
          label="Total Nodes"
          href="/admin/nodes"
          queryKey={['admin', 'totalNodes']}
          queryFn={async () => {
            const r = await nodeClient.listNodes(
              undefined,
              {},
              { currentPage: 0, itemsPerPage: 1 },
            );
            return r.total ?? 0;
          }}
        />
        <StatCard
          icon={HardDrive}
          label="Total Hosts"
          href="/admin/hosts"
          queryKey={['admin', 'totalHosts']}
          queryFn={async () => {
            const r = await hostClient.listHosts(
              undefined,
              {},
              { currentPage: 0, itemsPerPage: 1 },
            );
            return r.total ?? 0;
          }}
        />
        <StatCard
          icon={Blocks}
          label="Total Protocols"
          href="/admin/protocols"
          queryKey={['admin', 'totalProtocols']}
          queryFn={async () => {
            const r = await protocolClient.listProtocols(undefined, undefined, {
              currentPage: 0,
              itemsPerPage: 1,
            });
            return r.total ?? 0;
          }}
        />
        <StatCard
          icon={Building2}
          label="Total Organizations"
          href="/admin/orgs"
          queryKey={['admin', 'totalOrgs']}
          queryFn={async () => {
            const r = await organizationClient.listOrganizations(
              { currentPage: 0, itemsPerPage: 1 },
              undefined,
              undefined,
              true,
            );
            return r.total ?? 0;
          }}
        />
        <StatCard
          icon={Users}
          label="Total Users"
          href="/admin/users"
          queryKey={['admin', 'totalUsers']}
          queryFn={async () => {
            const r = await userClient.listUsers(undefined, {
              currentPage: 0,
              itemsPerPage: 1,
            });
            return r.total ?? 0;
          }}
        />
      </div>
    </div>
  );
}
