import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
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
} from '../filterStateManager';

describe('filterStateManager', () => {
  describe('normalizeAndValidateFilters', () => {
    it('should normalize valid filters correctly', () => {
      const filters = {
        status: ['active', 'inactive'],
        region: ['us-east-1', 'us-west-2'],
      };

      const result = normalizeAndValidateFilters(filters);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedFilters).toEqual({
        status: ['active', 'inactive'],
        region: ['us-east-1', 'us-west-2'],
      });
    });

    it('should handle empty and invalid inputs', () => {
      const result1 = normalizeAndValidateFilters({});
      expect(result1.isValid).toBe(true);
      expect(result1.normalizedFilters).toEqual({});

      const result2 = normalizeAndValidateFilters(null as any);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Filters must be a valid object');
    });

    it('should validate column names', () => {
      const filters = {
        valid_column: ['value1'],
        'invalid-column': ['value2'], // Invalid: contains hyphen
        '123invalid': ['value3'], // Invalid: starts with number
        '': ['value4'], // Invalid: empty string
      };

      const result = normalizeAndValidateFilters(filters);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.normalizedFilters).toEqual({
        valid_column: ['value1'],
      });
    });

    it('should remove duplicate values', () => {
      const filters = {
        status: ['active', 'inactive', 'active', 'pending', 'inactive'],
      };

      const result = normalizeAndValidateFilters(filters);

      expect(result.isValid).toBe(true);
      expect(result.normalizedFilters.status).toEqual([
        'active',
        'inactive',
        'pending',
      ]);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should trim whitespace from values', () => {
      const filters = {
        status: ['  active  ', '\tinactive\n', ' pending '],
      };

      const result = normalizeAndValidateFilters(filters);

      expect(result.isValid).toBe(true);
      expect(result.normalizedFilters.status).toEqual([
        'active',
        'inactive',
        'pending',
      ]);
    });

    it('should handle empty values', () => {
      const filters = {
        status: ['active', '', '   ', 'inactive'],
      };

      const result = normalizeAndValidateFilters(filters);

      expect(result.isValid).toBe(true);
      expect(result.normalizedFilters.status).toEqual(['active', 'inactive']);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should enforce maximum values per filter', () => {
      const config: FilterStateConfig = {
        ...DEFAULT_FILTER_CONFIG,
        maxValuesPerFilter: 3,
      };

      const filters = {
        status: ['value1', 'value2', 'value3', 'value4', 'value5'],
      };

      const result = normalizeAndValidateFilters(filters, config);

      expect(result.isValid).toBe(true);
      expect(result.normalizedFilters.status).toHaveLength(3);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should enforce maximum value length', () => {
      const config: FilterStateConfig = {
        ...DEFAULT_FILTER_CONFIG,
        maxValueLength: 10,
      };

      const filters = {
        status: ['short', 'this_is_a_very_long_value_that_exceeds_limit'],
      };

      const result = normalizeAndValidateFilters(filters, config);

      expect(result.isValid).toBe(true);
      expect(result.normalizedFilters.status).toEqual(['short', 'this_is_a_']);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should enforce maximum active filters', () => {
      const config: FilterStateConfig = {
        ...DEFAULT_FILTER_CONFIG,
        maxActiveFilters: 2,
      };

      const filters = {
        status: ['active'],
        region: ['us-east-1'],
        protocol: ['http'],
      };

      const result = normalizeAndValidateFilters(filters, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Too many active filters (3). Maximum allowed: 2',
      );
    });

    it('should validate against allowed values when configured', () => {
      const config: FilterStateConfig = {
        ...DEFAULT_FILTER_CONFIG,
        validateAgainstAllowed: true,
      };

      const allowedValues = {
        status: ['active', 'inactive'],
        region: ['us-east-1', 'us-west-2'],
      };

      const filters = {
        status: ['active', 'unknown_status'],
        region: ['us-east-1'],
      };

      const result = normalizeAndValidateFilters(
        filters,
        config,
        allowedValues,
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.normalizedFilters).toEqual({
        status: ['active', 'unknown_status'], // Still included with warning
        region: ['us-east-1'],
      });
    });

    it('should handle non-string values by converting them', () => {
      const filters = {
        status: ['active', 123, true, null] as any,
      };

      const result = normalizeAndValidateFilters(filters);

      expect(result.isValid).toBe(true);
      expect(result.normalizedFilters.status).toEqual([
        'active',
        '123',
        'true',
        'null',
      ]);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('mergeFilters', () => {
    it('should merge multiple filter objects', () => {
      const base = { status: ['active'] };
      const filter1 = { region: ['us-east-1'] };
      const filter2 = { protocol: ['http'] };

      const result = mergeFilters(base, filter1, filter2);

      expect(result).toEqual({
        status: ['active'],
        region: ['us-east-1'],
        protocol: ['http'],
      });
    });

    it('should replace filters with same column name', () => {
      const base = { status: ['active', 'inactive'] };
      const override = { status: ['pending'] };

      const result = mergeFilters(base, override);

      expect(result).toEqual({
        status: ['pending'],
      });
    });

    it('should handle empty arrays and null values', () => {
      const base = { status: ['active'], region: ['us-east-1'] };
      const override = { status: [], region: null as any };

      const result = mergeFilters(base, override);

      expect(result).toEqual({});
    });

    it('should handle invalid filter objects gracefully', () => {
      const base = { status: ['active'] };
      const invalid = null as any;

      const result = mergeFilters(base, invalid);

      expect(result).toEqual({ status: ['active'] });
    });
  });

  describe('applyFilterOperation', () => {
    const baseFilters = {
      status: ['active', 'inactive'],
      region: ['us-east-1'],
    };

    it('should handle SET operation', () => {
      const operation: FilterChangeOperation = {
        type: FilterChangeType.SET,
        columnName: 'status',
        values: ['pending'],
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation);

      expect(result).toEqual({
        status: ['pending'],
        region: ['us-east-1'],
      });
    });

    it('should handle SET operation with empty values (clear)', () => {
      const operation: FilterChangeOperation = {
        type: FilterChangeType.SET,
        columnName: 'status',
        values: [],
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation);

      expect(result).toEqual({
        region: ['us-east-1'],
      });
    });

    it('should handle ADD operation', () => {
      const operation: FilterChangeOperation = {
        type: FilterChangeType.ADD,
        columnName: 'status',
        values: ['pending'],
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation);

      expect(result).toEqual({
        status: ['active', 'inactive', 'pending'],
        region: ['us-east-1'],
      });
    });

    it('should handle ADD operation with duplicates', () => {
      const operation: FilterChangeOperation = {
        type: FilterChangeType.ADD,
        columnName: 'status',
        values: ['active', 'pending'],
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation);

      expect(result).toEqual({
        status: ['active', 'inactive', 'pending'],
        region: ['us-east-1'],
      });
    });

    it('should handle REMOVE operation', () => {
      const operation: FilterChangeOperation = {
        type: FilterChangeType.REMOVE,
        columnName: 'status',
        values: ['inactive'],
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation);

      expect(result).toEqual({
        status: ['active'],
        region: ['us-east-1'],
      });
    });

    it('should handle REMOVE operation that clears all values', () => {
      const operation: FilterChangeOperation = {
        type: FilterChangeType.REMOVE,
        columnName: 'status',
        values: ['active', 'inactive'],
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation);

      expect(result).toEqual({
        region: ['us-east-1'],
      });
    });

    it('should handle CLEAR operation', () => {
      const operation: FilterChangeOperation = {
        type: FilterChangeType.CLEAR,
        columnName: 'status',
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation);

      expect(result).toEqual({
        region: ['us-east-1'],
      });
    });

    it('should handle CLEAR_ALL operation', () => {
      const operation: FilterChangeOperation = {
        type: FilterChangeType.CLEAR_ALL,
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation);

      expect(result).toEqual({});
    });

    it('should handle BULK_SET operation', () => {
      const operation: FilterChangeOperation = {
        type: FilterChangeType.BULK_SET,
        bulkFilters: {
          protocol: ['http', 'https'],
          environment: ['production'],
        },
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation);

      expect(result).toEqual({
        protocol: ['http', 'https'],
        environment: ['production'],
      });
    });

    it('should enforce maxValuesPerFilter in ADD operation', () => {
      const config: FilterStateConfig = {
        ...DEFAULT_FILTER_CONFIG,
        maxValuesPerFilter: 3,
      };

      const operation: FilterChangeOperation = {
        type: FilterChangeType.ADD,
        columnName: 'status',
        values: ['pending', 'error'],
        timestamp: Date.now(),
      };

      const result = applyFilterOperation(baseFilters, operation, config);

      expect(result.status).toHaveLength(3); // Limited to maxValuesPerFilter
    });
  });

  describe('FilterStateManager', () => {
    let manager: FilterStateManager;
    let changeListener: vi.Mock;

    beforeEach(() => {
      changeListener = vi.fn();
      manager = new FilterStateManager();
      manager.addChangeListener(changeListener);
    });

    afterEach(() => {
      manager.destroy();
    });

    it('should initialize with empty filters', () => {
      expect(manager.getFilters()).toEqual({});
    });

    it('should initialize with provided filters', () => {
      const initialFilters = { status: ['active'] };
      const customManager = new FilterStateManager(initialFilters);

      expect(customManager.getFilters()).toEqual({ status: ['active'] });
      customManager.destroy();
    });

    it('should queue and execute filter operations', async () => {
      manager.setFilter('status', ['active']);

      // Should not be applied immediately due to debouncing
      expect(manager.getFilters()).toEqual({});

      // Flush to execute immediately
      manager.flush();

      expect(manager.getFilters()).toEqual({ status: ['active'] });
      expect(changeListener).toHaveBeenCalledTimes(1);
    });

    it('should debounce multiple rapid operations', async () => {
      const config = { ...DEFAULT_FILTER_CONFIG, debounceMs: 50 };
      const debouncedManager = new FilterStateManager({}, config);
      const debouncedListener = vi.fn();
      debouncedManager.addChangeListener(debouncedListener);

      // Queue multiple operations rapidly
      debouncedManager.setFilter('status', ['active']);
      debouncedManager.setFilter('region', ['us-east-1']);
      debouncedManager.setFilter('protocol', ['http']);

      // Should not be applied immediately
      expect(debouncedManager.getFilters()).toEqual({});
      expect(debouncedListener).not.toHaveBeenCalled();

      // Wait for debounce to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(debouncedManager.getFilters()).toEqual({
        status: ['active'],
        region: ['us-east-1'],
        protocol: ['http'],
      });
      expect(debouncedListener).toHaveBeenCalledTimes(1);

      debouncedManager.destroy();
    });

    it('should handle addToFilter operation', () => {
      manager.setFilter('status', ['active']);
      manager.flush();

      manager.addToFilter('status', ['inactive']);
      manager.flush();

      expect(manager.getFilters()).toEqual({
        status: ['active', 'inactive'],
      });
    });

    it('should handle removeFromFilter operation', () => {
      manager.setFilter('status', ['active', 'inactive', 'pending']);
      manager.flush();

      manager.removeFromFilter('status', ['inactive']);
      manager.flush();

      expect(manager.getFilters()).toEqual({
        status: ['active', 'pending'],
      });
    });

    it('should handle clearFilter operation', () => {
      manager.setBulkFilters({
        status: ['active'],
        region: ['us-east-1'],
      });
      manager.flush();

      manager.clearFilter('status');
      manager.flush();

      expect(manager.getFilters()).toEqual({
        region: ['us-east-1'],
      });
    });

    it('should handle clearAllFilters operation', () => {
      manager.setBulkFilters({
        status: ['active'],
        region: ['us-east-1'],
      });
      manager.flush();

      manager.clearAllFilters();
      manager.flush();

      expect(manager.getFilters()).toEqual({});
    });

    it('should handle setBulkFilters operation', () => {
      manager.setBulkFilters({
        status: ['active', 'inactive'],
        region: ['us-east-1', 'us-west-2'],
      });
      manager.flush();

      expect(manager.getFilters()).toEqual({
        status: ['active', 'inactive'],
        region: ['us-east-1', 'us-west-2'],
      });
    });

    it('should validate filters during operations', () => {
      const config: FilterStateConfig = {
        ...DEFAULT_FILTER_CONFIG,
        maxValuesPerFilter: 2,
      };
      const validatingManager = new FilterStateManager({}, config);
      const validatingListener = vi.fn();
      validatingManager.addChangeListener(validatingListener);

      validatingManager.setFilter('status', ['active', 'inactive', 'pending']);
      validatingManager.flush();

      expect(validatingManager.getFilters().status).toHaveLength(2);
      expect(validatingListener).toHaveBeenCalledWith(
        expect.objectContaining({
          validationResult: expect.objectContaining({
            warnings: expect.arrayContaining([
              expect.stringContaining('Too many values'),
            ]),
          }),
        }),
      );

      validatingManager.destroy();
    });

    it('should handle change listener management', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      manager.addChangeListener(listener1);
      manager.addChangeListener(listener2);

      manager.setFilter('status', ['active']);
      manager.flush();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      manager.removeChangeListener(listener1);

      manager.setFilter('region', ['us-east-1']);
      manager.flush();

      expect(listener1).toHaveBeenCalledTimes(1); // Not called again
      expect(listener2).toHaveBeenCalledTimes(2); // Called again
    });

    it('should handle errors in change listeners gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      manager.addChangeListener(errorListener);
      manager.addChangeListener(normalListener);

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      manager.setFilter('status', ['active']);
      manager.flush();

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(normalListener).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in filter change listener:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should update configuration', () => {
      const newConfig = { maxValuesPerFilter: 5 };
      manager.updateConfig(newConfig);

      manager.setFilter('status', ['v1', 'v2', 'v3', 'v4', 'v5']);
      manager.flush();

      expect(manager.getFilters().status).toHaveLength(5);
    });

    it('should update allowed values', () => {
      const allowedValues = { status: ['active', 'inactive'] };
      manager.updateAllowedValues(allowedValues);

      // This would be tested more thoroughly with validateAgainstAllowed: true
      expect(() => manager.updateAllowedValues(allowedValues)).not.toThrow();
    });
  });

  describe('utility functions', () => {
    describe('areFiltersEqual', () => {
      it('should return true for identical filters', () => {
        const filters1 = { status: ['active'], region: ['us-east-1'] };
        const filters2 = { status: ['active'], region: ['us-east-1'] };

        expect(areFiltersEqual(filters1, filters2)).toBe(true);
      });

      it('should return false for different filters', () => {
        const filters1 = { status: ['active'] };
        const filters2 = { status: ['inactive'] };

        expect(areFiltersEqual(filters1, filters2)).toBe(false);
      });

      it('should return false for different number of filters', () => {
        const filters1 = { status: ['active'] };
        const filters2 = { status: ['active'], region: ['us-east-1'] };

        expect(areFiltersEqual(filters1, filters2)).toBe(false);
      });

      it('should handle empty and null filters', () => {
        expect(areFiltersEqual({}, {})).toBe(true);
        expect(areFiltersEqual(null as any, null as any)).toBe(true);
        expect(areFiltersEqual({}, null as any)).toBe(true);
      });
    });

    describe('getActiveFilterCount', () => {
      it('should count active filter values', () => {
        const filters = {
          status: ['active', 'inactive'],
          region: ['us-east-1'],
        };

        expect(getActiveFilterCount(filters)).toBe(3);
      });

      it('should handle empty filters', () => {
        expect(getActiveFilterCount({})).toBe(0);
        expect(getActiveFilterCount(null as any)).toBe(0);
      });
    });

    describe('isFilterValueActive', () => {
      const filters = {
        status: ['active', 'inactive'],
        region: ['us-east-1'],
      };

      it('should check if specific value is active', () => {
        expect(isFilterValueActive(filters, 'status', 'active')).toBe(true);
        expect(isFilterValueActive(filters, 'status', 'pending')).toBe(false);
      });

      it('should check if any value is active for column', () => {
        expect(isFilterValueActive(filters, 'status')).toBe(true);
        expect(isFilterValueActive(filters, 'protocol')).toBe(false);
      });
    });

    describe('getAllFilterValues', () => {
      it('should get all unique values', () => {
        const filters = {
          status: ['active', 'inactive'],
          region: ['us-east-1', 'active'], // 'active' appears in both
        };

        const values = getAllFilterValues(filters);
        expect(values).toHaveLength(3);
        expect(values).toContain('active');
        expect(values).toContain('inactive');
        expect(values).toContain('us-east-1');
      });

      it('should handle empty filters', () => {
        expect(getAllFilterValues({})).toEqual([]);
        expect(getAllFilterValues(null as any)).toEqual([]);
      });
    });

    describe('createFilterSummary', () => {
      it('should create readable summary', () => {
        const filters = {
          status: ['active', 'inactive'],
          region: ['us-east-1'],
        };

        const summary = createFilterSummary(filters);
        expect(summary).toContain('Active filters (2)');
        expect(summary).toContain('status: [active, inactive]');
        expect(summary).toContain('region: [us-east-1]');
      });

      it('should handle empty filters', () => {
        const summary = createFilterSummary({});
        expect(summary).toBe('No active filters');
      });
    });
  });
});
