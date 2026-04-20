import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import {
  createMemoizedFunction,
  PerformanceMonitor,
  type MemoizedFunction,
} from './performanceOptimization';

// Type imports
type AdminListState = import('../types/AdminListState').AdminListState;
type AdminListStateConfig =
  import('../types/AdminListState').AdminListStateConfig;
type AdminListUrlParams = import('../types/AdminListState').AdminListUrlParams;
type AdminListSettingsData =
  import('../types/AdminListState').AdminListSettingsData;

/**
 * Enhanced state synchronization utilities for admin lists
 * Provides robust URL parameter and settings synchronization
 */

/**
 * URL Parameter Serialization/Deserialization
 */

/**
 * Serializes admin list state to URL parameters with validation
 */
export const serializeStateToUrlParams = (
  state: AdminListState,
  listName: string,
): AdminListUrlParams => {
  const params: AdminListUrlParams = { name: listName };

  // Only include non-default values to keep URLs clean
  if (state.page > 1) {
    params.page = state.page;
  }

  if (state.pageSize !== 24) {
    // 24 is the default page size
    params.pageSize = state.pageSize;
  }

  if (state.search && state.search.trim()) {
    params.search = state.search.trim();
  }

  if (state.sortField && state.sortField > 0) {
    params.sortField = state.sortField;
  }

  if (
    state.sortOrder &&
    (state.sortOrder === SortOrder.SORT_ORDER_ASCENDING ||
      state.sortOrder === SortOrder.SORT_ORDER_DESCENDING)
  ) {
    params.sortOrder = state.sortOrder;
  }

  // Serialize filters as individual query parameters
  Object.entries(state.filters).forEach(([columnName, values]) => {
    if (values && values.length > 0) {
      // Filter out empty values
      const nonEmptyValues = values.filter((v) => v && v.trim());
      if (nonEmptyValues.length > 0) {
        // Validate column name to prevent injection
        const sanitizedColumnName = columnName.replace(/[^a-zA-Z0-9_]/g, '');
        if (sanitizedColumnName) {
          params[`filter_${sanitizedColumnName}`] = nonEmptyValues.join(',');
        }
      }
    }
  });

  return params;
};

/**
 * Deserializes URL parameters to admin list state with validation
 */
export const deserializeUrlParamsToState = (
  urlParams: Record<string, string | string[]>,
  config: AdminListStateConfig,
): Partial<AdminListState> => {
  const state: Partial<AdminListState> = {};

  try {
    // Parse and validate page number
    if (urlParams.page) {
      const pageStr = Array.isArray(urlParams.page)
        ? urlParams.page[0]
        : urlParams.page;
      const page = parseInt(pageStr, 10);
      if (!isNaN(page) && page > 0 && page <= 10000) {
        // Reasonable upper limit
        state.page = page;
      }
    }

    // Parse and validate page size
    if (urlParams.pageSize) {
      const pageSizeStr = Array.isArray(urlParams.pageSize)
        ? urlParams.pageSize[0]
        : urlParams.pageSize;
      const pageSize = parseInt(pageSizeStr, 10);
      if (!isNaN(pageSize) && pageSize > 0 && pageSize <= 1000) {
        // Reasonable limits
        state.pageSize = pageSize;
      }
    }

    // Parse and validate search
    if (urlParams.search) {
      const search = Array.isArray(urlParams.search)
        ? urlParams.search[0]
        : urlParams.search;
      if (typeof search === 'string' && search.length <= 500) {
        // Reasonable length limit
        state.search = search.trim();
      }
    }

    // Parse and validate sort field
    if (urlParams.sortField) {
      const sortFieldStr = Array.isArray(urlParams.sortField)
        ? urlParams.sortField[0]
        : urlParams.sortField;
      const sortField = parseInt(sortFieldStr, 10);
      if (!isNaN(sortField) && sortField >= 0) {
        state.sortField = sortField;
      }
    }

    // Parse and validate sort order
    if (urlParams.sortOrder) {
      const sortOrderStr = Array.isArray(urlParams.sortOrder)
        ? urlParams.sortOrder[0]
        : urlParams.sortOrder;
      const sortOrder = parseInt(sortOrderStr, 10);
      if (Object.values(SortOrder).includes(sortOrder)) {
        state.sortOrder = sortOrder as SortOrder;
      }
    }

    // Parse and validate filter parameters
    const filters: Record<string, string[]> = {};
    Object.entries(urlParams).forEach(([key, value]) => {
      if (key.startsWith('filter_')) {
        const columnName = key.replace('filter_', '');
        // Validate column name - must start with letter or underscore, then alphanumeric/underscore
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
          const filterValue = Array.isArray(value) ? value[0] : value;
          if (typeof filterValue === 'string' && filterValue.length <= 1000) {
            const values = filterValue
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v.length > 0 && v.length <= 100) // Validate individual filter values
              .slice(0, 50); // Limit number of filter values

            if (values.length > 0) {
              filters[columnName] = values;
            }
          }
        }
      }
    });

    if (Object.keys(filters).length > 0) {
      state.filters = normalizeFilters(filters);
    }
  } catch (error) {
    console.warn('Error deserializing URL parameters:', error);
    // Return partial state with what we could parse
  }

  return state;
};

