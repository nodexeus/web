import { SortOrder } from '../../../generated/blockjoy/common/v1/search';

// Type imports
type AdminListState = import('../types/AdminListState').AdminListState;
type AdminListUrlParams = import('../types/AdminListState').AdminListUrlParams;

/**
 * Enhanced URL parameter utilities for admin lists
 * Provides robust URL parameter handling with validation and error recovery
 */

/**
 * URL parameter validation configuration
 */
export interface UrlValidationConfig {
  maxPageNumber: number;
  maxPageSize: number;
  maxSearchLength: number;
  maxFilterValueLength: number;
  maxFilterValuesPerColumn: number;
  maxActiveFilters: number;
  allowedSortOrders: SortOrder[];
}

/**
 * Default validation configuration
 */
export const DEFAULT_URL_VALIDATION_CONFIG: UrlValidationConfig = {
  maxPageNumber: 10000,
  maxPageSize: 1000,
  maxSearchLength: 500,
  maxFilterValueLength: 100,
  maxFilterValuesPerColumn: 50,
  maxActiveFilters: 20,
  allowedSortOrders: Object.values(SortOrder).filter(
    (v) => typeof v === 'number',
  ) as SortOrder[],
};

/**
 * URL parameter parsing result with validation status
 */
export interface UrlParsingResult {
  params: AdminListUrlParams;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Sanitizes a string value to prevent XSS and other security issues
 */
export const sanitizeStringValue = (
  value: string,
  maxLength: number = 500,
): string => {
  if (typeof value !== 'string') return '';

  // Remove potentially dangerous characters
  const sanitized = value
    .replace(/[<>'"&]/g, '') // Basic XSS prevention
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();

  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
};

/**
 * Validates and sanitizes a column name for filter parameters
 */
export const validateColumnName = (columnName: string): string | null => {
  if (typeof columnName !== 'string') return null;

  // Must start with letter or underscore, then alphanumeric/underscore
  const sanitized = columnName.replace(/[^a-zA-Z0-9_]/g, '');

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sanitized) || sanitized.length > 50) {
    return null;
  }

  return sanitized;
};

/**
 * Parses and validates filter values from a comma-separated string
 */
export const parseFilterValues = (
  filterString: string,
  config: UrlValidationConfig = DEFAULT_URL_VALIDATION_CONFIG,
): { values: string[]; errors: string[] } => {
  const errors: string[] = [];

  if (typeof filterString !== 'string') {
    errors.push('Filter value must be a string');
    return { values: [], errors };
  }

  if (filterString.length > 1000) {
    errors.push('Filter string too long');
    return { values: [], errors };
  }

  const rawValues = filterString.split(',');

  if (rawValues.length > config.maxFilterValuesPerColumn) {
    errors.push(
      `Too many filter values (max: ${config.maxFilterValuesPerColumn})`,
    );
  }

  const validValues = rawValues
    .map((v) => sanitizeStringValue(v.trim(), config.maxFilterValueLength))
    .filter((v) => v.length > 0)
    .slice(0, config.maxFilterValuesPerColumn);

  // Remove duplicates while preserving order
  const uniqueValues = Array.from(new Set(validValues));

  return { values: uniqueValues, errors };
};

/**
 * Comprehensive URL parameter parsing with validation and error handling
 */
export const parseUrlParameters = (
  query: Record<string, string | string[] | undefined>,
  listName: string,
  config: UrlValidationConfig = DEFAULT_URL_VALIDATION_CONFIG,
): UrlParsingResult => {
  const params: AdminListUrlParams = { name: listName };
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Helper function to get string value from query parameter
    const getStringValue = (key: string): string | undefined => {
      const value = query[key];
      if (Array.isArray(value)) {
        return value[0];
      }
      return value;
    };

    // Validate and parse page number
    const pageStr = getStringValue('page');
    if (pageStr !== undefined) {
      const page = parseInt(pageStr, 10);
      if (isNaN(page)) {
        errors.push('Invalid page number format');
      } else if (page < 1) {
        warnings.push('Page number less than 1, defaulting to 1');
        params.page = 1;
      } else if (page > config.maxPageNumber) {
        warnings.push(`Page number too large (max: ${config.maxPageNumber})`);
        params.page = config.maxPageNumber;
      } else {
        params.page = page;
      }
    }

    // Validate and parse page size
    const pageSizeStr = getStringValue('pageSize');
    if (pageSizeStr !== undefined) {
      const pageSize = parseInt(pageSizeStr, 10);
      if (isNaN(pageSize)) {
        errors.push('Invalid page size format');
      } else if (pageSize < 1) {
        warnings.push('Page size less than 1, using default');
      } else if (pageSize > config.maxPageSize) {
        warnings.push(`Page size too large (max: ${config.maxPageSize})`);
        params.pageSize = config.maxPageSize;
      } else {
        params.pageSize = pageSize;
      }
    }

    // Validate and parse search query
    const searchStr = getStringValue('search');
    if (searchStr !== undefined) {
      const sanitizedSearch = sanitizeStringValue(
        searchStr,
        config.maxSearchLength,
      );
      if (sanitizedSearch.length > 0) {
        params.search = sanitizedSearch;
      } else if (searchStr.length > 0) {
        warnings.push(
          'Search query contained invalid characters and was sanitized',
        );
      }
    }

    // Validate and parse sort field
    const sortFieldStr = getStringValue('sortField');
    if (sortFieldStr !== undefined) {
      const sortField = parseInt(sortFieldStr, 10);
      if (isNaN(sortField)) {
        errors.push('Invalid sort field format');
      } else if (sortField < 0) {
        warnings.push('Sort field less than 0, using default');
      } else if (sortField > 1000) {
        warnings.push('Sort field too large, using default');
      } else {
        params.sortField = sortField;
      }
    }

    // Validate and parse sort order
    const sortOrderStr = getStringValue('sortOrder');
    if (sortOrderStr !== undefined) {
      const sortOrder = parseInt(sortOrderStr, 10);
      if (isNaN(sortOrder)) {
        errors.push('Invalid sort order format');
      } else if (!config.allowedSortOrders.includes(sortOrder as SortOrder)) {
        errors.push('Invalid sort order value');
      } else {
        params.sortOrder = sortOrder as SortOrder;
      }
    }

    // Parse and validate filter parameters
    let filterCount = 0;
    Object.entries(query).forEach(([key, value]) => {
      if (key.startsWith('filter_')) {
        if (filterCount >= config.maxActiveFilters) {
          warnings.push(
            `Too many active filters (max: ${config.maxActiveFilters})`,
          );
          return;
        }

        const columnName = key.replace('filter_', '');
        const validatedColumnName = validateColumnName(columnName);

        if (!validatedColumnName) {
          errors.push(`Invalid filter column name: ${columnName}`);
          return;
        }

        const filterValue = Array.isArray(value) ? value[0] : value;
        if (typeof filterValue === 'string') {
          const { values, errors: filterErrors } = parseFilterValues(
            filterValue,
            config,
          );

          if (filterErrors.length > 0) {
            errors.push(
              ...filterErrors.map((err) => `Filter ${columnName}: ${err}`),
            );
          }

          if (values.length > 0) {
            params[`filter_${validatedColumnName}`] = values.join(',');
            filterCount++;
          }
        }
      }
    });
  } catch (error) {
    errors.push(`Unexpected error parsing URL parameters: ${error}`);
  }

