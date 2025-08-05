import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SortOrder } from '../../../../generated/blockjoy/common/v1/search';
import {
  serializeStateToUrlParams,
  deserializeUrlParamsToState,
  serializeStateToSettings,
  deserializeSettingsToState,
  normalizeFilters,
  validateAdminListState,
  validatePageNumber,
  mergeAdminListStates,
  areAdminListStatesEqual,
  cloneAdminListState,
  StateSyncDebouncer,
} from '../stateSynchronization';

// Mock types
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
    type: ['node'],
  },
  isLoading: false,
  error: null,
};

describe('URL Parameter Serialization/Deserialization', () => {
  describe('serializeStateToUrlParams', () => {
    it('should serialize basic state to URL parameters', () => {
      const result = serializeStateToUrlParams(mockState, 'nodes');

      expect(result).toEqual({
        name: 'nodes',
        page: 2,
        pageSize: 50,
        search: 'test search',
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        filter_status: 'active,pending',
        filter_type: 'node',
      });
    });

    it('should omit default values to keep URLs clean', () => {
      const defaultState = {
        ...mockState,
        page: 1,
        pageSize: 24,
        search: '',
        sortField: 0,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {},
      };

      const result = serializeStateToUrlParams(defaultState, 'nodes');

      expect(result).toEqual({
        name: 'nodes',
      });
    });

    it('should sanitize column names in filters', () => {
      const stateWithUnsafeFilters = {
        ...mockState,
        filters: {
          valid_column: ['value1'],
          'invalid-column!@#': ['value2'],
          another_valid123: ['value3'],
        },
      };

      const result = serializeStateToUrlParams(stateWithUnsafeFilters, 'nodes');

      expect(result.filter_valid_column).toBe('value1');
      expect(result.filter_invalidcolumn).toBe('value2'); // Sanitized
      expect(result.filter_another_valid123).toBe('value3');
    });

    it('should handle empty filter values', () => {
      const stateWithEmptyFilters = {
        ...mockState,
        filters: {
          status: [],
          type: ['node'],
          empty: [''],
        },
      };

      const result = serializeStateToUrlParams(stateWithEmptyFilters, 'nodes');

      expect(result.filter_status).toBeUndefined();
      expect(result.filter_type).toBe('node');
      expect(result.filter_empty).toBeUndefined();
    });
  });

  describe('deserializeUrlParamsToState', () => {
    it('should deserialize URL parameters to state', () => {
      const urlParams = {
        name: 'nodes',
        page: '2',
        pageSize: '50',
        search: 'test search',
        sortField: '3',
        sortOrder: '1', // SortOrder.SORT_ORDER_ASC
        filter_status: 'active,pending',
        filter_type: 'node',
      };

      const result = deserializeUrlParamsToState(urlParams, mockConfig);

      expect(result).toEqual({
        page: 2,
        pageSize: 50,
        search: 'test search',
        sortField: 3,
        sortOrder: 1, // SortOrder.SORT_ORDER_ASC
        filters: {
          status: ['active', 'pending'],
          type: ['node'],
        },
      });
    });

    it('should handle array values from URL parameters', () => {
      const urlParams = {
        page: ['2', '3'], // Should take first value
        search: ['first search', 'second search'],
        filter_status: ['active,pending'],
      };

      const result = deserializeUrlParamsToState(urlParams, mockConfig);

      expect(result.page).toBe(2);
      expect(result.search).toBe('first search');
      expect(result.filters?.status).toEqual(['active', 'pending']);
    });

    it('should validate and reject invalid values', () => {
      const urlParams = {
        page: 'invalid',
        pageSize: '-5',
        sortField: 'not_a_number',
        sortOrder: '999', // Invalid sort order
        search: 'a'.repeat(1000), // Too long
        filter_123invalid: 'value', // Invalid: starts with number
      };

      const result = deserializeUrlParamsToState(urlParams, mockConfig);

      expect(result.page).toBeUndefined();
      expect(result.pageSize).toBeUndefined();
      expect(result.sortField).toBeUndefined();
      expect(result.sortOrder).toBeUndefined();
      expect(result.search).toBeUndefined();
      expect(result.filters).toBeUndefined();
    });

    it('should handle reasonable limits for values', () => {
      const urlParams = {
        page: '99999', // Too high
        pageSize: '2000', // Too high
        search: 'a'.repeat(100), // Within limit
        filter_status: 'a'.repeat(50) + ',' + 'b'.repeat(150), // Second value too long
      };

      const result = deserializeUrlParamsToState(urlParams, mockConfig);

      expect(result.page).toBeUndefined();
      expect(result.pageSize).toBeUndefined();
      expect(result.search).toBe('a'.repeat(100));
      expect(result.filters?.status).toEqual(['a'.repeat(50)]); // Only valid value
    });

    it('should handle malformed filter values gracefully', () => {
      const urlParams = {
        filter_status: ',,,active,,pending,,,',
        filter_empty: '',
        filter_whitespace: '   ,  ,   ',
      };

      const result = deserializeUrlParamsToState(urlParams, mockConfig);

      expect(result.filters?.status).toEqual(['active', 'pending']);
      expect(result.filters?.empty).toBeUndefined();
      expect(result.filters?.whitespace).toBeUndefined();
    });
  });
});