/**
 * Settings Synchronization
 */

/**
 * Serializes admin list state to settings format with validation
 */
export const serializeStateToSettings = (
  state: AdminListState,
  columns: any[], // AdminListColumn[] - using any to avoid circular dependency
): AdminListSettingsData => {
  return {
    pageSize: Math.max(1, Math.min(1000, state.pageSize)), // Validate page size
    sortField: Math.max(0, state.sortField),
    sortOrder: state.sortOrder,
    columns: columns || [],
    defaultFilters:
      Object.keys(state.filters).length > 0
        ? normalizeFilters(state.filters)
        : undefined,
  };
};

/**
 * Deserializes settings to admin list state with validation
 */
export const deserializeSettingsToState = (
  settings: AdminListSettingsData | undefined,
  config: AdminListStateConfig,
): Partial<AdminListState> => {
  if (!settings) return {};

  const state: Partial<AdminListState> = {};

  try {
    // Validate and set page size
    if (
      typeof settings.pageSize === 'number' &&
      settings.pageSize > 0 &&
      settings.pageSize <= 1000
    ) {
      state.pageSize = settings.pageSize;
    }

    // Validate and set sort field
    if (typeof settings.sortField === 'number' && settings.sortField >= 0) {
      state.sortField = settings.sortField;
    }

    // Validate and set sort order
    if (Object.values(SortOrder).includes(settings.sortOrder)) {
      state.sortOrder = settings.sortOrder;
    }

    // Validate and set default filters
    if (
      settings.defaultFilters &&
      typeof settings.defaultFilters === 'object'
    ) {
      const validatedFilters = normalizeFilters(settings.defaultFilters);
      if (Object.keys(validatedFilters).length > 0) {
        state.filters = validatedFilters;
      }
    }
  } catch (error) {
    console.warn('Error deserializing settings:', error);
    // Return partial state with what we could parse
  }

  return state;
};

/**
 * State Validation and Normalization
 */

/**
 * Normalizes filter values to ensure consistent format and validation
 * This is a simplified version that delegates to the enhanced filter manager
 */
export const normalizeFilters = (
  filters: Record<string, string[]>,
): Record<string, string[]> => {
  const normalized: Record<string, string[]> = {};

  if (!filters || typeof filters !== 'object') {
    return normalized;
  }

  Object.entries(filters).forEach(([key, values]) => {
    // Validate column name - must start with letter or underscore, then alphanumeric/underscore
    if (typeof key !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return;
    }

    // Validate and normalize values
    if (Array.isArray(values)) {
      const cleanValues = values
        .filter((v) => typeof v === 'string' && v.trim().length > 0)
        .map((v) => v.trim())
        .filter((v) => v.length <= 100) // Reasonable length limit
        .slice(0, 50); // Limit number of values per filter

      // Remove duplicates while preserving order
      const uniqueValues = Array.from(new Set(cleanValues));

      if (uniqueValues.length > 0) {
        normalized[key] = uniqueValues;
      }
    }
  });

  return normalized;
};

/**
 * Validates admin list state structure and values
 */
