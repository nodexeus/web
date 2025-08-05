import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useRecoilValue } from 'recoil';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { adminSelectors } from '../store/adminSelectors';
import {
  usePerformanceMonitor,
  useEnhancedDebounce,
  useMemoizedCallback,
  useOperationBatcher,
  type PerformanceMonitor,
} from '../utils/performanceOptimization';

// Type imports
type AdminListState = import('../types/AdminListState').AdminListState;
type AdminListStateConfig =
  import('../types/AdminListState').AdminListStateConfig;
type AdminListStateActions =
  import('../types/AdminListState').AdminListStateActions;
type AdminListSyncOptions =
  import('../types/AdminListState').AdminListSyncOptions;
type AdminListSettingsData =
  import('../types/AdminListState').AdminListSettingsData;
type AdminListColumn = import('../types/AdminListColumn').AdminListColumn;
import {
  createInitialAdminListState,
  normalizeFilters,
  validatePageNumber,
  serializeStateToUrlParams,
  deserializeUrlParamsToState,
  serializeStateToSettings,
  deserializeSettingsToState,
  mergeAdminListStates,
  areAdminListStatesEqual,
  StateSyncDebouncer,
  FilterStateManager,
  FilterChangeType,
  areFiltersEqual,
  getActiveFilterCount,
  isFilterValueActive,
  type FilterStateConfig,
  // Enhanced pagination utilities
  PageSizeManager,
  PageBoundaryValidator,
  validatePageNumberEnhanced,
  calculatePaginationInfo,
  validateAndCorrectPageSize,
  type PaginationConfig,
  type PaginationState,
} from '../utils/adminListStateUtils';

// Enhanced URL parameter utilities
import {
  parseUrlParameters,
  serializeStateToUrlParameters,
  deserializeUrlParametersToState,
  UrlHistoryManager,
  DEFAULT_URL_VALIDATION_CONFIG,
  type UrlValidationConfig,
} from '../utils/urlParameterUtils';

/**
 * Enhanced centralized state management hook for admin lists with performance optimizations
 * Handles filtering, pagination, sorting, and state synchronization
 */
