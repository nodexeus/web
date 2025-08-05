import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SortOrder } from '../../../../generated/blockjoy/common/v1/search';
import {
  parseUrlParameters,
  serializeStateToUrlParameters,
  validateColumnName,
  sanitizeStringValue,
  DEFAULT_URL_VALIDATION_CONFIG,
} from '../../utils/urlParameterUtils';

describe('useUpdateQueryString utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('URL parameter serialization', () => {
    it('should serialize state to URL parameters correctly', () => {
      const state = {
        page: 2,
        search: 'test search',
        pageSize: 50,
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
        search: 'test search',
        pageSize: 50,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        filter_status: 'active,inactive',
        filter_type: 'validator',
      });
    });

    it('should exclude default values to keep URLs clean', () => {
      const state = {
        page: 1, // Default
        search: '',
        pageSize: 24, // Default
        sortField: 0,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {},
      };

      const result = serializeStateToUrlParameters(state, 'nodes');

      expect(result).toEqual({ name: 'nodes' }); // Only name should be included
    });

    it('should include default values when explicitly requested', () => {
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
  });

  describe('URL parameter parsing', () => {
    it('should parse URL parameters correctly', () => {
      const query = {
        name: 'nodes',
        page: '2',
        search: 'test',
        pageSize: '50',
        sortField: '1',
        sortOrder: String(SortOrder.SORT_ORDER_ASCENDING),
        filter_status: 'active,inactive',
      };

      const result = parseUrlParameters(query, 'nodes');

      expect(result.isValid).toBe(true);
      expect(result.params).toEqual({
        name: 'nodes',
        page: 2,
        pageSize: 50,
        search: 'test',
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        filter_status: 'active,inactive',
      });
    });

    it('should validate URL parameters and reject invalid values', () => {
      const query = {
        name: 'nodes',
        page: '-1', // Invalid
        pageSize: '2000', // Too large
        search: '<script>alert("xss")</script>', // Should be sanitized
        sortField: 'invalid', // Invalid format
        sortOrder: '999', // Invalid value
        filter_status: 'active,inactive',
        filter_123invalid: 'value', // Invalid column name
      };

      const result = parseUrlParameters(query, 'nodes');

      expect(result.params.page).toBe(1); // Corrected
      expect(result.params.pageSize).toBe(1000); // Corrected to max
      expect(result.params.search).toBe('scriptalert(xss)/script'); // Sanitized
      expect(result.params.sortField).toBeUndefined(); // Rejected
      expect(result.params.sortOrder).toBeUndefined(); // Rejected
      expect(result.params.filter_status).toBe('active,inactive'); // Valid
      expect(result.params['filter_123invalid']).toBeUndefined(); // Rejected

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
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
  });

  describe('URL validation utilities', () => {
    it('should validate column names correctly', () => {
      expect(validateColumnName('status')).toBe('status');
      expect(validateColumnName('node_type')).toBe('node_type');
      expect(validateColumnName('_private')).toBe('_private');
      expect(validateColumnName('column123')).toBe('column123');

      expect(validateColumnName('123invalid')).toBeNull();
      expect(validateColumnName('column-name')).toBe('columnname');
      expect(validateColumnName('column.name')).toBe('columnname');
      expect(validateColumnName('')).toBeNull();
    });

    it('should sanitize string values', () => {
      expect(sanitizeStringValue('<script>alert("xss")</script>')).toBe(
        'scriptalert(xss)/script',
      );
      expect(sanitizeStringValue('  test value  ')).toBe('test value');
      expect(sanitizeStringValue('a'.repeat(100), 50)).toHaveLength(50);
      expect(sanitizeStringValue('test\x00\x1F\x7Fvalue')).toBe('testvalue');
      expect(sanitizeStringValue(123 as any)).toBe('');
    });
  });

  describe('filter parameter handling', () => {
    it('should serialize filters correctly', () => {
      const state = {
        filters: {
          status: ['active', 'inactive'],
          type: ['validator'],
          'invalid-column': ['value'], // Should be sanitized
        },
      };

      const result = serializeStateToUrlParameters(state, 'nodes');

      expect(result.filter_status).toBe('active,inactive');
      expect(result.filter_type).toBe('validator');
      expect(result['filter_invalid-column']).toBeUndefined(); // Invalid column name
    });

    it('should parse filter parameters with validation', () => {
      const query = {
        name: 'nodes',
        filter_status: 'active,inactive',
        filter_123invalid: 'value', // Invalid column name
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

  describe('error handling and edge cases', () => {
    it('should handle empty query parameters', () => {
      const result = parseUrlParameters({}, 'nodes');

      expect(result.isValid).toBe(true);
      expect(result.params).toEqual({ name: 'nodes' });
      expect(result.errors).toHaveLength(0);
    });

    it('should handle malformed filter values', () => {
      const query = {
        name: 'nodes',
        filter_status: '', // Empty filter
        filter_type: ',,,', // Only commas
        filter_valid: 'value1,value2,value3', // Valid
      };

      const result = parseUrlParameters(query, 'nodes');

      expect(result.params.filter_status).toBeUndefined(); // Empty should be excluded
      expect(result.params.filter_type).toBeUndefined(); // Only commas should be excluded
      expect(result.params.filter_valid).toBe('value1,value2,value3'); // Valid should be included
    });

    it('should handle boundary values correctly', () => {
      const query = {
        name: 'nodes',
        page: '0', // Below minimum, should be corrected to 1
        pageSize: '0', // Below minimum, should be excluded
        search: 'a'.repeat(1000), // Very long
      };

      const result = parseUrlParameters(query, 'nodes');

      expect(result.params.page).toBe(1); // Corrected to minimum valid value
      expect(result.params.pageSize).toBeUndefined(); // Invalid page size should be excluded
      expect(result.params.search).toHaveLength(500); // Should be truncated to max length
      expect(result.warnings.length).toBeGreaterThan(0); // Should have warnings
    });
  });

  describe('performance and optimization', () => {
    it('should handle large numbers of parameters efficiently', () => {
      const query: Record<string, string> = { name: 'nodes' };

      // Add many parameters
      for (let i = 0; i < 100; i++) {
        query[`param${i}`] = `value${i}`;
        if (i < 10) {
          query[`filter_col${i}`] = `val${i}`;
        }
      }

      const startTime = Date.now();
      const result = parseUrlParameters(query, 'nodes');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(result.params.name).toBe('nodes');

      // Should have processed valid filter parameters
      const filterCount = Object.keys(result.params).filter((k) =>
        k.startsWith('filter_'),
      ).length;
      expect(filterCount).toBe(10);
    });

    it('should not include undefined values in serialization', () => {
      const state = {
        page: undefined,
        search: undefined,
        pageSize: undefined,
        sortField: undefined,
        sortOrder: undefined,
        filters: undefined,
      };

      const result = serializeStateToUrlParameters(state, 'nodes');

      expect(result).toEqual({ name: 'nodes' });
      expect(Object.keys(result)).toHaveLength(1);
    });
  });
});