export const validateAdminListState = (
  state: Partial<AdminListState>,
  config: AdminListStateConfig,
): AdminListState => {
  const validatedState: AdminListState = {
    search: '',
    page: 1,
    pageSize: config.defaultPageSize,
    sortField: config.defaultSortField,
    sortOrder: config.defaultSortOrder,
    filters: {},
    isLoading: false,
    error: null,
  };

  // Validate search
  if (typeof state.search === 'string' && state.search.length <= 500) {
    validatedState.search = state.search.trim();
  }

  // Validate page
  if (typeof state.page === 'number' && state.page > 0 && state.page <= 10000) {
    validatedState.page = state.page;
  }

  // Validate page size
  if (
    typeof state.pageSize === 'number' &&
    state.pageSize > 0 &&
    state.pageSize <= 1000
  ) {
    validatedState.pageSize = state.pageSize;
  }

  // Validate sort field
  if (typeof state.sortField === 'number' && state.sortField >= 0) {
    validatedState.sortField = state.sortField;
  }

  // Validate sort order
  if (Object.values(SortOrder).includes(state.sortOrder as SortOrder)) {
    validatedState.sortOrder = state.sortOrder as SortOrder;
  }

  // Validate filters
  if (state.filters && typeof state.filters === 'object') {
    validatedState.filters = normalizeFilters(state.filters);
  }

  // Validate boolean states
  if (typeof state.isLoading === 'boolean') {
    validatedState.isLoading = state.isLoading;
  }

  // Validate error
  if (
    state.error === null ||
    (typeof state.error === 'string' && state.error.length <= 1000)
  ) {
    validatedState.error = state.error;
  }

  return validatedState;
};

/**
 * Validates page number against total items and corrects if necessary
 * @deprecated Use validatePageNumberEnhanced from paginationManager for enhanced validation
 */
export const validatePageNumber = (
  page: number,
  totalItems: number,
  pageSize: number,
): number => {
  if (typeof page !== 'number' || page < 1) {
    return 1;
  }

  if (typeof totalItems !== 'number' || totalItems < 0) {
    return page; // Can't validate without total items
  }

  if (typeof pageSize !== 'number' || pageSize < 1) {
    return page; // Can't validate without page size
  }

  const maxPage = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(page, maxPage);
};

/**
 * Merges multiple partial states with priority order and validation
 */
export const mergeAdminListStates = (
  baseState: AdminListState,
  ...partialStates: Partial<AdminListState>[]
): AdminListState => {
  let mergedState = { ...baseState };

  partialStates.forEach((partialState) => {
    if (partialState && typeof partialState === 'object') {
      Object.entries(partialState).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'filters' && typeof value === 'object') {
            // Merge filters instead of replacing them
            mergedState.filters = { ...mergedState.filters, ...value };
          } else {
            (mergedState as any)[key] = value;
          }
        }
      });
    }
  });

  // Ensure filters are normalized after merging
  mergedState.filters = normalizeFilters(mergedState.filters);

  return mergedState;
};

/**
 * Checks if two admin list states are equal (for optimization)
 */
export const areAdminListStatesEqual = (
  state1: AdminListState,
  state2: AdminListState,
): boolean => {
  if (!state1 || !state2) return false;

  // Compare primitive values
  if (
    state1.search !== state2.search ||
    state1.page !== state2.page ||
    state1.pageSize !== state2.pageSize ||
    state1.sortField !== state2.sortField ||
    state1.sortOrder !== state2.sortOrder ||
    state1.isLoading !== state2.isLoading ||
    state1.error !== state2.error
  ) {
    return false;
  }

  // Deep compare filters
  const filters1Keys = Object.keys(state1.filters || {});
  const filters2Keys = Object.keys(state2.filters || {});

  if (filters1Keys.length !== filters2Keys.length) {
    return false;
  }

  return filters1Keys.every((key) => {
    const values1 = state1.filters[key] || [];
    const values2 = state2.filters[key] || [];

    if (values1.length !== values2.length) {
      return false;
    }

    return values1.every((value, index) => value === values2[index]);
  });
};

/**
 * Creates a deep clone of admin list state
 */
export const cloneAdminListState = (state: AdminListState): AdminListState => {
  return {
    ...state,
    filters: Object.entries(state.filters).reduce((acc, [key, values]) => {
      acc[key] = [...values];
      return acc;
    }, {} as Record<string, string[]>),
  };
};

/**
 * Enhanced utility for debouncing state synchronization operations with performance monitoring
 */