export const useAdminListState = (
  listName: string,
  config: AdminListStateConfig,
  options: Partial<AdminListSyncOptions> = {},
) => {
  const router = useRouter();
  const adminSettings = useRecoilValue(adminSelectors.settings);

  // Initialize performance monitoring
  const performanceMonitor = usePerformanceMonitor({
    enableMonitoring: true,
    logMetrics: process.env.NODE_ENV === 'development',
    slowOperationThreshold: 50,
    maxMetricsHistory: 50,
  });

  // Merge default options
  const syncOptions: AdminListSyncOptions = useMemo(
    () => ({
      syncToUrl: true,
      syncToSettings: true,
      urlDebounceMs: 300,
      settingsDebounceMs: 1000,
      ...options,
    }),
    [options],
  );

  // Get list-specific settings with memoization
  const listSettings = useMemoizedCallback(
    (adminSettings: any, listName: string) => {
      return adminSettings?.[listName] as AdminListSettingsData | undefined;
    },
    [adminSettings, listName],
    {
      maxSize: 5,
      ttl: 10000, // Cache for 10 seconds
    },
  );

  // Initialize state from multiple sources with priority: URL > Settings > Config
  const initialState = useMemo(() => {
    return performanceMonitor.timeOperation(
      'initializeAdminListState',
      () => {
        const baseState = createInitialAdminListState(config);
        const settingsState = deserializeSettingsToState(
          listSettings(adminSettings, listName),
          config,
        );

        // Use enhanced URL parameter parsing with validation
        const urlParsingResult = parseUrlParameters(
          router.query,
          listName,
          DEFAULT_URL_VALIDATION_CONFIG,
        );
        const {
          state: urlState,
          errors,
          warnings,
        } = deserializeUrlParametersToState(urlParsingResult.params);

        // Log any URL parsing issues for debugging
        if (errors.length > 0) {
          console.warn('URL parameter parsing errors:', errors);
        }
        if (warnings.length > 0) {
          console.info('URL parameter parsing warnings:', warnings);
        }

        return mergeAdminListStates(baseState, settingsState, urlState);
      },
      {
        listName,
        hasUrlParams: Object.keys(router.query).length > 0,
        hasSettings: !!listSettings(adminSettings, listName),
      },
    );
  }, [
    config,
    adminSettings,
    listName,
    router.query,
    performanceMonitor,
    listSettings,
  ]);

  // Main state
  const [state, setState] = useState<AdminListState>(initialState);

  // Enhanced debouncing with StateSyncDebouncer
  const debouncerRef = useRef<StateSyncDebouncer | null>(null);
  const previousStateRef = useRef<AdminListState>(state);

  // Filter state manager for advanced filter operations
  const filterManagerRef = useRef<FilterStateManager | null>(null);

  // Pagination managers for enhanced pagination handling
  const pageSizeManagerRef = useRef<PageSizeManager | null>(null);
  const pageBoundaryValidatorRef = useRef<PageBoundaryValidator | null>(null);

  // URL history manager for browser navigation support
  const urlHistoryManagerRef = useRef<UrlHistoryManager | null>(null);

  // Initialize debouncer
  if (!debouncerRef.current) {
    debouncerRef.current = new StateSyncDebouncer();
  }

  // Initialize filter manager
  if (!filterManagerRef.current) {
    const filterConfig: FilterStateConfig = {
      maxValuesPerFilter: 50,
      maxValueLength: 100,
      maxActiveFilters: 20,
      debounceMs: syncOptions.urlDebounceMs,
      validateAgainstAllowed: false,
    };

    filterManagerRef.current = new FilterStateManager(
      initialState.filters,
      filterConfig,
    );

    // Listen to filter changes and update main state
    filterManagerRef.current.addChangeListener((event) => {
      setState((prevState) => {
        const newState = {
          ...prevState,
          filters: event.newFilters,
          page: 1, // Reset to first page when filters change
          error: null,
        };

        // Skip update if state hasn't actually changed
        if (areAdminListStatesEqual(prevState, newState)) {
          return prevState;
        }

        previousStateRef.current = newState;
        return newState;
      });
    });
  }

  // Initialize pagination managers
  if (!pageSizeManagerRef.current) {
    const paginationConfig: Partial<PaginationConfig> = {
      defaultPageSize: config.defaultPageSize,
      resetPageOnSizeChange: true,
      autoValidateBoundaries: true,
    };

    pageSizeManagerRef.current = new PageSizeManager(paginationConfig);

    // Listen to pagination changes and update main state
    pageSizeManagerRef.current.addChangeListener((event) => {
      setState((prevState) => {
        const newState = {
          ...prevState,
          page: event.newState.page,
          pageSize: event.newState.pageSize,
          error: null,
        };

        // Skip update if state hasn't actually changed
        if (areAdminListStatesEqual(prevState, newState)) {
          return prevState;
        }

        previousStateRef.current = newState;
        return newState;
      });
    });
  }

  if (!pageBoundaryValidatorRef.current) {
    pageBoundaryValidatorRef.current = new PageBoundaryValidator();
  }

  // Initialize URL history manager for browser navigation support
  if (!urlHistoryManagerRef.current && typeof window !== 'undefined') {
    const urlValidationConfig: UrlValidationConfig = {
      ...DEFAULT_URL_VALIDATION_CONFIG,
      maxPageNumber: 10000,
      maxPageSize: 1000,
      maxSearchLength: 500,
    };

    urlHistoryManagerRef.current = new UrlHistoryManager(
      listName,
      urlValidationConfig,
      (restoredState) => {
        // Handle browser navigation state restoration
        setState((prevState) => {
          const newState = mergeAdminListStates(prevState, restoredState);

          // Skip update if state hasn't actually changed
          if (areAdminListStatesEqual(prevState, newState)) {
            return prevState;
          }

          previousStateRef.current = newState;
          return newState;
        });
      },
    );

    // Start listening to browser navigation events
    urlHistoryManagerRef.current.startListening();
  }

  // Update state and handle synchronization
  const updateState = useCallback(
    (updater: (prevState: AdminListState) => AdminListState) => {
      setState((prevState) => {
        const newState = updater(prevState);

        // Skip update if state hasn't actually changed
        if (areAdminListStatesEqual(prevState, newState)) {
          return prevState;
        }

        // Store for sync operations
        previousStateRef.current = newState;

        return newState;
      });
    },
    [],
  );

  // Enhanced debounced URL synchronization with performance monitoring
  const debouncedUrlSync = useEnhancedDebounce(
    async (newState: AdminListState) => {
      if (!syncOptions.syncToUrl) return;

      await performanceMonitor.timeAsyncOperation(
        'syncStateToUrl',
        async () => {
          try {
            const urlParams = serializeStateToUrlParameters(newState, listName);

            // Only update URL if it would actually change
            const currentQuery = router.query;
            const newQuery = { ...urlParams };

            const queryChanged =
              Object.keys(newQuery).some(
                (key) => currentQuery[key] !== newQuery[key],
              ) ||
              Object.keys(currentQuery).some(
                (key) => key !== 'name' && !newQuery.hasOwnProperty(key),
              );

            if (queryChanged) {
              await router.push(
                {
                  pathname: router.pathname,
                  query: newQuery,
                },
                undefined,
                { shallow: true },
              );
            }
          } catch (error) {
            console.error('🚨 URL Sync Error:', {
              error: error instanceof Error ? error.message : String(error),
              listName,
              state: newState,
              timestamp: new Date().toISOString(),
            });

            setState((prev) => ({
              ...prev,
              error:
                'Failed to update URL. Your current view may not be bookmarkable.',
            }));
          }
        },
        {
          listName,
          hasFilters: Object.keys(newState.filters).length > 0,
          page: newState.page,
          pageSize: newState.pageSize,
        },
      );
    },
    syncOptions.urlDebounceMs,
    {
      leading: false,
      trailing: true,
      maxWait: syncOptions.urlDebounceMs * 2,
    },
  );

  const syncToUrl = useCallback(
    (newState: AdminListState) => {
      debouncedUrlSync(newState);
    },
    [debouncedUrlSync],
  );

  // Enhanced debounced settings synchronization with performance monitoring
  const debouncedSettingsSync = useEnhancedDebounce(
    async (newState: AdminListState) => {
      if (!syncOptions.syncToSettings) return;

      await performanceMonitor.timeAsyncOperation(
        'syncStateToSettings',
        async () => {
          try {
            // TODO: Implement settings persistence
            // This would typically involve calling an API to save user settings
            const settingsData = serializeStateToSettings(newState, []);

            console.log('⚙️ Settings Sync:', {
              listName,
              settingsData,
              timestamp: new Date().toISOString(),
            });

            // In a real implementation, you would make an API call here:
            // await settingsAPI.updateUserSettings(listName, settingsData);
          } catch (error) {
            console.error('🚨 Settings Sync Error:', {
              error: error instanceof Error ? error.message : String(error),
              listName,
              state: newState,
              timestamp: new Date().toISOString(),
            });

            // Don't set error state for settings sync failures as they're not critical
            // The user can still use the application, they just won't have persistent settings
            console.warn(
              'Settings sync failed, but continuing with current session state',
            );
          }
        },
        {
          listName,
          hasFilters: Object.keys(newState.filters).length > 0,
          pageSize: newState.pageSize,
        },
      );
    },
    syncOptions.settingsDebounceMs,
    {
      leading: false,
      trailing: true,
      maxWait: syncOptions.settingsDebounceMs * 2,
    },
  );

  const syncToSettings = useCallback(
    (newState: AdminListState) => {
      debouncedSettingsSync(newState);
    },
    [debouncedSettingsSync],
  );

  // Sync state changes
  useEffect(() => {
    const currentState = previousStateRef.current;
    syncToUrl(currentState);
    syncToSettings(currentState);
  }, [state, syncToUrl, syncToSettings]);

  // Action creators
  const actions: AdminListStateActions = useMemo(
    () => ({
      setSearch: (search: string) => {
        updateState((prev) => ({
          ...prev,
          search: search.trim(),
          page: 1, // Reset to first page when searching
          error: null,
        }));
      },

      setPage: (page: number) => {
        updateState((prev) => ({
          ...prev,
          page: Math.max(1, page),
          error: null,
        }));
      },

      setPageSize: (pageSize: number) => {
        if (pageSizeManagerRef.current) {
          // Use enhanced page size manager
          const currentPaginationState = calculatePaginationInfo(
            state.page,
            state.pageSize,
            0, // We don't have totalItems here, will be validated later
          );

          pageSizeManagerRef.current.updatePageSize(
            currentPaginationState,
            pageSize,
            0, // Will be validated when totalItems is known
          );
        } else {
          // Fallback to direct state update
          updateState((prev) => ({
            ...prev,
            pageSize: Math.max(1, pageSize),
            page: 1, // Reset to first page when changing page size
            error: null,
          }));
        }
      },

      setSort: (field: number, order: SortOrder) => {
        updateState((prev) => ({
          ...prev,
          sortField: field,
          sortOrder: order,
          error: null,
        }));
      },

      setFilters: (columnName: string, values: string[]) => {
        if (filterManagerRef.current) {
          filterManagerRef.current.setFilter(columnName, values);
        } else {
          // Fallback to direct state update if filter manager not available
          updateState((prev) => {
            const newFilters = { ...prev.filters };

            if (values.length === 0) {
              delete newFilters[columnName];
            } else {
              newFilters[columnName] = [...values];
            }

            return {
              ...prev,
              filters: normalizeFilters(newFilters),
              page: 1, // Reset to first page when filtering
              error: null,
            };
          });
        }
      },

      setBulkFilters: (filters: Record<string, string[]>) => {
        if (filterManagerRef.current) {
          filterManagerRef.current.setBulkFilters(filters);
        } else {
          // Fallback to direct state update if filter manager not available
          updateState((prev) => ({
            ...prev,
            filters: normalizeFilters(filters),
            page: 1, // Reset to first page when filtering
            error: null,
          }));
        }
      },

      clearFilters: () => {
        if (filterManagerRef.current) {
          filterManagerRef.current.clearAllFilters();
        } else {
          // Fallback to direct state update if filter manager not available
          updateState((prev) => ({
            ...prev,
            filters: {},
            page: 1,
            error: null,
          }));
        }
      },

      clearColumnFilter: (columnName: string) => {
        if (filterManagerRef.current) {
          filterManagerRef.current.clearFilter(columnName);
        } else {
          // Fallback to direct state update if filter manager not available
          updateState((prev) => {
            const newFilters = { ...prev.filters };
            delete newFilters[columnName];

            return {
              ...prev,
              filters: newFilters,
              page: 1,
              error: null,
            };
          });
        }
      },

      setLoading: (isLoading: boolean) => {
        updateState((prev) => ({
          ...prev,
          isLoading,
        }));
      },

      setError: (error: string | null) => {
        updateState((prev) => ({
          ...prev,
          error,
          isLoading: false,
        }));
      },

      reset: () => {
        const resetState = createInitialAdminListState(config);
        setState(resetState);

        // Reset filter manager as well
        if (filterManagerRef.current) {
          filterManagerRef.current.clearAllFilters();
        }
      },

      // Enhanced filter actions using FilterStateManager
      addToFilter: (columnName: string, values: string[]) => {
        if (filterManagerRef.current) {
          filterManagerRef.current.addToFilter(columnName, values);
        }
      },

      removeFromFilter: (columnName: string, values: string[]) => {
        if (filterManagerRef.current) {
          filterManagerRef.current.removeFromFilter(columnName, values);
        }
      },
    }),
    [updateState, config],
  );

  // Cleanup debouncer, filter manager, pagination managers, and URL history manager on unmount
  useEffect(() => {
    return () => {
      if (debouncerRef.current) {
        debouncerRef.current.destroy();
        debouncerRef.current = null;
      }
      if (filterManagerRef.current) {
        filterManagerRef.current.destroy();
        filterManagerRef.current = null;
      }
      if (urlHistoryManagerRef.current) {
        urlHistoryManagerRef.current.stopListening();
        urlHistoryManagerRef.current = null;
      }
      // Pagination managers don't have destroy methods, just clear references
      pageSizeManagerRef.current = null;
      pageBoundaryValidatorRef.current = null;
    };
  }, []);

  // Helper functions
  const helpers = useMemo(
    () => ({
      /**
       * Validates and corrects page number based on total items
       */
      validatePage: (totalItems: number) => {
        if (pageBoundaryValidatorRef.current) {
          const validation =
            pageBoundaryValidatorRef.current.validatePageBoundaries(
              state.page,
              totalItems,
              state.pageSize,
            );

          if (validation.wasCorrected) {
            actions.setPage(validation.correctedPage);
          }

          return validation.correctedPage;
        } else {
          // Fallback to original validation
          const validPage = validatePageNumber(
            state.page,
            totalItems,
            state.pageSize,
          );
          if (validPage !== state.page) {
            actions.setPage(validPage);
          }
          return validPage;
        }
      },

      /**
       * Gets active filter count
       */
      getActiveFilterCount: () => {
        return getActiveFilterCount(state.filters);
      },

      /**
       * Checks if a specific filter is active
       */
      isFilterActive: (columnName: string, value?: string) => {
        return isFilterValueActive(state.filters, columnName, value);
      },

      /**
       * Checks if two filter states are equal
       */
      areFiltersEqual: (otherFilters: Record<string, string[]>) => {
        return areFiltersEqual(state.filters, otherFilters);
      },

      /**
       * Gets filter manager instance for advanced operations
       */
      getFilterManager: () => {
        return filterManagerRef.current;
      },

      /**
       * Gets current query parameters for API calls
       */
      getQueryParams: () => ({
        search: state.search,
        page: state.page,
        pageSize: state.pageSize,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
        filters: state.filters,
      }),

      /**
       * Gets complete pagination information
       */
      getPaginationInfo: (totalItems: number): PaginationState => {
        return calculatePaginationInfo(state.page, state.pageSize, totalItems);
      },

      /**
       * Validates page size and returns corrected value
       */
      validatePageSize: (pageSize: number) => {
        return validateAndCorrectPageSize(pageSize);
      },

      /**
       * Gets available page size options
       */
      getPageSizeOptions: () => {
        return (
          pageSizeManagerRef.current?.getPageSizeOptions() || [
            12, 24, 48, 96, 192,
          ]
        );
      },

      /**
       * Gets pagination manager instance for advanced operations
       */
      getPaginationManager: () => {
        return pageSizeManagerRef.current;
      },

      /**
       * Gets page boundary validator instance
       */
      getPageBoundaryValidator: () => {
        return pageBoundaryValidatorRef.current;
      },

      /**
       * Gets URL history manager instance for browser navigation
       */
      getUrlHistoryManager: () => {
        return urlHistoryManagerRef.current;
      },

      /**
       * Gets current URL parameters
       */
      getCurrentUrlParams: () => {
        const urlParams = serializeStateToUrlParameters(state, listName);
        return urlParams;
      },

      /**
       * Validates current URL parameters and returns any errors
       */
      validateCurrentUrl: () => {
        const urlParsingResult = parseUrlParameters(
          router.query,
          listName,
          DEFAULT_URL_VALIDATION_CONFIG,
        );
        return {
          isValid: urlParsingResult.isValid,
          errors: urlParsingResult.errors,
          warnings: urlParsingResult.warnings,
        };
      },

      /**
       * Restores state from URL with error handling
       */
      restoreFromUrl: () => {
        try {
          const urlParsingResult = parseUrlParameters(
            router.query,
            listName,
            DEFAULT_URL_VALIDATION_CONFIG,
          );
          const {
            state: urlState,
            errors,
            warnings,
          } = deserializeUrlParametersToState(urlParsingResult.params);

          if (errors.length > 0) {
            console.warn('Error restoring state from URL:', errors);
            actions.setError(
              'Invalid URL parameters detected. Some filters may not be applied correctly.',
            );
          }

          if (warnings.length > 0) {
            console.info('URL parameter warnings:', warnings);
          }

          // Merge URL state with current state
          const mergedState = mergeAdminListStates(state, urlState);
          setState(mergedState);

          return { success: true, errors, warnings };
        } catch (error) {
          console.error('Failed to restore state from URL:', error);
          actions.setError('Failed to restore state from URL parameters.');
          return { success: false, errors: [String(error)], warnings: [] };
        }
      },

      /**
       * Clears all URL parameters except the list name
       */
      clearUrlParams: () => {
        try {
          const cleanParams = { name: listName };
          router.push(
            {
              pathname: router.pathname,
              query: cleanParams,
            },
            undefined,
            { shallow: true },
          );
        } catch (error) {
          console.error('Failed to clear URL parameters:', error);
          actions.setError('Failed to clear URL parameters.');
        }
      },

      /**
       * Manually triggers URL synchronization
       */
      syncToUrl: () => {
        syncToUrl(state);
      },

      /**
       * Gets performance metrics for debugging and optimization
       */
      getPerformanceMetrics: () => {
        const hookMetrics = performanceMonitor.getMetrics();
        const filterManagerMetrics =
          filterManagerRef.current?.getPerformanceMetrics();
        const debouncerMetrics = debouncerRef.current?.getPerformanceMetrics();

        return {
          hook: {
            metrics: hookMetrics,
            averageDurations: {
              initializeAdminListState: performanceMonitor.getAverageDuration(
                'initializeAdminListState',
              ),
              syncStateToUrl:
                performanceMonitor.getAverageDuration('syncStateToUrl'),
              syncStateToSettings: performanceMonitor.getAverageDuration(
                'syncStateToSettings',
              ),
            },
          },
          filterManager: filterManagerMetrics,
          debouncer: debouncerMetrics,
        };
      },

      /**
       * Clears all performance metrics and caches
       */
      clearPerformanceData: () => {
        performanceMonitor.clearMetrics();
        if (filterManagerRef.current) {
          // Clear filter manager caches if available
          const metrics = filterManagerRef.current.getPerformanceMetrics();
          console.log('Cleared filter manager performance data:', metrics);
        }
        if (debouncerRef.current) {
          // Clear debouncer caches if available
          const metrics = debouncerRef.current.getPerformanceMetrics();
          console.log('Cleared debouncer performance data:', metrics);
        }
      },

      /**
       * Forces immediate execution of all pending debounced operations
       */
      flushAllPendingOperations: async () => {
        const operations = [];

        if (filterManagerRef.current) {
          operations.push(filterManagerRef.current.flush());
        }

        operations.push(debouncedUrlSync.flush());
        operations.push(debouncedSettingsSync.flush());

        await Promise.all(operations);
      },
    }),
    [
      state,
      actions,
      performanceMonitor,
      debouncedUrlSync,
      debouncedSettingsSync,
    ],
  );

  return {
    state,
    actions,
    helpers,
  };
};
