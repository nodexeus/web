'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hostClient } from '@modules/grpc/clients/hostClient';
import { HostSortField } from '@modules/grpc/library/blockjoy/v1/host';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { HostListView } from '@/components/hosts/host-list-view';
import { Pagination } from '@/components/ui/pagination';

export default function HostsPage() {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState(
    HostSortField.HOST_SORT_FIELD_DISPLAY_NAME,
  );
  const [sortOrder, setSortOrder] = useState(SortOrder.SORT_ORDER_ASCENDING);
  const pageSize = 25;

  const handleSort = (field: number) => {
    if (field === sortField) {
      setSortOrder(
        sortOrder === SortOrder.SORT_ORDER_ASCENDING
          ? SortOrder.SORT_ORDER_DESCENDING
          : SortOrder.SORT_ORDER_ASCENDING,
      );
    } else {
      setSortField(field);
      setSortOrder(SortOrder.SORT_ORDER_ASCENDING);
    }
    setPage(1);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['hosts', { page, limit: pageSize, sortField, sortOrder }],
    queryFn: async () => {
      const response = await hostClient.listHosts(
        undefined,
        {},
        { currentPage: page - 1, itemsPerPage: pageSize },
        [{ field: sortField, order: sortOrder }],
      );
      return response;
    },
  });

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Hosts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? 'Loading...'
              : `${data?.total ?? 0} hosts in your infrastructure`}
          </p>
        </div>
      </div>

      <HostListView
        hosts={data?.hosts ?? []}
        total={data?.total ?? 0}
        isLoading={isLoading}
        error={error}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

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
