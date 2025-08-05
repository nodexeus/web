import {
  Dispatch,
  FunctionComponent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
  memo,
} from 'react';
import { useRecoilValue } from 'recoil';
import { useSettings } from '@modules/settings';
import { useAdminListState } from '@modules/admin/hooks';
import { useAdminListErrorHandling } from '@modules/admin/hooks/useAdminListErrorHandling';
import { adminSelectors, loadAdminColumns } from '@modules/admin';
import { AdminListColumn } from '@modules/admin/types/AdminListColumn';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { styles } from './AdminList.styles';
import { AdminListHeader } from './AdminListHeader/AdminListHeader';
import { AdminListTable } from './AdminListTable/AdminListTable';
import { AdminListErrorBoundary } from './AdminListErrorBoundary';
import { AdminListErrorHandler } from './AdminListErrorHandler';
import { ErrorBoundaryHelpers } from '../../../utils/errorHandling';
import { Protocol } from '@modules/grpc/library/blockjoy/v1/protocol';
import { User } from '@modules/grpc/library/blockjoy/v1/user';
import { pageSize as defaultPageSize } from '@modules/admin/constants/constants';
import {
  usePerformanceMonitor,
  useMemoizedCallback,
  useEnhancedDebounce,
} from '../../../utils/performanceOptimization';

type Props = {
  name: keyof AdminSettings;
  idPropertyName: string;
  columns: AdminListColumn[];
  hidePagination?: boolean;
  defaultSortField: number;
  defaultSortOrder: SortOrder;
  additionalHeaderButtons?: FunctionComponent<{
    selectedIds: string[];
    list: any[];
    setList: Dispatch<SetStateAction<any[]>>;
  }>[];
  selectedIds?: string[];
  tagsAdded?: AdminTags[];
  tagsRemoved?: AdminTags[];
  protocols?: Protocol[];
  users?: User[];
  setTagsAdded?: Dispatch<SetStateAction<AdminTags[]>>;
  setTagsRemoved?: Dispatch<SetStateAction<AdminTags[]>>;
  onIdSelected?: (id: string, isSelected: boolean) => void;
  onIdAllSelected?: (ids: string[]) => void;
  listMap: (list: any[]) => any[];
  getList: (
    keyword?: string,
    page?: number,
    sortField?: number,
    sortOrder?: number,
    filters?: AdminListColumn[],
    pageSize?: number,
  ) => Promise<{
    total: number;
    list: any[];
  }>;
};

