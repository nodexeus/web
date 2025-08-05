import { SortOrder } from '../../../generated/blockjoy/common/v1/search';

// Type imports
type AdminListState = import('../types/AdminListState').AdminListState;
type AdminListStateConfig =
  import('../types/AdminListState').AdminListStateConfig;
type AdminListColumn = import('../types/AdminListColumn').AdminListColumn;

// Re-export enhanced utilities from stateSynchronization
export {
  serializeStateToUrlParams,
  deserializeUrlParamsToState,
  serializeStateToSettings,
  deserializeSettingsToState,
  normalizeFilters,
  validatePageNumber,
  mergeAdminListStates,
  areAdminListStatesEqual,
  validateAdminListState,
  cloneAdminListState,
  StateSyncDebouncer,
} from './stateSynchronization';

// Re-export enhanced filter management utilities
export {
  normalizeAndValidateFilters,
  mergeFilters,
  applyFilterOperation,
  FilterStateManager,
  FilterChangeType,
  areFiltersEqual,
  getActiveFilterCount,
  isFilterValueActive,
  getAllFilterValues,
  createFilterSummary,
  DEFAULT_FILTER_CONFIG,
  type FilterStateConfig,
  type FilterChangeOperation,
  type FilterStateChangeEvent,
  type FilterValidationResult,
} from './filterStateManager';

// Re-export enhanced pagination management utilities
export {
  PageSizeManager,
  PageBoundaryValidator,
  PaginationStateSynchronizer,
  DEFAULT_PAGINATION_CONFIG,
  validatePageNumberEnhanced,
  calculatePaginationInfo,
  getValidPageSizeOptions,
  validateAndCorrectPageSize,
  type PaginationConfig,
  type PaginationState,
  type PageSizeValidationResult,
  type PageBoundaryValidationResult,
  type PaginationChangeEvent,
} from './paginationManager';

/**
 * Utility functions for admin list state management
 * This file maintains backward compatibility while using enhanced utilities
 */

/**
 * Creates initial admin list state from configuration
 */
export const createInitialAdminListState = (
  config: AdminListStateConfig,
): AdminListState => ({
  search: '',
  page: 1,
  pageSize: config.defaultPageSize,
  sortField: config.defaultSortField,
  sortOrder: config.defaultSortOrder,
  filters: config.initialFilters || {},
  isLoading: false,
  error: null,
});
