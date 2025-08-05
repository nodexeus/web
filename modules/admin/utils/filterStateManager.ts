import { SortOrder } from '../../../generated/blockjoy/common/v1/search';
import {
  PerformanceMonitor,
  createEnhancedDebounce,
  createMemoizedFunction,
  OperationBatcher,
  type DebouncedFunction,
  type MemoizedFunction,
} from './performanceOptimization';

// Type imports
type AdminListState = import('../types/AdminListState').AdminListState;

/**
 * Filter State Management System
 * Provides centralized filter state management with validation, normalization,
 * debouncing, and race condition prevention
 */

/**
 * Configuration for filter state management
 */
export interface FilterStateConfig {
  /** Maximum number of filter values per column */
  maxValuesPerFilter: number;
  /** Maximum length of individual filter values */
  maxValueLength: number;
  /** Maximum number of active filters */
  maxActiveFilters: number;
  /** Debounce delay for filter updates (ms) */
  debounceMs: number;
  /** Whether to validate filter values against allowed values */
  validateAgainstAllowed: boolean;
}

/**
 * Default filter state configuration
 */
export const DEFAULT_FILTER_CONFIG: FilterStateConfig = {
  maxValuesPerFilter: 50,
  maxValueLength: 100,
  maxActiveFilters: 20,
  debounceMs: 300,
  validateAgainstAllowed: false,
};

/**
 * Filter validation result
 */
export interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedFilters: Record<string, string[]>;
}

/**
 * Filter change operation types
 */
export enum FilterChangeType {
  SET = 'SET',
  ADD = 'ADD',
  REMOVE = 'REMOVE',
  CLEAR = 'CLEAR',
  CLEAR_ALL = 'CLEAR_ALL',
  BULK_SET = 'BULK_SET',
}

/**
 * Filter change operation
 */
export interface FilterChangeOperation {
  type: FilterChangeType;
  columnName?: string;
  values?: string[];
  bulkFilters?: Record<string, string[]>;
  timestamp: number;
}

/**
 * Filter state change event
 */
export interface FilterStateChangeEvent {
  operation: FilterChangeOperation;
  previousFilters: Record<string, string[]>;
  newFilters: Record<string, string[]>;
  validationResult: FilterValidationResult;
}

/**
 * Enhanced filter normalization with comprehensive validation
 */