describe('Settings Synchronization', () => {
  describe('serializeStateToSettings', () => {
    it('should serialize state to settings format', () => {
      const columns = [{ name: 'test', isVisible: true }];
      const result = serializeStateToSettings(mockState, columns);

      expect(result).toEqual({
        pageSize: 50,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        columns,
        defaultFilters: {
          status: ['active', 'pending'],
          type: ['node'],
        },
      });
    });

    it('should validate page size limits', () => {
      const invalidState = { ...mockState, pageSize: 2000 };
      const result = serializeStateToSettings(invalidState, []);

      expect(result.pageSize).toBe(1000); // Clamped to max
    });

    it('should omit empty filters', () => {
      const stateWithoutFilters = { ...mockState, filters: {} };
      const result = serializeStateToSettings(stateWithoutFilters, []);

      expect(result.defaultFilters).toBeUndefined();
    });
  });

  describe('deserializeSettingsToState', () => {
    it('should deserialize settings to state', () => {
      const settings = {
        pageSize: 50,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        columns: [],
        defaultFilters: {
          status: ['active', 'pending'],
          type: ['node'],
        },
      };

      const result = deserializeSettingsToState(settings, mockConfig);

      expect(result).toEqual({
        pageSize: 50,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        filters: {
          status: ['active', 'pending'],
          type: ['node'],
        },
      });
    });

    it('should handle undefined settings', () => {
      const result = deserializeSettingsToState(undefined, mockConfig);
      expect(result).toEqual({});
    });

    it('should validate settings values', () => {
      const invalidSettings = {
        pageSize: -5,
        sortField: -1,
        sortOrder: 999,
        columns: [],
        defaultFilters: 'invalid',
      };

      const result = deserializeSettingsToState(
        invalidSettings as any,
        mockConfig,
      );

      expect(result.pageSize).toBeUndefined();
      expect(result.sortField).toBeUndefined();
      expect(result.sortOrder).toBeUndefined();
      expect(result.filters).toBeUndefined();
    });
  });
});

describe('State Validation and Normalization', () => {
  describe('normalizeFilters', () => {
    it('should normalize valid filters', () => {
      const filters = {
        status: ['active', 'pending', 'active'], // Duplicate
        type: ['node', '', 'host'], // Empty value
        empty: [],
        whitespace: ['  ', 'valid  ', '  '],
      };

      const result = normalizeFilters(filters);

      expect(result).toEqual({
        status: ['active', 'pending'], // Deduplicated
        type: ['node', 'host'], // Empty removed
        whitespace: ['valid'], // Trimmed
      });
    });

    it('should handle invalid input gracefully', () => {
      expect(normalizeFilters(null as any)).toEqual({});
      expect(normalizeFilters(undefined as any)).toEqual({});
      expect(normalizeFilters('invalid' as any)).toEqual({});
    });

    it('should validate column names', () => {
      const filters = {
        valid_column: ['value'],
        'invalid-column!': ['value'],
        '123invalid': ['value'],
        '': ['value'],
      };

      const result = normalizeFilters(filters);

      expect(result).toEqual({
        valid_column: ['value'],
      });
    });

    it('should limit filter values', () => {
      const manyValues = Array.from({ length: 100 }, (_, i) => `value${i}`);
      const filters = {
        status: manyValues,
        type: ['a'.repeat(200)], // Too long
      };

      const result = normalizeFilters(filters);

      expect(result.status).toHaveLength(50); // Limited to 50
      expect(result.type).toBeUndefined(); // Value too long
    });
  });

  describe('validateAdminListState', () => {
    it('should validate and return complete state', () => {
      const partialState = {
        search: 'test',
        page: 2,
        pageSize: 50,
        filters: { status: ['active'] },
      };

      const result = validateAdminListState(partialState, mockConfig);

      expect(result).toEqual({
        search: 'test',
        page: 2,
        pageSize: 50,
        sortField: mockConfig.defaultSortField,
        sortOrder: mockConfig.defaultSortOrder,
        filters: { status: ['active'] },
        isLoading: false,
        error: null,
      });
    });

    it('should use defaults for invalid values', () => {
      const invalidState = {
        search: 'a'.repeat(1000), // Too long
        page: -5,
        pageSize: 0,
        sortField: -1,
        filters: 'invalid',
        isLoading: 'not_boolean',
        error: 'a'.repeat(2000), // Too long
      };

      const result = validateAdminListState(invalidState as any, mockConfig);

      expect(result.search).toBe('');
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(mockConfig.defaultPageSize);
      expect(result.sortField).toBe(mockConfig.defaultSortField);
      expect(result.filters).toEqual({});
      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(null);
    });
  });

  describe('validatePageNumber', () => {
    it('should validate page numbers correctly', () => {
      expect(validatePageNumber(1, 100, 10)).toBe(1);
      expect(validatePageNumber(5, 100, 10)).toBe(5);
      expect(validatePageNumber(10, 100, 10)).toBe(10);
      expect(validatePageNumber(15, 100, 10)).toBe(10); // Clamped to max
      expect(validatePageNumber(0, 100, 10)).toBe(1); // Minimum is 1
      expect(validatePageNumber(-5, 100, 10)).toBe(1); // Minimum is 1
    });

    it('should handle edge cases', () => {
      expect(validatePageNumber(1, 0, 10)).toBe(1); // No items
      expect(validatePageNumber(5, 5, 10)).toBe(1); // Less than one page
      expect(validatePageNumber(2, 15, 10)).toBe(2); // Valid second page
    });

    it('should handle invalid inputs', () => {
      expect(validatePageNumber('invalid' as any, 100, 10)).toBe(1);
      expect(validatePageNumber(5, 'invalid' as any, 10)).toBe(5);
      expect(validatePageNumber(5, 100, 'invalid' as any)).toBe(5);
    });
  });
});

