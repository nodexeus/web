'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { protocolClient } from '@modules/grpc/clients/protocolClient';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchInput } from '@/components/ui/search-input';
import { Pagination } from '@/components/ui/pagination';
import { Blocks } from 'lucide-react';

export default function AdminProtocolsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'protocols', { page, search, limit: pageSize }],
    queryFn: async () => {
      const r = await protocolClient.listProtocols(
        undefined,
        search ? { keyword: search } : undefined,
        { currentPage: page - 1, itemsPerPage: pageSize },
      );
      return r;
    },
  });

  const protocols = data?.protocols ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : `${data?.total ?? 0} protocols`}
        </p>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search protocols..."
          className="w-64"
        />
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Protocol</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Versions</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                </tr>
              ))
            ) : protocols.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center">
                  <Blocks className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No protocols found
                  </p>
                </td>
              </tr>
            ) : (
              protocols.map((p: any) => (
                <tr
                  key={p.protocolId}
                  className="cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/50"
                  onClick={() =>
                    router.push(`/admin/protocols/${p.protocolId}`)
                  }
                >
                  <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {p.key}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {p.ticker || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {p.versions?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString()
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