export const normalizeAndValidateFilters = (
  filters: Record<string, string[]>,
  config: FilterStateConfig = DEFAULT_FILTER_CONFIG,
  allowedValues?: Record<string, string[]>,
): FilterValidationResult => {
  const result: FilterValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    normalizedFilters: {},
  };

  if (!filters || typeof filters !== 'object') {
    result.errors.push('Filters must be a valid object');
    result.isValid = false;
    return result;
  }

  const filterEntries = Object.entries(filters);

  // Check maximum number of active filters
  if (filterEntries.length > config.maxActiveFilters) {
    result.errors.push(
      `Too many active filters (${filterEntries.length}). Maximum allowed: ${config.maxActiveFilters}`,
    );
    result.isValid = false;
  }

  filterEntries.forEach(([columnName, values]) => {
    // Validate column name
    if (typeof columnName !== 'string') {
      result.errors.push(`Invalid column name type: ${typeof columnName}`);
      result.isValid = false;
      return;
    }

    // Validate column name format (alphanumeric, underscore, camelCase)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
      result.errors.push(
        `Invalid column name format: ${columnName}. Must start with letter or underscore, followed by alphanumeric characters or underscores.`,
      );
      result.isValid = false;
      return;
    }

    // Validate values array
    if (!Array.isArray(values)) {
      result.errors.push(
        `Filter values for column '${columnName}' must be an array`,
      );
      result.isValid = false;
      return;
    }

    // Check maximum values per filter
    if (values.length > config.maxValuesPerFilter) {
      result.warnings.push(
        `Too many values for filter '${columnName}' (${values.length}). Truncating to ${config.maxValuesPerFilter}.`,
      );
    }

    // Normalize and validate individual values
    const normalizedValues: string[] = [];
    const seenValues = new Set<string>();

    values
      .slice(0, config.maxValuesPerFilter) // Limit number of values
      .forEach((value, index) => {
        if (typeof value !== 'string') {
          result.warnings.push(
            `Non-string value at index ${index} in filter '${columnName}': ${typeof value}. Converting to string.`,
          );
          value = String(value);
        }

        const trimmedValue = value.trim();

        // Skip empty values
        if (trimmedValue.length === 0) {
          result.warnings.push(
            `Empty value at index ${index} in filter '${columnName}'. Skipping.`,
          );
          return;
        }

        // Check value length
        if (trimmedValue.length > config.maxValueLength) {
          result.warnings.push(
            `Value too long in filter '${columnName}' (${trimmedValue.length} chars). Truncating to ${config.maxValueLength}.`,
          );
          const truncatedValue = trimmedValue.substring(
            0,
            config.maxValueLength,
          );

          // Avoid duplicates after truncation
          if (!seenValues.has(truncatedValue)) {
            normalizedValues.push(truncatedValue);
            seenValues.add(truncatedValue);
          }
          return;
        }

        // Check for duplicates
        if (seenValues.has(trimmedValue)) {
          result.warnings.push(
            `Duplicate value '${trimmedValue}' in filter '${columnName}'. Skipping duplicate.`,
          );
          return;
        }

        // Validate against allowed values if provided
        if (
          config.validateAgainstAllowed &&
          allowedValues &&
          allowedValues[columnName]
        ) {
          if (!allowedValues[columnName].includes(trimmedValue)) {
            result.warnings.push(
              `Value '${trimmedValue}' not in allowed values for filter '${columnName}'. Including anyway.`,
            );
          }
        }

        normalizedValues.push(trimmedValue);
        seenValues.add(trimmedValue);
      });

    // Only include filters with valid values
    if (normalizedValues.length > 0) {
      result.normalizedFilters[columnName] = normalizedValues;
    } else if (values.length > 0) {
      result.warnings.push(
        `All values for filter '${columnName}' were invalid or empty. Filter removed.`,
      );
    }
  });

  return result;
};

/**
 * Merges multiple filter objects with conflict resolution
 */
export const mergeFilters = (
  baseFilters: Record<string, string[]>,
  ...filterSets: Record<string, string[]>[]
): Record<string, string[]> => {
  const merged = { ...baseFilters };

  filterSets.forEach((filterSet) => {
    if (filterSet && typeof filterSet === 'object') {
      Object.entries(filterSet).forEach(([columnName, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          // For merging, we replace the entire filter array for each column
          // This prevents accumulation of duplicate values across merges
          merged[columnName] = [...values];
        } else if (
          values === null ||
          (Array.isArray(values) && values.length === 0)
        ) {
          // Explicitly clear the filter if empty array or null is provided
          delete merged[columnName];
        }
      });
    }
  });

  return merged;
};

/**
 * Applies a filter change operation to existing filters
 */
export const applyFilterOperation = (
  currentFilters: Record<string, string[]>,
  operation: FilterChangeOperation,
  config: FilterStateConfig = DEFAULT_FILTER_CONFIG,
): Record<string, string[]> => {
  let newFilters = { ...currentFilters };

  switch (operation.type) {
    case FilterChangeType.SET:
      if (operation.columnName && operation.values) {
        if (operation.values.length === 0) {
          delete newFilters[operation.columnName];
        } else {
          newFilters[operation.columnName] = [...operation.values];
        }
      }
      break;

    case FilterChangeType.ADD:
      if (operation.columnName && operation.values) {
        const existingValues = newFilters[operation.columnName] || [];
        const combinedValues = [...existingValues, ...operation.values];
        // Remove duplicates while preserving order
        const uniqueValues = Array.from(new Set(combinedValues));
        newFilters[operation.columnName] = uniqueValues.slice(
          0,
          config.maxValuesPerFilter,
        );
      }
      break;

    case FilterChangeType.REMOVE:
      if (operation.columnName && operation.values) {
        const existingValues = newFilters[operation.columnName] || [];
        const filteredValues = existingValues.filter(
          (value) => !operation.values!.includes(value),
        );
        if (filteredValues.length === 0) {
          delete newFilters[operation.columnName];
        } else {
          newFilters[operation.columnName] = filteredValues;
        }
      }
      break;

    case FilterChangeType.CLEAR:
      if (operation.columnName) {
        delete newFilters[operation.columnName];
      }
      break;

    case FilterChangeType.CLEAR_ALL:
      newFilters = {};
      break;

    case FilterChangeType.BULK_SET:
      if (operation.bulkFilters) {
        newFilters = { ...operation.bulkFilters };
      }
      break;

    default:
      console.warn('Unknown filter operation type:', operation.type);
  }

  return newFilters;
};

