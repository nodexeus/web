import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SortOrder } from '../../../../generated/blockjoy/common/v1/search';
import {
  sanitizeStringValue,
  validateColumnName,
  parseFilterValues,
  parseUrlParameters,
  serializeStateToUrlParameters,
  deserializeUrlParametersToState,
  areUrlParametersEqual,
  createUrlFromParameters,
  extractParametersFromUrl,
  UrlHistoryManager,
  DEFAULT_URL_VALIDATION_CONFIG,
} from '../urlParameterUtils';

// Mock window.location for URL tests
const mockLocation = {
  origin: 'https://example.com',
  href: 'https://example.com/admin',
  pathname: '/admin',
  search: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock window.history
const mockHistory = {
  pushState: vi.fn(),
  replaceState: vi.fn(),
};

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true,
});

describe('urlParameterUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeStringValue', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeStringValue(input);
      expect(result).toBe('scriptalert(xss)/script');
    });

    it('should trim whitespace', () => {
      const input = '  test value  ';
      const result = sanitizeStringValue(input);
      expect(result).toBe('test value');
    });

    it('should respect max length', () => {
      const input = 'a'.repeat(100);
      const result = sanitizeStringValue(input, 50);
      expect(result).toHaveLength(50);
    });

    it('should remove control characters', () => {
      const input = 'test\x00\x1F\x7Fvalue';
      const result = sanitizeStringValue(input);
      expect(result).toBe('testvalue');
    });

    it('should handle non-string input', () => {
      const result = sanitizeStringValue(123 as any);
      expect(result).toBe('');
    });
  });

  describe('validateColumnName', () => {
    it('should accept valid column names', () => {
      expect(validateColumnName('status')).toBe('status');
      expect(validateColumnName('node_type')).toBe('node_type');
      expect(validateColumnName('_private')).toBe('_private');
      expect(validateColumnName('column123')).toBe('column123');
    });

    it('should reject invalid column names', () => {
      expect(validateColumnName('123invalid')).toBeNull();
      expect(validateColumnName('column-name')).toBe('columnname');
      expect(validateColumnName('column.name')).toBe('columnname');
      expect(validateColumnName('')).toBeNull();
    });

    it('should handle non-string input', () => {
      expect(validateColumnName(123 as any)).toBeNull();
      expect(validateColumnName(null as any)).toBeNull();
    });

    it('should reject overly long column names', () => {
      const longName = 'a'.repeat(100);
      expect(validateColumnName(longName)).toBeNull();
    });
  });

  describe('parseFilterValues', () => {
    it('should parse comma-separated values', () => {
      const result = parseFilterValues('value1,value2,value3');
      expect(result.values).toEqual(['value1', 'value2', 'value3']);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty and whitespace values', () => {
      const result = parseFilterValues('value1, , value2,   ,value3');
      expect(result.values).toEqual(['value1', 'value2', 'value3']);
    });

    it('should remove duplicates while preserving order', () => {
      const result = parseFilterValues('value1,value2,value1,value3');
      expect(result.values).toEqual(['value1', 'value2', 'value3']);
    });

    it('should limit number of values', () => {
      const manyValues = Array.from(
        { length: 100 },
        (_, i) => `value${i}`,
      ).join(',');
      const result = parseFilterValues(manyValues);
      expect(result.values).toHaveLength(
        DEFAULT_URL_VALIDATION_CONFIG.maxFilterValuesPerColumn,
      );
      expect(result.errors).toContain('Too many filter values (max: 50)');
    });

    it('should sanitize individual values', () => {
      const result = parseFilterValues('normal,<script>bad</script>,good');
      expect(result.values).toEqual(['normal', 'scriptbad/script', 'good']);
    });

    it('should handle non-string input', () => {
      const result = parseFilterValues(123 as any);
      expect(result.values).toEqual([]);
      expect(result.errors).toContain('Filter value must be a string');
    });
  });

  describe('parseUrlParameters', () => {
    it('should parse valid URL parameters', () => {
      const query = {
        name: 'nodes',
        page: '2',
        pageSize: '50',
        search: 'test query',
        sortField: '1',
        sortOrder: String(SortOrder.SORT_ORDER_ASCENDING),
        filter_status: 'active,inactive',
        filter_type: 'validator',
      };

      const result = parseUrlParameters(query, 'nodes');

      expect(result.isValid).toBe(true);
      expect(result.params).toEqual({
        name: 'nodes',
        page: 2,
        pageSize: 50,
        search: 'test query',
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        filter_status: 'active,inactive',
        filter_type: 'validator',
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should handle array query parameters', () => {
      const query = {
        name: ['nodes'],
        page: ['2', '3'], // Should take first value
        search: ['test'],
      };

      const result = parseUrlParameters(query, 'nodes');

      expect(result.isValid).toBe(true);
      expect(result.params.page).toBe(2);
      expect(result.params.search).toBe('test');
    });

    it('should validate and correct invalid values', () => {
      const query = {
        name: 'nodes',
        page: '-1', // Invalid, should warn
        pageSize: '2000', // Too large, should warn
        search: '<script>alert("xss")</script>', // Should sanitize
        sortField: 'invalid', // Invalid format
        sortOrder: '999', // Invalid value
      };

      const result = parseUrlParameters(query, 'nodes');

      expect(result.params.page).toBe(1); // Corrected
      expect(result.params.pageSize).toBe(
        DEFAULT_URL_VALIDATION_CONFIG.maxPageSize,
      ); // Corrected
      expect(result.params.search).toBe('scriptalert(xss)/script'); // Sanitized
      expect(result.params.sortField).toBeUndefined(); // Rejected
      expect(result.params.sortOrder).toBeUndefined(); // Rejected

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle filter parameters with validation', () => {
      const query = {
        name: 'nodes',
        filter_status: 'active,inactive',
        filter_123invalid: 'value', // Invalid column name (starts with number)
        filter_toolong: 'a'.repeat(2000), // Too long
      };

      const result = parseUrlParameters(query, 'nodes');

      expect(result.params.filter_status).toBe('active,inactive');
      expect(result.params['filter_123invalid']).toBeUndefined();
      expect(result.errors.some((e) => e.includes('123invalid'))).toBe(true);
    });

    it('should limit number of active filters', () => {
      const query: Record<string, string> = { name: 'nodes' };

      // Add more filters than allowed
      for (
        let i = 0;
        i < DEFAULT_URL_VALIDATION_CONFIG.maxActiveFilters + 5;
        i++
      ) {
        query[`filter_column${i}`] = `value${i}`;
      }

      const result = parseUrlParameters(query, 'nodes');

      const filterCount = Object.keys(result.params).filter((k) =>
        k.startsWith('filter_'),
      ).length;
      expect(filterCount).toBeLessThanOrEqual(
        DEFAULT_URL_VALIDATION_CONFIG.maxActiveFilters,
      );
      expect(
        result.warnings.some((w) => w.includes('Too many active filters')),
      ).toBe(true);
    });
  });

  describe('serializeStateToUrlParameters', () => {
    it('should serialize complete state', () => {
      const state = {
        page: 2,
        pageSize: 50,
        search: 'test query',
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        filters: {
          status: ['active', 'inactive'],
          type: ['validator'],
        },
      };

      const result = serializeStateToUrlParameters(state, 'nodes');

      expect(result).toEqual({
        name: 'nodes',
        page: 2,
        pageSize: 50,
        search: 'test query',
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        filter_status: 'active,inactive',
        filter_type: 'validator',
      });
    });

    it('should exclude default values by default', () => {
      const state = {
        page: 1, // Default
        pageSize: 24, // Default
        search: '',
        sortField: 0,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {},
      };

      const result = serializeStateToUrlParameters(state, 'nodes');

      expect(result).toEqual({ name: 'nodes' });
    });

    it('should include default values when requested', () => {
      const state = {
        page: 1,
        pageSize: 24,
        sortField: 0,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
      };

      const result = serializeStateToUrlParameters(state, 'nodes', true);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(24);
      expect(result.sortField).toBe(0);
      expect(result.sortOrder).toBe(SortOrder.SORT_ORDER_UNSPECIFIED);
    });

    it('should sanitize filter values', () => {
      const state = {
        filters: {
          status: ['<script>alert("xss")</script>', 'normal'],
          'invalid-column': ['value'], // Invalid column name
        },
      };

      const result = serializeStateToUrlParameters(state, 'nodes');

      expect(result.filter_status).toBe('scriptalert(xss)/script,normal');
      expect(result['filter_invalid-column']).toBeUndefined();
    });
  });

  describe('deserializeUrlParametersToState', () => {
    it('should convert URL parameters to state', () => {
      const urlParams = {
        name: 'nodes',
        page: 2,
        pageSize: 50,
        search: 'test query',
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        filter_status: 'active,inactive',
        filter_type: 'validator',
      };

      const result = deserializeUrlParametersToState(urlParams);

      expect(result.state).toEqual({
        page: 2,
        pageSize: 50,
        search: 'test query',
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        filters: {
          status: ['active', 'inactive'],
          type: ['validator'],
        },
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing parameters gracefully', () => {
      const urlParams = { name: 'nodes' };

      const result = deserializeUrlParametersToState(urlParams);

      expect(result.state).toEqual({});
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('areUrlParametersEqual', () => {
    it('should return true for identical parameters', () => {
      const params1 = { name: 'nodes', page: 2, search: 'test' };
      const params2 = { name: 'nodes', page: 2, search: 'test' };

      expect(areUrlParametersEqual(params1, params2)).toBe(true);
    });

    it('should return false for different parameters', () => {
      const params1 = { name: 'nodes', page: 2 };
      const params2 = { name: 'nodes', page: 3 };

      expect(areUrlParametersEqual(params1, params2)).toBe(false);
    });

    it('should handle undefined values', () => {
      const params1 = { name: 'nodes', page: undefined };
      const params2 = { name: 'nodes' };

      expect(areUrlParametersEqual(params1, params2)).toBe(false);
    });

    it('should handle different key counts', () => {
      const params1 = { name: 'nodes', page: 2 };
      const params2 = { name: 'nodes', page: 2, search: 'test' };

      expect(areUrlParametersEqual(params1, params2)).toBe(false);
    });
  });

  describe('createUrlFromParameters', () => {
    it('should create URL with parameters', () => {
      const params = {
        name: 'nodes',
        page: 2,
        search: 'test query',
        filter_status: 'active',
      };

      const result = createUrlFromParameters(params);

      expect(result).toContain('/admin');
      expect(result).toContain('name=nodes');
      expect(result).toContain('page=2');
      expect(result).toContain('search=test+query');
      expect(result).toContain('filter_status=active');
    });

    it('should handle custom base path', () => {
      const params = { name: 'nodes' };
      const result = createUrlFromParameters(params, '/custom');

      expect(result).toContain('/custom');
    });
  });

  describe('extractParametersFromUrl', () => {
    it('should extract parameters from URL', () => {
      const url = 'https://example.com/admin?name=nodes&page=2&search=test';
      const result = extractParametersFromUrl(url, 'nodes');

      expect(result.isValid).toBe(true);
      expect(result.params.name).toBe('nodes');
      expect(result.params.page).toBe(2);
      expect(result.params.search).toBe('test');
    });

    it('should handle invalid URLs', () => {
      const url = 'http://[invalid-url';
      const result = extractParametersFromUrl(url, 'nodes');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('UrlHistoryManager', () => {
    let manager: UrlHistoryManager;
    let onStateChange: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onStateChange = vi.fn();
      manager = new UrlHistoryManager(
        'nodes',
        DEFAULT_URL_VALIDATION_CONFIG,
        onStateChange,
      );
    });

    afterEach(() => {
      manager.stopListening();
    });

    it('should push state to history', () => {
      const state = { page: 2, search: 'test' };
      manager.pushState(state, 'Test Title');

      expect(mockHistory.pushState).toHaveBeenCalledWith(
        { listName: 'nodes', state },
        'Test Title',
        expect.stringContaining('page=2'),
      );
    });

    it('should replace state in history', () => {
      const state = { page: 3, search: 'new test' };
      manager.replaceState(state);

      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        { listName: 'nodes', state },
        expect.any(String),
        expect.stringContaining('page=3'),
      );
    });

    it('should handle popstate events with state', () => {
      const state = { page: 2, search: 'test' };
      const event = new PopStateEvent('popstate', {
        state: { listName: 'nodes', state },
      });

      manager.handlePopState(event);

      expect(onStateChange).toHaveBeenCalledWith(state);
    });

    it('should handle popstate events without state', () => {
      // Mock current URL
      mockLocation.href = 'https://example.com/admin?name=nodes&page=2';

      const event = new PopStateEvent('popstate', { state: null });
      manager.handlePopState(event);

      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });

    it('should start and stop listening', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      manager.startListening();
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'popstate',
        manager.handlePopState,
      );

      manager.stopListening();
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'popstate',
        manager.handlePopState,
      );
    });

    it('should get current state from URL', () => {
      mockLocation.href =
        'https://example.com/admin?name=nodes&page=2&search=test';

      const result = manager.getCurrentState();

      expect(result.state).toEqual(
        expect.objectContaining({
          page: 2,
          search: 'test',
        }),
      );
    });
  });
});
