import { useEffect, useState, useMemo } from 'react';
import { sort } from '@shared/components';
import { AdminListFilterControl, adminSelectors } from '@modules/admin';
import { AdminListFilterControlEnhanced } from '@modules/admin/components/AdminLists/AdminList/AdminListTable/AdminListTableHeader/AdminListFilter/AdminListFilterControl/AdminListFilterControlEnhanced';
import { AdminFilterControlProps } from '@modules/admin/types/AdminFilterControlProps';
import { useRecoilValue } from 'recoil';

export const AdminNodesFilterRegion = ({
  columnName,
  values,
  listAll,
  onFilterChange,
  onReset,
  isLoading,
  error,
  onRetry,
}: AdminFilterControlProps) => {
  const [list, setList] = useState<AdminFilterDropdownItem[]>([]);

  const settings = useRecoilValue(adminSelectors.settings);
  const settingsColumns = settings['nodes']?.columns ?? [];

  const protocolFilters = settingsColumns.find(
    (column) => column.name === 'protocolName',
  )?.filterSettings?.values;

  useEffect(() => {
    const regions = Array.from(
      new Set(
        sort(
          listAll
            ?.filter(
              (node) =>
                node.placement?.scheduler?.region &&
                (!protocolFilters?.length ||
                  protocolFilters?.includes(node.protocolId)),
            )
            .map((node) => node.placement?.scheduler?.region) ?? [],
        ),
      ),
    );
    setList(
      regions?.map((region) => ({
        id: region,
        name: region,
      })),
    );
  }, [listAll, protocolFilters]);

  // Enhanced validation rules for region filter
  const filterValidationRules = useMemo(
    () => ({
      maxSelections: 15, // Allow up to 15 region selections
      allowedValues: list?.map((item) => item.id || '') || [],
      customValidator: (values: string[]) => {
        // Custom validation: warn about performance with many regions
        if (values.length > 8) {
          return 'Selecting many regions may impact query performance';
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
      ariaLabel={`Filter nodes by region`}
      helpText="Select one or more regions to filter the node list"
    />
  );
};