// Legacy error boundary component - kept for backward compatibility
const LegacyAdminListErrorBoundary: FunctionComponent<{
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}> = ({ error, onRetry, children }) => {
  if (error) {
    return (
      <div css={styles.errorContainer}>
        <p css={styles.errorMessage}>Error loading data: {error}</p>
        <button css={styles.retryButton} onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  return <>{children}</>;
};

const AdminListComponent = ({
  name,
  idPropertyName,
  columns,
  hidePagination,
  defaultSortField,
  defaultSortOrder,
  selectedIds,
  additionalHeaderButtons,
  tagsAdded,
  tagsRemoved,
  protocols,
  users,
  setTagsAdded,
  setTagsRemoved,
  onIdSelected,
  onIdAllSelected,
  listMap,
  getList,
}: Props) => {
  // Performance monitoring
  const performanceMonitor = usePerformanceMonitor({
    enableMonitoring: true,
    logMetrics: process.env.NODE_ENV === 'development',
    slowOperationThreshold: 100,
    maxMetricsHistory: 30,
  });

  // Data state
  const [list, setList] = useState<any[]>([]);
  const [listAll, setListAll] = useState<any[]>([]);
  const [listTotal, setListTotal] = useState<number>(0);

  // Settings and columns state
  const settings = useRecoilValue(adminSelectors.settings);
  const settingsColumns = settings[name]?.columns ?? [];
  const [columnsState, setColumnsState] = useState<AdminListColumn[]>([]);

  const { updateSettings } = useSettings();

  // Initialize centralized state management
  const stateConfig = useMemo(
    () => ({
      defaultPageSize: settings[name]?.pageSize || defaultPageSize,
      defaultSortField,
      defaultSortOrder,
      initialFilters: {},
    }),
    [settings, name, defaultSortField, defaultSortOrder],
  );

  const syncOptions = useMemo(
    () => ({
      syncToUrl: true,
      syncToSettings: true,
      urlDebounceMs: 300,
      settingsDebounceMs: 1000,
    }),
    [],
  );

  const { state, actions, helpers } = useAdminListState(
    name,
    stateConfig,
    syncOptions,
  );

  // Enhanced error handling
  const {
    handleApiCall,
    handleFilterError,
    handlePaginationError,
    handleStateSyncError,
    errors,
    hasErrors,
    clearErrors,
  } = useAdminListErrorHandling({
    showToasts: true,
    logErrors: true,
    autoRetry: false,
  });

  // Extract current state values for easier access
  const {
    search,
    page,
    pageSize,
    sortField,
    sortOrder,
    filters,
    isLoading,
    error,
  } = state;

  // Enhanced data fetching with performance monitoring and memoization
  const memoizedGetList = useMemoizedCallback(getList, [getList], {
    maxSize: 5,
    ttl: 30000, // Cache API responses for 30 seconds
    keyGenerator: (
      search,
      page,
      sortField,
      sortOrder,
      filterColumns,
      pageSize,
    ) =>
      JSON.stringify({
        search,
        page,
        sortField,
        sortOrder,
        filterColumns: filterColumns?.map((c) => ({
          name: c.name,
          values: c.filterSettings?.values,
        })),
        pageSize,
      }),
  });

  const debouncedGetList = useEnhancedDebounce(
    async () => {
      await performanceMonitor.timeAsyncOperation(
        'fetchAdminListData',
        async () => {
          const result = await handleApiCall(
            async () => {
              actions.setLoading(true);
              actions.setError(null);

              // Convert filters from state format to column format for API
              const filterColumns = performanceMonitor.timeOperation(
                'prepareFilterColumns',
                () =>
                  columnsState
                    .filter((column) => {
                      const filterValues = filters[column.name];
                      return filterValues && filterValues.length > 0;
                    })
                    .map((column) => ({
                      ...column,
                      filterSettings: {
                        ...column.filterSettings,
                        values: filters[column.name] || [],
                      },
                    })),
                {
                  columnCount: columnsState.length,
                  activeFilters: Object.keys(filters).length,
                },
              );

              const response = await memoizedGetList(
                search,
                page - 1, // API expects 0-based page
                sortField,
                sortOrder,
                filterColumns,
                pageSize,
              );

              setList(response.list);
              setListTotal(response.total);

              // Validate page boundaries after getting total
              helpers.validatePage(response.total);

              // Fetch all data for filter dropdowns if needed (with performance monitoring)
              if (columns.some((column) => !!column.filterComponent)) {
                const everythingResponse =
                  await performanceMonitor.timeAsyncOperation(
                    'fetchAllDataForFilters',
                    () =>
                      memoizedGetList(
                        search,
                        -1, // Get all pages
                        undefined,
                        undefined,
                        undefined,
                        pageSize,
                      ),
                    { hasFilterComponents: true },
                  );
                setListAll(everythingResponse.list);
              }

              return response;
            },
            'fetchAdminListData',
            {
              operation: 'fetchAdminListData',
              listName: name,
              search,
              page,
              pageSize,
              filters: Object.keys(filters),
            },
          );

          // Handle the case where the API call failed
          if (!result) {
            actions.setError('Failed to load data. Please try again.');
          }

          actions.setLoading(false);
        },
        {
          listName: name,
          search,
          page,
          pageSize,
          filterCount: Object.keys(filters).length,
          columnCount: columnsState.length,
        },
      );
    },
    150, // Debounce API calls by 150ms to prevent rapid successive calls
    {
      leading: false,
      trailing: true,
      maxWait: 500, // Ensure calls don't get delayed indefinitely
    },
  );

  const handleGetList = useCallback(() => {
    debouncedGetList();
  }, [debouncedGetList]);

  // Enhanced event handlers with performance monitoring
  const handleSearch = useCallback(
    (nextSearch: string) => {
      if (nextSearch === undefined) return;
      performanceMonitor.timeOperation(
        'handleSearchChange',
        () => actions.setSearch(nextSearch),
        { searchLength: nextSearch.length },
      );
    },
    [actions, performanceMonitor],
  );

  const handleSortChanged = useCallback(
    (nextSortField: number) => {
      performanceMonitor.timeOperation(
        'handleSortChange',
        () => {
          const nextSortOrder =
            sortField !== nextSortField
              ? SortOrder.SORT_ORDER_ASCENDING
              : sortOrder === SortOrder.SORT_ORDER_ASCENDING
              ? SortOrder.SORT_ORDER_DESCENDING
              : SortOrder.SORT_ORDER_ASCENDING;

          actions.setSort(nextSortField, nextSortOrder);

          // Update settings for persistence
          const nextColumns = [...columnsState];
          const foundColumn = nextColumns.find(
            (column) => column.sortField === nextSortField,
          );

          updateSettings('admin', {
            [name]: {
              columns: foundColumn ? nextColumns : settings[name]?.columns,
              sort: {
                field: nextSortField,
                order: nextSortOrder,
              },
            },
          });

          if (foundColumn) {
            setColumnsState(nextColumns);
          }
        },
        {
          sortField: nextSortField,
          previousSortField: sortField,
          columnCount: columnsState.length,
        },
      );
    },
    [
      sortField,
      sortOrder,
      actions,
      columnsState,
      updateSettings,
      name,
      settings,
      performanceMonitor,
    ],
  );

  const handlePageChanged = useCallback(
    (nextPage: number) => {
      performanceMonitor.timeOperation(
        'handlePageChange',
        () => actions.setPage(nextPage),
        { nextPage, previousPage: page },
      );
    },
    [actions, performanceMonitor, page],
  );

  const handlePageSizeChanged = useCallback(
    (nextPageSize: number) => {
      handlePaginationError(
        async () => {
          actions.setPageSize(nextPageSize);

          // Update settings for persistence with error handling
          await handleStateSyncError(
            async () => {
              updateSettings('admin', {
                [name]: {
                  ...settings[name],
                  pageSize: nextPageSize,
                },
              });
            },
            { operation: 'updatePageSizeSettings', pageSize: nextPageSize },
          );
        },
        { operation: 'changePageSize', pageSize: nextPageSize },
      );
    },
    [
      actions,
      updateSettings,
      name,
      settings,
      handlePaginationError,
      handleStateSyncError,
    ],
  );

  const handleColumnsChanged = useCallback(
    (nextColumns: AdminListColumn[]) => {
      updateSettings('admin', {
        [name]: {
          ...settings[name],
          columns: nextColumns,
        },
      });
      setColumnsState(nextColumns);
    },
    [updateSettings, name, settings],
  );

  const handleFiltersChanged = useCallback(
    (nextFilters: AdminListColumn[]) => {
      handleFilterError(
        async () => {
          const nextColumns = [...columnsState];

          // Convert column filters to state format
          const newFilters: Record<string, string[]> = {};

          for (let column of nextColumns) {
            const indexOfFilter = nextFilters.findIndex(
              (c) => c.name === column.name,
            );
            if (indexOfFilter > -1) {
              const filterColumn = nextFilters[indexOfFilter];
              column.filterSettings = filterColumn.filterSettings;

              // Add to state filters if has values
              if (filterColumn.filterSettings?.values?.length) {
                newFilters[column.name] = filterColumn.filterSettings.values;
              }
            }
          }

          // Update settings for persistence with error handling
          await handleStateSyncError(
            async () => {
              updateSettings('admin', {
                [name]: {
                  ...settings[name],
                  columns: nextColumns,
                },
              });
            },
            {
              operation: 'updateFilterSettings',
              filters: Object.keys(newFilters),
            },
          );

          setColumnsState(nextColumns);

          // Update centralized filter state
          actions.setBulkFilters(newFilters);
        },
        {
          operation: 'changeFilters',
          filterCount: nextFilters.length,
          changedColumns: nextFilters.map((f) => f.name),
        },
      );
    },
    [
      columnsState,
      updateSettings,
      name,
      settings,
      actions,
      handleFilterError,
      handleStateSyncError,
    ],
  );

  // Initialize settings if they don't exist
  const initSettingsColumns = useCallback(() => {
    if (settings[name]) return;

    updateSettings('admin', {
      [name]: {
        ...settings[name],
        columns,
      },
    });
  }, [settings, name, updateSettings, columns]);

  // Initialize columns state
  useEffect(() => {
    const adminColumns = loadAdminColumns(columns, settingsColumns);
    setColumnsState(adminColumns);

    // Initialize filters from loaded columns
    const initialFilters: Record<string, string[]> = {};
    adminColumns.forEach((column) => {
      if (column.filterSettings?.values?.length) {
        initialFilters[column.name] = column.filterSettings.values;
      }
    });

    if (Object.keys(initialFilters).length > 0) {
      actions.setBulkFilters(initialFilters);
    }
  }, [columns, settingsColumns, actions]);

  // Initialize settings and fetch data when component mounts or state changes
  useEffect(() => {
    initSettingsColumns();
  }, [initSettingsColumns]);

  // Fetch data when state changes (with proper dependencies)
  useEffect(() => {
    if (columnsState.length > 0) {
      handleGetList();
    }
  }, [handleGetList, columnsState.length]);

  // Enhanced retry function for error boundary and error handler
  const handleRetry = useCallback(async () => {
    actions.setError(null);
    clearErrors();
    await handleGetList();
  }, [actions, handleGetList, clearErrors]);

  // Create error boundary reset keys based on critical state
  const errorBoundaryResetKeys = useMemo(() => {
    return ErrorBoundaryHelpers.createResetKeys({
      page,
      pageSize,
      filters,
      search,
      listName: name,
    });
  }, [page, pageSize, filters, search, name]);

  useEffect(() => {
    if (tagsAdded?.length) {
      const listCopy = [...list];

      tagsAdded?.forEach((tag) => {
        const foundListItem = listCopy.find(
          (item) => item[idPropertyName] === tag.id,
        );

        if (foundListItem) {
          foundListItem.tags = {
            tags: [
              ...foundListItem.tags.tags,
              ...tag.tags.map((t) => ({
                name: t,
              })),
            ],
          };
        }
      });

      setList(listCopy);
      setTagsAdded?.([]);
    }
  }, [tagsAdded]);

  useEffect(() => {
    if (tagsRemoved?.length) {
      const listCopy = [...list];

      tagsRemoved?.forEach((tag) => {
        const foundListItem = listCopy.find(
          (item) => item[idPropertyName] === tag.id,
        );

        if (foundListItem) {
          foundListItem.tags = {
            tags: tag.tags.map((t) => ({
              name: t,
            })),
          };
        }
      });

      setList(listCopy);
      setTagsRemoved?.([]);
    }
  }, [tagsRemoved]);

  // Memoized list mapping for performance
  const memoizedListMap = useMemoizedCallback(listMap, [listMap], {
    maxSize: 3,
    ttl: 10000, // Cache mapped lists for 10 seconds
    keyGenerator: (list) =>
      `${list.length}-${JSON.stringify(list.slice(0, 3))}`, // Use first 3 items as key
  });

  return (
    <AdminListErrorBoundary
      resetKeys={errorBoundaryResetKeys}
      resetOnPropsChange={true}
      onError={ErrorBoundaryHelpers.createErrorBoundaryHandler({
        listName: name,
        operation: 'renderAdminList',
      })}
    >
      <AdminListErrorHandler
        onRetry={handleRetry}
        showErrorSummary={hasErrors}
        maxVisibleErrors={3}
      >
        {/* Legacy error boundary for backward compatibility */}
        <LegacyAdminListErrorBoundary error={error} onRetry={handleRetry}>
          <article key={name} id={name} css={styles.card}>
            <AdminListHeader
              name={name}
              onSearch={handleSearch}
              columns={columnsState}
              onColumnsChanged={handleColumnsChanged}
              onFiltersChanged={handleFiltersChanged}
              additionalHeaderButtons={additionalHeaderButtons}
              selectedIds={selectedIds!}
              list={list}
              setList={setList}
            />
            <AdminListTable
              name={name}
              idPropertyName={idPropertyName}
              isLoading={isLoading}
              list={memoizedListMap(list)}
              listTotal={listTotal}
              listPage={page}
              listPageSize={pageSize}
              listAll={listAll}
              columns={columnsState}
              hidePagination={hidePagination}
              activeSortField={sortField}
              activeSortOrder={sortOrder}
              selectedIds={selectedIds}
              protocols={protocols}
              users={users}
              onIdSelected={onIdSelected}
              onIdAllSelected={onIdAllSelected}
              onPageChanged={handlePageChanged}
              onSortChanged={handleSortChanged}
              onFiltersChanged={handleFiltersChanged}
              onColumnsChanged={handleColumnsChanged}
              onPageSizeChanged={handlePageSizeChanged}
            />
          </article>
        </LegacyAdminListErrorBoundary>
      </AdminListErrorHandler>
    </AdminListErrorBoundary>
  );
};

// Export memoized component for better performance
export const AdminList = memo(AdminListComponent, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  const keysToCompare = [
    'name',
    'idPropertyName',
    'hidePagination',
    'defaultSortField',
    'defaultSortOrder',
    'selectedIds',
    'tagsAdded',
    'tagsRemoved',
  ];

  for (const key of keysToCompare) {
    if (prevProps[key as keyof Props] !== nextProps[key as keyof Props]) {
      return false;
    }
  }

  // Deep compare arrays
  if (JSON.stringify(prevProps.columns) !== JSON.stringify(nextProps.columns)) {
    return false;
  }

  if (
    JSON.stringify(prevProps.protocols) !== JSON.stringify(nextProps.protocols)
  ) {
    return false;
  }

  if (JSON.stringify(prevProps.users) !== JSON.stringify(nextProps.users)) {
    return false;
  }

  return true;
});