describe('State Utilities', () => {
  describe('mergeAdminListStates', () => {
    it('should merge states with priority order', () => {
      const baseState = {
        search: 'base',
        page: 1,
        pageSize: 24,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: { base: ['value'] },
        isLoading: false,
        error: null,
      };

      const partial1 = {
        search: 'partial1',
        page: 2,
        filters: { partial1: ['value'] },
      };

      const partial2 = {
        search: 'partial2',
        pageSize: 50,
        filters: { partial2: ['value'] },
      };

      const result = mergeAdminListStates(baseState, partial1, partial2);

      expect(result.search).toBe('partial2'); // Last wins
      expect(result.page).toBe(2); // From partial1
      expect(result.pageSize).toBe(50); // From partial2
      expect(result.sortField).toBe(1); // From base
      expect(result.filters).toEqual({
        base: ['value'],
        partial1: ['value'],
        partial2: ['value'],
      });
    });

    it('should handle null and undefined values', () => {
      const baseState = mockState;
      const partialWithNulls = {
        search: null,
        page: undefined,
        error: null,
      };

      const result = mergeAdminListStates(baseState, partialWithNulls as any);

      expect(result.search).toBe(mockState.search); // Unchanged
      expect(result.page).toBe(mockState.page); // Unchanged
      expect(result.error).toBe(null); // Updated
    });
  });

  describe('areAdminListStatesEqual', () => {
    it('should return true for equal states', () => {
      const state1 = { ...mockState };
      const state2 = { ...mockState };

      expect(areAdminListStatesEqual(state1, state2)).toBe(true);
    });

    it('should return false for different primitive values', () => {
      const state1 = mockState;
      const state2 = { ...mockState, search: 'different' };

      expect(areAdminListStatesEqual(state1, state2)).toBe(false);
    });

    it('should return false for different filters', () => {
      const state1 = mockState;
      const state2 = {
        ...mockState,
        filters: { ...mockState.filters, status: ['different'] },
      };

      expect(areAdminListStatesEqual(state1, state2)).toBe(false);
    });

    it('should handle null states', () => {
      expect(areAdminListStatesEqual(null as any, mockState)).toBe(false);
      expect(areAdminListStatesEqual(mockState, null as any)).toBe(false);
      expect(areAdminListStatesEqual(null as any, null as any)).toBe(false);
    });
  });

  describe('cloneAdminListState', () => {
    it('should create a deep clone', () => {
      const cloned = cloneAdminListState(mockState);

      expect(cloned).toEqual(mockState);
      expect(cloned).not.toBe(mockState);
      expect(cloned.filters).not.toBe(mockState.filters);
      expect(cloned.filters.status).not.toBe(mockState.filters.status);
    });

    it('should allow independent modifications', () => {
      const cloned = cloneAdminListState(mockState);

      cloned.search = 'modified';
      cloned.filters.status.push('new_value');

      expect(mockState.search).toBe('test search');
      expect(mockState.filters.status).toEqual(['active', 'pending']);
    });
  });
});

describe('StateSyncDebouncer', () => {
  let debouncer: StateSyncDebouncer;

  beforeEach(() => {
    debouncer = new StateSyncDebouncer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    debouncer.destroy();
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const fn = vi.fn();

    debouncer.debounce('test', fn, 100);
    debouncer.debounce('test', fn, 100);
    debouncer.debounce('test', fn, 100);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple keys independently', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    debouncer.debounce('key1', fn1, 100);
    debouncer.debounce('key2', fn2, 100);

    vi.advanceTimersByTime(100);

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should clear specific timeouts', () => {
    const fn = vi.fn();

    debouncer.debounce('test', fn, 100);
    debouncer.clear('test');

    vi.advanceTimersByTime(100);

    expect(fn).not.toHaveBeenCalled();
  });

  it('should clear all timeouts', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    debouncer.debounce('key1', fn1, 100);
    debouncer.debounce('key2', fn2, 100);
    debouncer.clear();

    vi.advanceTimersByTime(100);

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it('should clean up on destroy', () => {
    const fn = vi.fn();

    debouncer.debounce('test', fn, 100);
    debouncer.destroy();

    vi.advanceTimersByTime(100);

    expect(fn).not.toHaveBeenCalled();
  });
});
