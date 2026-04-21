import { SortOrder } from '../../../generated/blockjoy/common/v1/search';

/**
 * Centralized state interface for admin list management
 * Combines filtering, pagination, sorting, and loading states
 */
type AdminListState = {
  /** Current search query string */
  search: string;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Field number for sorting */
  sortField: number;
  /** Sort order (ascending/descending) */
  sortOrder: SortOrder;
  /** Active filters by column name */
  filters: Record<string, string[]>;
  /** Loading state for data operations */
  isLoading: boolean;
  /** Error state for failed operations */
  error: string | null;
};

/**
 * Configuration for initializing admin list state
 */
type AdminListStateConfig = {
  /** Default page size */
  defaultPageSize: number;
  /** Default sort field */
  defaultSortField: number;
  /** Default sort order */
  defaultSortOrder: SortOrder;
  /** Initial filters */
  initialFilters?: Record<string, string[]>;
};

/**
 * Actions for updating admin list state
 */
type AdminListStateActions = {
  /** Update search query */
  setSearch: (search: string) => void;
  /** Update current page */
  setPage: (page: number) => void;
  /** Update page size */
  setPageSize: (pageSize: number) => void;
  /** Update sort configuration */
  setSort: (field: number, order: SortOrder) => void;
  /** Update filters for a specific column */
  setFilters: (columnName: string, values: string[]) => void;
  /** Update multiple filters at once */
  setBulkFilters: (filters: Record<string, string[]>) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Clear filter for specific column */
  clearColumnFilter: (columnName: string) => void;
  /** Add values to an existing filter */
  addToFilter: (columnName: string, values: string[]) => void;
  /** Remove values from an existing filter */
  removeFromFilter: (columnName: string, values: string[]) => void;
  /** Set loading state */
  setLoading: (isLoading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Reset state to initial values */
  reset: () => void;
};

/**
 * URL parameter representation of admin list state
 */
type AdminListUrlParams = {
  name: string;
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: number;
  sortOrder?: SortOrder;
  /** Serialized filters as query parameters */
  [key: string]: string | number | SortOrder | undefined;
};

/**
 * Settings persistence structure for admin list state
 */
type AdminListSettingsData = {
  pageSize: number;
  sortField: number;
  sortOrder: SortOrder;
  columns: AdminListColumn[];
  defaultFilters?: Record<string, string[]>;
};

/**
 * State synchronization options
 */
type AdminListSyncOptions = {
  /** Whether to sync state to URL parameters */
  syncToUrl: boolean;
  /** Whether to sync state to persistent settings */
  syncToSettings: boolean;
  /** Debounce delay for URL updates (ms) */
  urlDebounceMs: number;
  /** Debounce delay for settings updates (ms) */
  settingsDebounceMs: number;
};