  const isValid = errors.length === 0;

  return {
    params,
    isValid,
    errors,
    warnings,
  };
};

/**
 * Serializes admin list state to URL parameters with optimization
 */
export const serializeStateToUrlParameters = (
  state: Partial<AdminListState>,
  listName: string,
  includeDefaults: boolean = false,
): AdminListUrlParams => {
  const params: AdminListUrlParams = { name: listName };

  // Only include non-default values unless explicitly requested
  if (state.page && (includeDefaults || state.page > 1)) {
    params.page = state.page;
  }

  if (state.pageSize && (includeDefaults || state.pageSize !== 24)) {
    params.pageSize = state.pageSize;
  }

  if (state.search && state.search.trim()) {
    params.search = state.search.trim();
  }

  if (
    state.sortField !== undefined &&
    (includeDefaults || state.sortField > 0)
  ) {
    params.sortField = state.sortField;
  }

  if (
    state.sortOrder !== undefined &&
    (includeDefaults || state.sortOrder !== SortOrder.SORT_ORDER_UNSPECIFIED)
  ) {
    params.sortOrder = state.sortOrder;
  }

  // Serialize filters
  if (state.filters) {
    Object.entries(state.filters).forEach(([columnName, values]) => {
      if (values && values.length > 0) {
        const validatedColumnName = validateColumnName(columnName);
        if (validatedColumnName) {
          const sanitizedValues = values
            .map((v) =>
              sanitizeStringValue(
                v,
                DEFAULT_URL_VALIDATION_CONFIG.maxFilterValueLength,
              ),
            )
            .filter((v) => v.length > 0);

          if (sanitizedValues.length > 0) {
            params[`filter_${validatedColumnName}`] = sanitizedValues.join(',');
          }
        }
      }
    });
  }

  return params;
};

/**
 * Converts URL parameters back to admin list state
 */