export class StateSyncDebouncer {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private performanceMonitor: PerformanceMonitor;
  private memoizedSerializers: Map<string, MemoizedFunction<any>> = new Map();

  constructor() {
    this.performanceMonitor = new PerformanceMonitor({
      enableMonitoring: true,
      logMetrics: process.env.NODE_ENV === 'development',
      slowOperationThreshold: 25, // Sync operations should be very fast
      maxMetricsHistory: 30,
    });

    // Initialize memoized serialization functions
    this.initializeMemoizedFunctions();
  }

  private initializeMemoizedFunctions(): void {
    // Memoized URL serialization
    this.memoizedSerializers.set(
      'urlSerialization',
      createMemoizedFunction(serializeStateToUrlParams, {
        maxSize: 10,
        ttl: 5000, // Cache for 5 seconds
        keyGenerator: (state, listName) =>
          `${listName}-${JSON.stringify(state)}`,
      }),
    );

    // Memoized settings serialization
    this.memoizedSerializers.set(
      'settingsSerialization',
      createMemoizedFunction(serializeStateToSettings, {
        maxSize: 5,
        ttl: 10000, // Cache for 10 seconds
        keyGenerator: (state, columns) =>
          `${JSON.stringify(state)}-${columns.length}`,
      }),
    );

    // Memoized URL deserialization
    this.memoizedSerializers.set(
      'urlDeserialization',
      createMemoizedFunction(deserializeUrlParamsToState, {
        maxSize: 10,
        ttl: 5000, // Cache for 5 seconds
        keyGenerator: (urlParams, config) =>
          `${JSON.stringify(urlParams)}-${JSON.stringify(config)}`,
      }),
    );

    // Memoized settings deserialization
    this.memoizedSerializers.set(
      'settingsDeserialization',
      createMemoizedFunction(deserializeSettingsToState, {
        maxSize: 5,
        ttl: 10000, // Cache for 10 seconds
        keyGenerator: (settings, config) =>
          `${JSON.stringify(settings)}-${JSON.stringify(config)}`,
      }),
    );
  }

  debounce(key: string, fn: () => void, delay: number): void {
    this.performanceMonitor.timeOperation(
      'debounceOperation',
      () => {
        // Clear existing timeout for this key
        const existingTimeout = this.timeouts.get(key);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout with performance monitoring
        const timeout = setTimeout(() => {
          this.performanceMonitor.timeOperation(
            'executeDebouncedOperation',
            fn,
            { key, delay },
          );
          this.timeouts.delete(key);
        }, delay);

        this.timeouts.set(key, timeout);
      },
      { key, delay, activeTimeouts: this.timeouts.size },
    );
  }

  clear(key?: string): void {
    if (key) {
      const timeout = this.timeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.timeouts.delete(key);
      }
    } else {
      // Clear all timeouts
      this.timeouts.forEach((timeout) => clearTimeout(timeout));
      this.timeouts.clear();
    }
  }

  /**
   * Gets memoized serializer function
   */
  getMemoizedSerializer<T extends (...args: any[]) => any>(
    name: string,
  ): MemoizedFunction<T> | null {
    return (this.memoizedSerializers.get(name) as MemoizedFunction<T>) || null;
  }

  /**
   * Gets performance metrics for debugging
   */
  getPerformanceMetrics(): {
    metrics: any[];
    averageDurations: Record<string, number>;
    cacheStats: Record<string, { size: number }>;
  } {
    const metrics = this.performanceMonitor.getMetrics();
    const operations = ['debounceOperation', 'executeDebouncedOperation'];
    const averageDurations = operations.reduce((acc, op) => {
      acc[op] = this.performanceMonitor.getAverageDuration(op);
      return acc;
    }, {} as Record<string, number>);

    const cacheStats: Record<string, { size: number }> = {};
    this.memoizedSerializers.forEach((serializer, name) => {
      cacheStats[name] = { size: serializer.size() };
    });

    return {
      metrics,
      averageDurations,
      cacheStats,
    };
  }

  destroy(): void {
    this.clear();
    this.memoizedSerializers.forEach((serializer) => serializer.clear());
    this.memoizedSerializers.clear();
    this.performanceMonitor.clearMetrics();
  }
}