/**
 * Enhanced debounced filter state manager with performance optimizations
 */
export class FilterStateManager {
  private config: FilterStateConfig;
  private currentFilters: Record<string, string[]> = {};
  private changeListeners: ((event: FilterStateChangeEvent) => void)[] = [];
  private allowedValues?: Record<string, string[]>;

  // Performance optimization components
  private performanceMonitor: PerformanceMonitor;
  private operationBatcher: OperationBatcher<FilterChangeOperation>;
  private debouncedExecutor: DebouncedFunction<() => void>;
  private memoizedNormalizer: MemoizedFunction<
    typeof normalizeAndValidateFilters
  >;
  private memoizedMerger: MemoizedFunction<typeof mergeFilters>;

  constructor(
    initialFilters: Record<string, string[]> = {},
    config: Partial<FilterStateConfig> = {},
    allowedValues?: Record<string, string[]>,
  ) {
    this.config = { ...DEFAULT_FILTER_CONFIG, ...config };
    this.allowedValues = allowedValues;

    // Initialize performance monitoring
    this.performanceMonitor = new PerformanceMonitor({
      enableMonitoring: true,
      logMetrics: process.env.NODE_ENV === 'development',
      slowOperationThreshold: 50, // Filter operations should be fast
      maxMetricsHistory: 50,
    });

    // Initialize operation batcher for grouping rapid changes
    this.operationBatcher = new OperationBatcher<FilterChangeOperation>(
      (operations) => this.processBatchedOperations(operations),
      Math.min(this.config.debounceMs / 2, 50), // Batch operations more aggressively
    );

    // Initialize enhanced debounced executor
    this.debouncedExecutor = createEnhancedDebounce(
      () => this.operationBatcher.flush(),
      this.config.debounceMs,
      {
        leading: false,
        trailing: true,
        maxWait: this.config.debounceMs * 3, // Prevent indefinite delays
      },
    );

    // Initialize memoized functions for expensive operations
    this.memoizedNormalizer = createMemoizedFunction(
      normalizeAndValidateFilters,
      {
        maxSize: 20,
        ttl: 30000, // Cache for 30 seconds
        keyGenerator: (filters, config, allowedValues) =>
          JSON.stringify({
            filters,
            configHash: this.getConfigHash(config),
            allowedValues,
          }),
      },
    );

    this.memoizedMerger = createMemoizedFunction(mergeFilters, {
      maxSize: 10,
      ttl: 10000, // Cache for 10 seconds
      keyGenerator: (...filterSets) => JSON.stringify(filterSets),
    });

    // Initialize with validated filters
    const validationResult = this.performanceMonitor.timeOperation(
      'initializeFilters',
      () =>
        this.memoizedNormalizer(
          initialFilters,
          this.config,
          this.allowedValues,
        ),
      { filterCount: Object.keys(initialFilters).length },
    );

    this.currentFilters = validationResult.normalizedFilters;
  }

  /**
   * Generates a hash for config to use in memoization keys
   */
  private getConfigHash(config: FilterStateConfig): string {
    return `${config.maxValuesPerFilter}-${config.maxValueLength}-${config.maxActiveFilters}-${config.validateAgainstAllowed}`;
  }

  /**
   * Gets current filter state
   */
  getFilters(): Record<string, string[]> {
    return { ...this.currentFilters };
  }

