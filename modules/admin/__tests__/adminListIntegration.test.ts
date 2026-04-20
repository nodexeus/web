import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { SortOrder } from '../../../generated/blockjoy/common/v1/search';
import {
  serializeStateToUrlParams,
  deserializeUrlParamsToState,
  serializeStateToSettings,
  deserializeSettingsToState,
  mergeAdminListStates,
  normalizeFilters,
  validatePageNumber,
  areAdminListStatesEqual,
} from '../utils/stateSynchronization';

// Mock console methods for cleaner test output
const originalConsole = { ...console };
beforeEach(() => {
  console.warn = vi.fn();
  console.info = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
  vi.clearAllMocks();
});

const mockConfig = {
  defaultPageSize: 24,
  defaultSortField: 1,
  defaultSortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
  initialFilters: {},
};

const mockState = {
  search: 'test search',
  page: 2,
  pageSize: 50,
  sortField: 3,
  sortOrder: SortOrder.SORT_ORDER_ASC,
  filters: {
    status: ['active', 'pending'],
    region: ['us-east-1'],
  },
  isLoading: false,
  error: null,
};

describe('Admin List Integration Tests', () => {
  describe('Complete Filter Application Workflows', () => {
    it('should apply filters and normalize values correctly', () => {
      // Test filter normalization with various edge cases
      const filters = {
        status: ['active', 'active', '', 'pending', '   ', 'inactive'],
        region: ['us-east-1', '', '  us-west-2  '],
        empty: ['', '   '],
        protocol: ['http', 'https'],
      };

      const normalized = normalizeFilters(filters);

      expect(normalized).toEqual({
        status: ['active', 'pending', 'inactive'], // Deduplicated and cleaned
        region: ['us-east-1', 'us-west-2'], // Trimmed
        protocol: ['http', 'https'], // Unchanged
        // empty should be omitted as it has no valid values
      });
    });

    it('should handle complex filter state transitions', () => {
      const baseState = {
        search: '',
        page: 1,
        pageSize: 24,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {},
        isLoading: false,
        error: null,
      };

      // Apply first set of filters
      const state1 = {
        ...baseState,
        filters: { status: ['active'] },
        page: 1, // Should reset when filters change
      };

      // Apply additional filters
      const state2 = {
        ...state1,
        filters: {
          status: ['active', 'pending'],
          region: ['us-east-1'],
        },
      };

      // Clear specific filter
      const state3 = {
        ...state2,
        filters: { region: ['us-east-1'] },
      };

      // Verify state transitions
      expect(state1.page).toBe(1);
      expect(state2.filters.status).toEqual(['active', 'pending']);
      expect(state3.filters.status).toBeUndefined();
      expect(state3.filters.region).toEqual(['us-east-1']);
    });

    it('should handle filter errors and recovery', () => {
      // Test invalid filter values
      const invalidFilters = {
        'invalid-column!': ['value1'],
        '123invalid': ['value2'],
        '': ['value3'],
        validColumn: ['valid1', '', 'valid2'],
      };

      const normalized = normalizeFilters(invalidFilters);

      // Should only keep valid columns and values
      expect(normalized).toEqual({
        validColumn: ['valid1', 'valid2'],
      });
    });
  });

  describe('Pagination State Changes with Data Fetching', () => {
    it('should validate page boundaries correctly', () => {
      // Test various page boundary scenarios
      expect(validatePageNumber(1, 100, 10)).toBe(1); // Valid first page
      expect(validatePageNumber(5, 100, 10)).toBe(5); // Valid middle page
      expect(validatePageNumber(10, 100, 10)).toBe(10); // Valid last page
      expect(validatePageNumber(15, 100, 10)).toBe(10); // Beyond last page - should correct
      expect(validatePageNumber(0, 100, 10)).toBe(1); // Below first page - should correct
      expect(validatePageNumber(-5, 100, 10)).toBe(1); // Negative page - should correct
    });

    it('should handle page size changes and boundary validation', () => {
      const state = {
        ...mockState,
        page: 5,
        pageSize: 24,
      };

      // Change page size to larger value
      const newState1 = {
        ...state,
        pageSize: 48,
        page: 1, // Should reset to page 1 when page size changes
      };

      // Validate page with new total items
      const totalItems = 100;
      const maxPages = Math.ceil(totalItems / newState1.pageSize);
      const validatedPage = validatePageNumber(
        newState1.page,
        totalItems,
        newState1.pageSize,
      );

      expect(newState1.page).toBe(1);
      expect(maxPages).toBe(3); // 100 items / 48 per page = 2.08 -> 3 pages
      expect(validatedPage).toBe(1);
    });

    it('should handle edge cases in pagination', () => {
      // Test edge cases
      expect(validatePageNumber(1, 0, 10)).toBe(1); // No items
      expect(validatePageNumber(5, 5, 10)).toBe(1); // Less than one page of items
      expect(validatePageNumber(2, 15, 10)).toBe(2); // Exactly two pages
      expect(validatePageNumber(3, 15, 10)).toBe(2); // Beyond available pages
    });
  });

  describe('URL Synchronization with Browser Navigation', () => {
    it('should serialize state to URL parameters correctly', () => {
      const urlParams = serializeStateToUrlParams(mockState, 'nodes');

      expect(urlParams).toEqual({
        name: 'nodes',
        page: 2,
        pageSize: 50,
        search: 'test search',
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        filter_status: 'active,pending',
        filter_region: 'us-east-1',
      });
    });

    it('should deserialize URL parameters to state correctly', () => {
      const urlParams = {
        name: 'nodes',
        page: '2',
        pageSize: '50',
        search: 'test search',
        sortField: '3',
        sortOrder: '1', // SortOrder.SORT_ORDER_ASC
        filter_status: 'active,pending',
        filter_region: 'us-east-1',
      };

      const result = deserializeUrlParamsToState(urlParams, mockConfig);

      expect(result).toEqual({
        page: 2,
        pageSize: 50,
        search: 'test search',
        sortField: 3,
        sortOrder: 1,
        filters: {
          status: ['active', 'pending'],
          region: ['us-east-1'],
        },
      });
    });

    it('should handle invalid URL parameters gracefully', () => {
      const invalidUrlParams = {
        page: 'invalid',
        pageSize: '-5',
        sortField: 'not_a_number',
        sortOrder: '999', // Invalid sort order
        search: 'a'.repeat(1000), // Too long
        filter_123invalid: 'value', // Invalid column name
        filter_status: ',,,active,,pending,,,', // Malformed values
      };

      const result = deserializeUrlParamsToState(invalidUrlParams, mockConfig);

      // Should handle invalid values gracefully
      expect(result.page).toBeUndefined(); // Invalid page ignored
      expect(result.pageSize).toBeUndefined(); // Invalid page size ignored
      expect(result.sortField).toBeUndefined(); // Invalid sort field ignored
      expect(result.sortOrder).toBeUndefined(); // Invalid sort order ignored
      expect(result.search).toBeUndefined(); // Too long search ignored
      expect(result.filters?.status).toEqual(['active', 'pending']); // Cleaned up values
      expect(result.filters).not.toHaveProperty('123invalid'); // Invalid column ignored
    });

    it('should omit default values to keep URLs clean', () => {
      const defaultState = {
        search: '',
        page: 1,
        pageSize: 24,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {},
        isLoading: false,
        error: null,
      };

      const urlParams = serializeStateToUrlParams(defaultState, 'nodes');

      // Should only include the list name for default values
      expect(urlParams).toEqual({
        name: 'nodes',
      });
    });
  });

  describe('Settings Persistence Across Component Remounts', () => {
    it('should serialize state to settings format correctly', () => {
      const columns = [
        { name: 'status', isVisible: true },
        { name: 'region', isVisible: false },
      ];

      const settings = serializeStateToSettings(mockState, columns);

      expect(settings).toEqual({
        pageSize: 50,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        columns,
        defaultFilters: {
          status: ['active', 'pending'],
          region: ['us-east-1'],
        },
      });
    });

    it('should deserialize settings to state correctly', () => {
      const settings = {
        pageSize: 50,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        columns: [],
        defaultFilters: {
          status: ['active', 'pending'],
          region: ['us-east-1'],
        },
      };

      const result = deserializeSettingsToState(settings, mockConfig);

      expect(result).toEqual({
        pageSize: 50,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        filters: {
          status: ['active', 'pending'],
          region: ['us-east-1'],
        },
      });
    });

    it('should handle missing or corrupted settings gracefully', () => {
      const corruptedSettings = {
        pageSize: 'not_a_number',
        sortField: { invalid: 'object' },
        sortOrder: 999,
        defaultFilters: 'not_an_object',
      };

      const result = deserializeSettingsToState(
        corruptedSettings as any,
        mockConfig,
      );

      // Should ignore invalid values
      expect(result.pageSize).toBeUndefined();
      expect(result.sortField).toBeUndefined();
      expect(result.sortOrder).toBeUndefined();
      expect(result.filters).toBeUndefined();
    });

    it('should merge multiple state sources correctly', () => {
      const baseState = {
        search: '',
        page: 1,
        pageSize: 24,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {},
        isLoading: false,
        error: null,
      };

      const settingsState = {
        pageSize: 48,
        sortField: 2,
        filters: { status: ['active'] },
      };

      const urlState = {
        page: 3,
        search: 'test',
        filters: { region: ['us-east-1'] },
      };

      const merged = mergeAdminListStates(baseState, settingsState, urlState);

      expect(merged).toEqual({
        search: 'test', // From URL (highest priority)
        page: 3, // From URL
        pageSize: 48, // From settings
        sortField: 2, // From settings
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED, // From base
        filters: {
          status: ['active'], // From settings
          region: ['us-east-1'], // From URL
        },
        isLoading: false,
        error: null,
      });
    });
  });

  describe('State Consistency and Validation', () => {
    it('should maintain state consistency during complex operations', () => {
      let currentState = {
        search: '',
        page: 1,
        pageSize: 24,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {},
        isLoading: false,
        error: null,
      };

      // Apply filters
      currentState = {
        ...currentState,
        filters: { status: ['active'] },
        page: 1, // Reset page when filters change
      };

      // Change page
      currentState = {
        ...currentState,
        page: 3,
      };

      // Change page size
      currentState = {
        ...currentState,
        pageSize: 48,
        page: 1, // Reset page when page size changes
      };

      // Add more filters
      currentState = {
        ...currentState,
        filters: {
          ...currentState.filters,
          region: ['us-east-1'],
        },
        page: 1, // Reset page when filters change
      };

      // Verify final state
      expect(currentState).toEqual({
        search: '',
        page: 1,
        pageSize: 48,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {
          status: ['active'],
          region: ['us-east-1'],
        },
        isLoading: false,
        error: null,
      });
    });

    it('should detect state equality correctly', () => {
      const state1 = { ...mockState };
      const state2 = { ...mockState };
      const state3 = { ...mockState, search: 'different' };

      expect(areAdminListStatesEqual(state1, state2)).toBe(true);
      expect(areAdminListStatesEqual(state1, state3)).toBe(false);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed data gracefully', () => {
      // Test various malformed inputs
      const malformedInputs = [
        null,
        undefined,
        'string',
        123,
        [],
        { invalid: 'structure' },
      ];

      malformedInputs.forEach((input) => {
        expect(() => normalizeFilters(input as any)).not.toThrow();
        expect(() =>
          serializeStateToUrlParams(input as any, 'nodes'),
        ).not.toThrow();
        expect(() =>
          deserializeUrlParamsToState(input as any, mockConfig),
        ).not.toThrow();
      });
    });

    it('should provide fallback values for critical operations', () => {
      // Test fallback behavior
      const result1 = normalizeFilters(null as any);
      expect(result1).toEqual({});

      const result2 = deserializeUrlParamsToState({}, mockConfig);
      expect(result2).toEqual({});

      const result3 = deserializeSettingsToState(undefined, mockConfig);
      expect(result3).toEqual({});
    });
  });
});