export const deserializeUrlParametersToState = (
  urlParams: AdminListUrlParams,
  config: UrlValidationConfig = DEFAULT_URL_VALIDATION_CONFIG,
): { state: Partial<AdminListState>; errors: string[]; warnings: string[] } => {
  const state: Partial<AdminListState> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Convert basic parameters
    if (urlParams.page !== undefined) {
      state.page = urlParams.page;
    }

    if (urlParams.pageSize !== undefined) {
      state.pageSize = urlParams.pageSize;
    }

    if (urlParams.search !== undefined) {
      state.search = urlParams.search;
    }

    if (urlParams.sortField !== undefined) {
      state.sortField = urlParams.sortField;
    }

    if (urlParams.sortOrder !== undefined) {
      state.sortOrder = urlParams.sortOrder;
    }

    // Convert filter parameters
    const filters: Record<string, string[]> = {};
    Object.entries(urlParams).forEach(([key, value]) => {
      if (key.startsWith('filter_') && typeof value === 'string') {
        const columnName = key.replace('filter_', '');
        const { values, errors: filterErrors } = parseFilterValues(
          value,
          config,
        );

        if (filterErrors.length > 0) {
          errors.push(
            ...filterErrors.map((err) => `Filter ${columnName}: ${err}`),
          );
        }

        if (values.length > 0) {
          filters[columnName] = values;
        }
      }
    });

    if (Object.keys(filters).length > 0) {
      state.filters = filters;
    }
  } catch (error) {
    errors.push(`Error deserializing URL parameters: ${error}`);
  }

  return { state, errors, warnings };
};

/**
 * Compares two URL parameter objects for equality
 */
export const areUrlParametersEqual = (
  params1: AdminListUrlParams,
  params2: AdminListUrlParams,
): boolean => {
  const keys1 = Object.keys(params1).sort();
  const keys2 = Object.keys(params2).sort();

  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every((key) => {
    const value1 = params1[key];
    const value2 = params2[key];

    // Handle undefined values
    if (value1 === undefined && value2 === undefined) {
      return true;
    }

    if (value1 === undefined || value2 === undefined) {
      return false;
    }

    return String(value1) === String(value2);
  });
};

/**
 * Creates a clean URL string from parameters
 */
export const createUrlFromParameters = (
  params: AdminListUrlParams,
  basePath: string = '/admin',
): string => {
  const url = new URL(basePath, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.pathname + url.search;
};

/**
 * Extracts URL parameters from a URL string
 */
export const extractParametersFromUrl = (
  url: string,
  listName: string,
  config: UrlValidationConfig = DEFAULT_URL_VALIDATION_CONFIG,
): UrlParsingResult => {
  try {
    const urlObj = new URL(url, window.location.origin);
    const queryParams: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    return parseUrlParameters(queryParams, listName, config);
  } catch (error) {
    return {
      params: { name: listName },
      isValid: false,
      errors: [`Invalid URL format: ${error}`],
      warnings: [],
    };
  }
};

/**
 * Browser history management utilities
 */
export class UrlHistoryManager {
  private listName: string;
  private config: UrlValidationConfig;
  private onStateChange?: (state: Partial<AdminListState>) => void;

  constructor(
    listName: string,
    config: UrlValidationConfig = DEFAULT_URL_VALIDATION_CONFIG,
    onStateChange?: (state: Partial<AdminListState>) => void,
  ) {
    this.listName = listName;
    this.config = config;
    this.onStateChange = onStateChange;
  }

  /**
   * Pushes a new state to browser history
   */
  pushState(state: Partial<AdminListState>, title?: string): void {
    const params = serializeStateToUrlParameters(state, this.listName);
    const url = createUrlFromParameters(params);

    window.history.pushState(
      { listName: this.listName, state },
      title || document.title,
      url,
    );
  }

  /**
   * Replaces current state in browser history
   */
  replaceState(state: Partial<AdminListState>, title?: string): void {
    const params = serializeStateToUrlParameters(state, this.listName);
    const url = createUrlFromParameters(params);

    window.history.replaceState(
      { listName: this.listName, state },
      title || document.title,
      url,
    );
  }

  /**
   * Handles browser navigation events
   */
  handlePopState = (event: PopStateEvent): void => {
    if (event.state && event.state.listName === this.listName) {
      // Use state from history if available
      if (this.onStateChange) {
        this.onStateChange(event.state.state);
      }
    } else {
      // Parse state from current URL
      const result = extractParametersFromUrl(
        window.location.href,
        this.listName,
        this.config,
      );
      if (result.isValid && this.onStateChange) {
        const { state } = deserializeUrlParametersToState(
          result.params,
          this.config,
        );
        this.onStateChange(state);
      }
    }
  };

  /**
   * Starts listening to browser navigation events
   */
  startListening(): void {
    window.addEventListener('popstate', this.handlePopState);
  }

  /**
   * Stops listening to browser navigation events
   */
  stopListening(): void {
    window.removeEventListener('popstate', this.handlePopState);
  }

  /**
   * Gets current state from URL
   */
  getCurrentState(): {
    state: Partial<AdminListState>;
    errors: string[];
    warnings: string[];
  } {
    const result = extractParametersFromUrl(
      window.location.href,
      this.listName,
      this.config,
    );
    return deserializeUrlParametersToState(result.params, this.config);
  }
}
