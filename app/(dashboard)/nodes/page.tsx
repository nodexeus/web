'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { nodeClient } from '@modules/grpc/clients/nodeClient';
import { NodeSortField } from '@modules/grpc/library/blockjoy/v1/node';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { NodeListView } from '@/components/nodes/node-list-view';
import { Pagination } from '@/components/ui/pagination';
import { useOrganizations } from '@/lib/hooks/use-organizations';

export default function NodesPage() {
  const { defaultOrg } = useOrganizations();
  const orgId = defaultOrg?.orgId;

  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState(
    NodeSortField.NODE_SORT_FIELD_CREATED_AT,
  );
  const [sortOrder, setSortOrder] = useState(SortOrder.SORT_ORDER_DESCENDING);
  const pageSize = 25;

  useEffect(() => {
    setPage(1);
  }, [orgId]);

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
    queryKey: ['nodes', orgId, { page, limit: pageSize, sortField, sortOrder }],
    queryFn: async () => {
      const response = await nodeClient.listNodes(
        orgId!,
        {},
        { currentPage: page - 1, itemsPerPage: pageSize },
        [
          {
            field: sortField,
            order: sortOrder,
          },
        ],
      );
      return response;
    },
    enabled: Boolean(orgId),
  });

  const isLoadingAny = !orgId || isLoading;

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Nodes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoadingAny
              ? 'Loading...'
              : `${data?.total ?? 0} nodes in ${defaultOrg?.name ?? 'your organization'}`}
          </p>
        </div>
      </div>

      <NodeListView
        nodes={data?.nodes ?? []}
        total={data?.total ?? 0}
        isLoading={isLoadingAny}
        error={error}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
      />

      {!isLoadingAny && (data?.total ?? 0) > pageSize && (
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
