import { useEffect, useState, useMemo } from 'react';
import {
  AdminListFilterControl,
  dedupedAdminDropdownList,
} from '@modules/admin';
import { AdminListFilterControlEnhanced } from '@modules/admin/components/AdminLists/AdminList/AdminListTable/AdminListTableHeader/AdminListFilter/AdminListFilterControl/AdminListFilterControlEnhanced';
import { sort } from '@shared/components';
import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { AdminFilterControlProps } from '@modules/admin/types/AdminFilterControlProps';
import { capitalize } from 'utils/capitalize';
import {
  NodeState,
  NodeStatus,
} from '@modules/grpc/library/blockjoy/common/v1/node';

export const AdminNodesFilterStatus = ({
  columnName,
  values,
  listAll,
  onFilterChange,
  onReset,
  isLoading,
  error,
  onRetry,
}: AdminFilterControlProps<Node>) => {
  const [list, setList] = useState<AdminFilterDropdownItem[]>();

  useEffect(() => {
    const all = listAll
      ?.filter(
        (node) => node.nodeStatus?.state !== NodeState.NODE_STATE_UNSPECIFIED,
      )
      ?.map((node) => ({
        id: node.nodeStatus?.state,
        name: capitalize(getNodeStatusName(node.nodeStatus!)),
      }));

    setList(sort(dedupedAdminDropdownList(all!), { field: 'name' }));
  }, [listAll]);

  // Enhanced validation rules for status filter
  const filterValidationRules = useMemo(
    () => ({
      maxSelections: 10, // Allow up to 10 status selections
      allowedValues: list?.map((item) => item.id || '') || [],
      customValidator: (values: string[]) => {
        // Custom validation: warn if too many statuses selected
        if (values.length > 5) {
          return 'Selecting many statuses may slow down the query';
        }
        return null;
      },
    }),
    [list],
  );

  return (
    <AdminListFilterControlEnhanced
      columnName={columnName}
      items={list}
      values={values}
      onFilterChange={onFilterChange}
      onReset={onReset}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      filterValidationRules={filterValidationRules}
      showFilterCount={true}
      showValidationErrors={true}
      enableBulkActions={true}
      autoApplyFilters={true}
      debounceMs={300}
      ariaLabel={`Filter nodes by status`}
      helpText="Select one or more node statuses to filter the list"
    />
  );
};

const getNodeStatusName = (nodeStatus: NodeStatus) =>
  [NodeState[nodeStatus.state]]?.[0].replace('NODE_STATE_', '')?.toLowerCase();
