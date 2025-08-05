import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';

// Type imports
type AdminListState = import('../types/AdminListState').AdminListState;
type AdminListUrlParams = import('../types/AdminListState').AdminListUrlParams;

/**
 * Enhanced URL query string management hook for admin lists
 * Provides comprehensive URL synchronization with validation and browser navigation support
 */
export const useUpdateQueryString = (name: string) => {
  const router = useRouter();
  const previousQueryRef = useRef<Record<string, any>>({});
  const isNavigatingRef = useRef(false);

  /**
   * Validates URL parameters to prevent malformed or malicious values
   */
  const validateUrlParams = useCallback(
    (params: Record<string, any>): AdminListUrlParams => {
      const validated: AdminListUrlParams = { name };

      try {
        // Validate page number
        if (params.page !== undefined) {
          const page = parseInt(String(params.page), 10);
          if (!isNaN(page) && page > 0 && page <= 10000) {
            validated.page = page;
          }
        }

        // Validate page size
        if (params.pageSize !== undefined) {
          const pageSize = parseInt(String(params.pageSize), 10);
          if (!isNaN(pageSize) && pageSize > 0 && pageSize <= 1000) {
            validated.pageSize = pageSize;
          }
        }

        // Validate search query
        if (params.search !== undefined) {
          const search = String(params.search).trim();
          if (search.length > 0 && search.length <= 500) {
            // Basic XSS prevention - remove potentially dangerous characters
            const sanitizedSearch = search.replace(/[<>'"&]/g, '');
            if (sanitizedSearch.length > 0) {
              validated.search = sanitizedSearch;
            }
          }
        }

        // Validate sort field
        if (params.sortField !== undefined) {
          const sortField = parseInt(String(params.sortField), 10);
          if (!isNaN(sortField) && sortField >= 0 && sortField <= 1000) {
            validated.sortField = sortField;
          }
        }

        // Validate sort order
        if (params.sortOrder !== undefined) {
          const sortOrder = parseInt(String(params.sortOrder), 10);
          if (Object.values(SortOrder).includes(sortOrder)) {
            validated.sortOrder = sortOrder as SortOrder;
          }
        }

        // Validate filter parameters
        Object.entries(params).forEach(([key, value]) => {
          if (key.startsWith('filter_')) {
            const columnName = key.replace('filter_', '');
            // Validate column name - alphanumeric and underscore only
            if (
              /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName) &&
              columnName.length <= 50
            ) {
              const filterValue = String(value);
              if (filterValue.length > 0 && filterValue.length <= 1000) {
                // Validate individual filter values
                const values = filterValue
                  .split(',')
                  .map((v) => v.trim())
                  .filter((v) => v.length > 0 && v.length <= 100)
                  .slice(0, 50); // Limit number of values

                if (values.length > 0) {
                  // Additional validation - ensure no dangerous characters
                  const sanitizedValues = values
                    .map((v) => v.replace(/[<>'"&]/g, ''))
                    .filter((v) => v.length > 0);

                  if (sanitizedValues.length > 0) {
                    validated[key] = sanitizedValues.join(',');
                  }
                }
              }
            }
          }
        });
      } catch (error) {
        console.warn('Error validating URL parameters:', error);
        // Return minimal valid params on error
        return { name };
      }

      return validated;
    },
    [name],
  );

  /**
   * Parses URL parameters from router query with validation
   */
  const parseUrlParams = useCallback((): AdminListUrlParams => {
    return validateUrlParams(router.query);
  }, [router.query, validateUrlParams]);

  /**
   * Serializes admin list state to URL parameters
   */
  const serializeStateToUrl = useCallback(
    (state: Partial<AdminListState>): AdminListUrlParams => {
      const params: AdminListUrlParams = { name };

      // Only include non-default values to keep URLs clean
      if (state.page && state.page > 1) {
        params.page = state.page;
      }

      if (state.pageSize && state.pageSize !== 24) {
        // 24 is default
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

      // Serialize filters
      if (state.filters) {
        Object.entries(state.filters).forEach(([columnName, values]) => {
          if (values && values.length > 0) {
            const nonEmptyValues = values.filter((v) => v && v.trim());
            if (nonEmptyValues.length > 0) {
              const sanitizedColumnName = columnName.replace(
                /[^a-zA-Z0-9_]/g,
                '',
              );
              if (sanitizedColumnName) {
                params[`filter_${sanitizedColumnName}`] =
                  nonEmptyValues.join(',');
              }
            }
          }
        });
      }

      return params;
    },
    [name],
  );

  /**
   * Updates URL query string with comprehensive state parameters
   */
  const updateQueryString = useCallback(
    (
      page?: number,
      search?: string,
      pageSize?: number,
      sortField?: number,
      sortOrder?: SortOrder,
      filters?: Record<string, string[]>,
    ) => {
      const state: Partial<AdminListState> = {};

      if (page !== undefined) state.page = page;
      if (search !== undefined) state.search = search;
      if (pageSize !== undefined) state.pageSize = pageSize;
      if (sortField !== undefined) state.sortField = sortField;
      if (sortOrder !== undefined) state.sortOrder = sortOrder;
      if (filters !== undefined) state.filters = filters;

      updateQueryStringFromState(state);
    },
    [],
  );

  /**
   * Updates URL query string from complete admin list state
   */
  const updateQueryStringFromState = useCallback(
    (state: Partial<AdminListState>) => {
      const urlParams = serializeStateToUrl(state);

      // Validate the parameters before updating URL
      const validatedParams = validateUrlParams(urlParams);

      // Check if URL would actually change to avoid unnecessary navigation
      const currentQuery = router.query;
      const queryChanged =
        Object.keys(validatedParams).some(
          (key) => currentQuery[key] !== validatedParams[key],
        ) ||
        Object.keys(currentQuery).some(
          (key) => key !== 'name' && !validatedParams.hasOwnProperty(key),
        );

      if (queryChanged && !isNavigatingRef.current) {
        isNavigatingRef.current = true;

        router
          .push(
            {
              pathname: router.pathname,
              query: validatedParams,
            },
            undefined,
            { shallow: true },
          )
          .finally(() => {
            isNavigatingRef.current = false;
          });
      }
    },
    [router, serializeStateToUrl, validateUrlParams],
  );

  /**
   * Handles browser navigation events (back/forward buttons)
   */
  const handleBrowserNavigation = useCallback(
    (url: string) => {
      // Extract query parameters from URL
      const urlObj = new URL(url, window.location.origin);
      const queryParams: Record<string, string> = {};

      urlObj.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      // Validate and return parsed parameters
      return validateUrlParams(queryParams);
    },
    [validateUrlParams],
  );

  /**
   * Restores state from URL parameters with error handling
   */
  const restoreStateFromUrl =
    useCallback((): Partial<AdminListState> | null => {
      try {
        const urlParams = parseUrlParams();
        const state: Partial<AdminListState> = {};

        if (urlParams.page) state.page = urlParams.page;
        if (urlParams.pageSize) state.pageSize = urlParams.pageSize;
        if (urlParams.search) state.search = urlParams.search;
        if (urlParams.sortField) state.sortField = urlParams.sortField;
        if (urlParams.sortOrder) state.sortOrder = urlParams.sortOrder;

        // Parse filters from URL parameters
        const filters: Record<string, string[]> = {};
        Object.entries(urlParams).forEach(([key, value]) => {
          if (key.startsWith('filter_') && typeof value === 'string') {
            const columnName = key.replace('filter_', '');
            const values = value
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v.length > 0);
            if (values.length > 0) {
              filters[columnName] = values;
            }
          }
        });

        if (Object.keys(filters).length > 0) {
          state.filters = filters;
        }

        return state;
      } catch (error) {
        console.error('Error restoring state from URL:', error);
        return null;
      }
    }, [parseUrlParams]);

  /**
   * Clears all URL parameters except the name parameter
   */
  const clearUrlParams = useCallback(() => {
    updateQueryStringFromState({
      page: 1,
      search: '',
      filters: {},
    });
  }, [updateQueryStringFromState]);

  /**
   * Gets current URL parameters as a validated object
   */
  const getCurrentUrlParams = useCallback((): AdminListUrlParams => {
    return parseUrlParams();
  }, [parseUrlParams]);

  // Monitor router changes for browser navigation support
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (!isNavigatingRef.current) {
        // This is a browser navigation event (back/forward)
        const params = handleBrowserNavigation(url);
        previousQueryRef.current = params;
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, handleBrowserNavigation]);

  // Track query changes for optimization
  useEffect(() => {
    previousQueryRef.current = router.query;
  }, [router.query]);

  return {
    // Legacy method for backward compatibility
    updateQueryString,

    // Enhanced methods
    updateQueryStringFromState,
    parseUrlParams,
    restoreStateFromUrl,
    clearUrlParams,
    getCurrentUrlParams,
    validateUrlParams,
    handleBrowserNavigation,

    // State
    currentParams: getCurrentUrlParams(),
    isNavigating: isNavigatingRef.current,
  };
};