  /**
   * Adds a change listener
   */
  addChangeListener(listener: (event: FilterStateChangeEvent) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Removes a change listener
   */
  removeChangeListener(
    listener: (event: FilterStateChangeEvent) => void,
  ): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Queues a filter operation for enhanced debounced execution
   */
  queueOperation(operation: FilterChangeOperation): void {
    operation.timestamp = Date.now();

    this.performanceMonitor.timeOperation(
      'queueFilterOperation',
      () => {
        this.operationBatcher.add(operation);
        this.debouncedExecutor();
      },
      { operationType: operation.type, columnName: operation.columnName },
    );
  }

  /**
   * Immediately executes all pending operations
   */
  async flush(): Promise<void> {
    await this.performanceMonitor.timeAsyncOperation(
      'flushFilterOperations',
      async () => {
        this.debouncedExecutor.cancel();
        await this.operationBatcher.flush();
      },
      { pendingOperations: this.operationBatcher.size() },
    );
  }

  /**
   * Sets filter values for a column
   */
  setFilter(columnName: string, values: string[]): void {
    this.queueOperation({
      type: FilterChangeType.SET,
      columnName,
      values: [...values],
      timestamp: Date.now(),
    });
  }

  /**
   * Adds values to a filter
   */
  addToFilter(columnName: string, values: string[]): void {
    this.queueOperation({
      type: FilterChangeType.ADD,
      columnName,
      values: [...values],
      timestamp: Date.now(),
    });
  }

  /**
   * Removes values from a filter
   */
  removeFromFilter(columnName: string, values: string[]): void {
    this.queueOperation({
      type: FilterChangeType.REMOVE,
      columnName,
      values: [...values],
      timestamp: Date.now(),
    });
  }

  /**
   * Clears a specific filter
   */
  clearFilter(columnName: string): void {
    this.queueOperation({
      type: FilterChangeType.CLEAR,
      columnName,
      timestamp: Date.now(),
    });
  }

  /**
   * Clears all filters
   */
  clearAllFilters(): void {
    this.queueOperation({
      type: FilterChangeType.CLEAR_ALL,
      timestamp: Date.now(),
    });
  }

  /**
   * Sets multiple filters at once
   */
  setBulkFilters(filters: Record<string, string[]>): void {
    this.queueOperation({
      type: FilterChangeType.BULK_SET,
      bulkFilters: { ...filters },
      timestamp: Date.now(),
    });
  }

  /**
   * Updates configuration and clears relevant caches
   */
  updateConfig(newConfig: Partial<FilterStateConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Clear memoization caches since config changed
    this.memoizedNormalizer.clear();

    // Update debounced executor if debounce time changed
    if (newConfig.debounceMs !== undefined) {
      this.debouncedExecutor.cancel();
      this.debouncedExecutor = createEnhancedDebounce(
        () => this.operationBatcher.flush(),
        this.config.debounceMs,
        {
          leading: false,
          trailing: true,
          maxWait: this.config.debounceMs * 3,
        },
      );
    }
  }

  /**
   * Updates allowed values for validation and clears relevant caches
   */
  updateAllowedValues(allowedValues: Record<string, string[]>): void {
    this.allowedValues = allowedValues;

    // Clear memoization caches since allowed values changed
    this.memoizedNormalizer.clear();
  }

  /**
   * Gets performance metrics for debugging
   */
  getPerformanceMetrics(): {
    metrics: any[];
    averageDurations: Record<string, number>;
    cacheStats: {
      normalizerCacheSize: number;
      mergerCacheSize: number;
    };
  } {
    const metrics = this.performanceMonitor.getMetrics();
    const operations = [
      'queueFilterOperation',
      'flushFilterOperations',
      'processBatchedOperations',
      'initializeFilters',
    ];
    const averageDurations = operations.reduce((acc, op) => {
      acc[op] = this.performanceMonitor.getAverageDuration(op);
      return acc;
    }, {} as Record<string, number>);

    return {
      metrics,
      averageDurations,
      cacheStats: {
        normalizerCacheSize: this.memoizedNormalizer.size(),
        mergerCacheSize: this.memoizedMerger.size(),
      },
    };
  }

  /**
   * Destroys the manager and cleans up resources
   */
  destroy(): void {
    this.debouncedExecutor.cancel();
    this.operationBatcher.clear();
    this.memoizedNormalizer.clear();
    this.memoizedMerger.clear();
    this.performanceMonitor.clearMetrics();
    this.changeListeners = [];
  }

  /**
   * Processes batched operations with performance monitoring
   */
  private async processBatchedOperations(
    operations: FilterChangeOperation[],
  ): Promise<void> {
    if (operations.length === 0) {
      return;
    }

    await this.performanceMonitor.timeAsyncOperation(
      'processBatchedOperations',
      async () => {
        const previousFilters = { ...this.currentFilters };
        let newFilters = { ...this.currentFilters };

        // Apply all operations in order with performance tracking
        operations.forEach((operation) => {
          newFilters = this.performanceMonitor.timeOperation(
            'applyFilterOperation',
            () => applyFilterOperation(newFilters, operation, this.config),
            { operationType: operation.type, columnName: operation.columnName },
          );
        });

        // Validate and normalize the final result using memoized function
        const validationResult = this.performanceMonitor.timeOperation(
          'validateAndNormalizeFilters',
          () =>
            this.memoizedNormalizer(
              newFilters,
              this.config,
              this.allowedValues,
            ),
          {
            filterCount: Object.keys(newFilters).length,
            operationCount: operations.length,
          },
        );

        // Update current state
        this.currentFilters = validationResult.normalizedFilters;

        // Create change event
        const changeEvent: FilterStateChangeEvent = {
          operation: operations[operations.length - 1], // Last operation
          previousFilters,
          newFilters: this.currentFilters,
          validationResult,
        };

        // Notify listeners with error handling
        this.performanceMonitor.timeOperation(
          'notifyFilterChangeListeners',
          () => {
            this.changeListeners.forEach((listener) => {
              try {
                listener(changeEvent);
              } catch (error) {
                console.error('Error in filter change listener:', error);
              }
            });
          },
          { listenerCount: this.changeListeners.length },
        );
      },
      {
        operationCount: operations.length,
        filterCount: Object.keys(this.currentFilters).length,
      },
    );
  }
}

/**
 * Utility functions for filter state management
 */

/**
 * Checks if two filter objects are equal
 */
export const areFiltersEqual = (
  filters1: Record<string, string[]>,
  filters2: Record<string, string[]>,
): boolean => {
  const keys1 = Object.keys(filters1 || {});
  const keys2 = Object.keys(filters2 || {});

  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every((key) => {
    const values1 = filters1[key] || [];
    const values2 = filters2[key] || [];

    if (values1.length !== values2.length) {
      return false;
    }

    return values1.every((value, index) => value === values2[index]);
  });
};

/**
 * Gets the count of active filter values
 */
export const getActiveFilterCount = (
  filters: Record<string, string[]>,
): number => {
  return Object.values(filters || {}).reduce(
    (count, values) => count + (values?.length || 0),
    0,
  );
};

/**
 * Checks if a specific filter value is active
 */
export const isFilterValueActive = (
  filters: Record<string, string[]>,
  columnName: string,
  value?: string,
): boolean => {
  const columnFilters = filters[columnName] || [];
  return value ? columnFilters.includes(value) : columnFilters.length > 0;
};

/**
 * Gets all unique values across all filters
 */
export const getAllFilterValues = (
  filters: Record<string, string[]>,
): string[] => {
  const allValues = Object.values(filters || {}).flat();
  return Array.from(new Set(allValues));
};

/**
 * Creates a filter summary for debugging/logging
 */
export const createFilterSummary = (
  filters: Record<string, string[]>,
): string => {
  const entries = Object.entries(filters || {});
  if (entries.length === 0) {
    return 'No active filters';
  }

  const summaries = entries.map(([column, values]) => {
    return `${column}: [${values.join(', ')}]`;
  });

  return `Active filters (${entries.length}): ${summaries.join('; ')}`;
};
