'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { Building2 } from 'lucide-react';

export default function AdminOrgsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'orgs', { page, search, limit: pageSize }],
    queryFn: async () => {
      const response = await organizationClient.listOrganizations(
        { currentPage: page - 1, itemsPerPage: pageSize },
        undefined,
        search || undefined,
        true, // isAdmin — bypass member filter
        undefined, // personal — undefined means return ALL orgs
      );
      return response;
    },
  });

  const orgs = (data?.orgs ?? []).filter((org: any) => !org.personal);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : `${orgs.length} organizations`}
        </p>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search orgs..."
          className="w-64"
        />
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Nodes</th>
              <th className="px-4 py-3">Hosts</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                </tr>
              ))
            ) : orgs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No organizations found
                  </p>
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr
                  key={org.orgId}
                  className="cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
                  onClick={() => router.push(`/admin/orgs/${org.orgId}`)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{org.name}</p>
                    {org.personal && (
                      <span className="text-[10px] text-muted-foreground">
                        Personal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {org.memberCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {org.nodeCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {org.hostCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {org.createdAt
                      ? new Date(org.createdAt).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && (data?.total ?? 0) > pageSize && (
        <div className="flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil((data?.total ?? 0) / pageSize)}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
