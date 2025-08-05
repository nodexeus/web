import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SortOrder } from '../../../../generated/blockjoy/common/v1/search';
import {
  FilterStateManager,
  FilterChangeType,
  getActiveFilterCount,
  isFilterValueActive,
  areFiltersEqual,
  normalizeAndValidateFilters,
  mergeFilters,
  applyFilterOperation,
} from '../filterStateManager';
import {
  normalizeFilters,
  serializeStateToUrlParams,
  deserializeUrlParamsToState,
  mergeAdminListStates,
} from '../stateSynchronization';

describe('Filter State Integration Tests', () => {
  const defaultConfig = {
    defaultPageSize: 24,
    defaultSortField: 1,
    defaultSortOrder: SortOrder.SORT_ORDER_ASC,
  };

  describe('Filter state management integration with URL serialization', () => {
    it('should serialize and deserialize filters correctly', () => {
      const state = {
        search: '',
        page: 1,
        pageSize: 24,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        filters: {
          status: ['active', 'inactive'],
          region: ['us-east-1'],
          protocol: ['http'],
        },
        isLoading: false,
        error: null,
      };

      // Serialize to URL params
      const urlParams = serializeStateToUrlParams(state, 'nodes');

      expect(urlParams.name).toBe('nodes');
      expect(urlParams.filter_status).toBe('active,inactive');
      expect(urlParams.filter_region).toBe('us-east-1');
      expect(urlParams.filter_protocol).toBe('http');

      // Deserialize back to state
      const deserializedState = deserializeUrlParamsToState(
        urlParams,
        defaultConfig,
      );

      expect(deserializedState.filters).toEqual({
        status: ['active', 'inactive'],
        region: ['us-east-1'],
        protocol: ['http'],
      });
    });

    it('should handle filter normalization during URL operations', () => {
      const urlParams = {
        name: 'nodes',
        filter_status: 'active,  ,inactive,active', // Contains duplicates and empty values
        filter_region: 'us-east-1',
        'filter_invalid-name': 'value', // Invalid column name
      };

      const deserializedState = deserializeUrlParamsToState(
        urlParams,
        defaultConfig,
      );

      // Should normalize filters (remove duplicates, empty values, invalid columns)
      expect(deserializedState.filters).toEqual({
        status: ['active', 'inactive'], // Duplicates and empty values removed
        region: ['us-east-1'],
        // invalid-name filter should be excluded
      });
    });
  });

  describe('Filter state merging integration', () => {
    it('should merge filter states correctly', () => {
      const baseState = {
        search: '',
        page: 1,
        pageSize: 24,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        filters: {
          status: ['active'],
        },
        isLoading: false,
        error: null,
      };

      const urlState = {
        page: 2,
        filters: {
          region: ['us-east-1'],
        },
      };

      const settingsState = {
        pageSize: 50,
        filters: {
          protocol: ['http'],
        },
      };

      const mergedState = mergeAdminListStates(
        baseState,
        urlState,
        settingsState,
      );

      expect(mergedState).toEqual({
        search: '',
        page: 2, // From URL state
        pageSize: 50, // From settings state
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        filters: {
          status: ['active'], // From base state
          region: ['us-east-1'], // From URL state
          protocol: ['http'], // From settings state
        },
        isLoading: false,
        error: null,
      });
    });

    it('should handle filter merging with priority', () => {
      const filters1 = { status: ['active'], region: ['us-east-1'] };
      const filters2 = { status: ['inactive'], protocol: ['http'] }; // status should override
      const filters3 = { environment: ['production'] };

      const merged = mergeFilters(filters1, filters2, filters3);

      expect(merged).toEqual({
        status: ['inactive'], // Overridden by filters2
        region: ['us-east-1'], // From filters1
        protocol: ['http'], // From filters2
        environment: ['production'], // From filters3
      });
    });
  });

  describe('FilterStateManager standalone integration', () => {
    let manager: FilterStateManager;
    let changeEvents: any[] = [];

    beforeEach(() => {
      changeEvents = [];
      manager = new FilterStateManager();
      manager.addChangeListener((event) => {
        changeEvents.push(event);
      });
    });

    afterEach(() => {
      manager.destroy();
    });

    it('should handle rapid filter changes with debouncing', async () => {
      // Queue multiple rapid changes
      manager.setFilter('status', ['active']);
      manager.setFilter('region', ['us-east-1']);
      manager.addToFilter('status', ['inactive']);
      manager.setFilter('protocol', ['http']);

      // Should not have fired events yet due to debouncing
      expect(changeEvents).toHaveLength(0);

      // Flush to execute immediately
      manager.flush();

      // Should have fired events for all changes
      expect(changeEvents.length).toBeGreaterThan(0);

      const finalFilters = manager.getFilters();
      expect(finalFilters).toEqual({
        status: ['active', 'inactive'],
        region: ['us-east-1'],
        protocol: ['http'],
      });
    });

    it('should validate filters during operations', () => {
      const config = {
        maxValuesPerFilter: 2,
        maxValueLength: 10,
        maxActiveFilters: 20,
        debounceMs: 100,
        validateAgainstAllowed: false,
      };

      const validatingManager = new FilterStateManager({}, config);
      const validationEvents: any[] = [];

      validatingManager.addChangeListener((event) => {
        validationEvents.push(event);
      });

      // Set filter with too many values
      validatingManager.setFilter('status', ['active', 'inactive', 'pending']);
      validatingManager.flush();

      expect(validationEvents).toHaveLength(1);
      expect(
        validationEvents[0].validationResult.warnings.length,
      ).toBeGreaterThan(0);

      // Should have truncated to max values
      const filters = validatingManager.getFilters();
      expect(filters.status).toHaveLength(2);

      validatingManager.destroy();
    });

    it('should handle filter merging correctly', () => {
      manager.setBulkFilters({
        status: ['active'],
        region: ['us-east-1'],
      });
      manager.flush();

      // Add more filters
      manager.setBulkFilters({
        status: ['inactive'], // Should replace
        protocol: ['http'], // Should add
      });
      manager.flush();

      const filters = manager.getFilters();
      expect(filters).toEqual({
        status: ['inactive'], // Replaced
        protocol: ['http'], // Added
        // region should be gone since it wasn't in the second bulk set
      });
    });

    it('should handle complex filter operations', () => {
      // Start with some filters
      manager.setBulkFilters({
        status: ['active', 'inactive'],
        region: ['us-east-1', 'us-west-2'],
        protocol: ['http'],
      });
      manager.flush();

      // Remove some values
      manager.removeFromFilter('status', ['inactive']);
      manager.removeFromFilter('region', ['us-west-2']);
      manager.flush();

      // Add new values
      manager.addToFilter('status', ['pending']);
      manager.addToFilter('protocol', ['https']);
      manager.flush();

      const filters = manager.getFilters();
      expect(filters).toEqual({
        status: ['active', 'pending'],
        region: ['us-east-1'],
        protocol: ['http', 'https'],
      });
    });

    it('should handle error conditions gracefully', () => {
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

      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in filter change listener:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Filter utility functions integration', () => {
    it('should correctly count active filters', () => {
      const filters = {
        status: ['active', 'inactive'],
        region: ['us-east-1'],
        protocol: ['http', 'https', 'ftp'],
      };

      expect(getActiveFilterCount(filters)).toBe(6);
      expect(getActiveFilterCount({})).toBe(0);
    });

    it('should correctly identify active filter values', () => {
      const filters = {
        status: ['active', 'inactive'],
        region: ['us-east-1'],
      };

      expect(isFilterValueActive(filters, 'status', 'active')).toBe(true);
      expect(isFilterValueActive(filters, 'status', 'pending')).toBe(false);
      expect(isFilterValueActive(filters, 'status')).toBe(true);
      expect(isFilterValueActive(filters, 'protocol')).toBe(false);
    });

    it('should correctly compare filter objects', () => {
      const filters1 = {
        status: ['active', 'inactive'],
        region: ['us-east-1'],
      };

      const filters2 = {
        status: ['active', 'inactive'],
        region: ['us-east-1'],
      };

      const filters3 = {
        status: ['active'],
        region: ['us-east-1'],
      };

      expect(areFiltersEqual(filters1, filters2)).toBe(true);
      expect(areFiltersEqual(filters1, filters3)).toBe(false);
      expect(areFiltersEqual({}, {})).toBe(true);
    });
  });

  describe('Enhanced filter normalization integration', () => {
    it('should integrate enhanced normalization with existing functions', () => {
      const filters = {
        status: ['active', '', 'inactive', 'active'], // Contains duplicates and empty values
        'invalid-column': ['value'], // Invalid column name
        validColumn: ['  value1  ', 'value2'], // Values with whitespace
      };

      // Test with enhanced normalization
      const enhancedResult = normalizeAndValidateFilters(filters);
      expect(enhancedResult.normalizedFilters).toEqual({
        status: ['active', 'inactive'], // Duplicates removed, empty values filtered
        validColumn: ['value1', 'value2'], // Whitespace trimmed
      });
      expect(enhancedResult.warnings.length).toBeGreaterThan(0);
      expect(enhancedResult.errors.length).toBeGreaterThan(0);

      // Test with existing normalization (should be compatible)
      const existingResult = normalizeFilters(filters);
      expect(existingResult).toEqual({
        status: ['active', 'inactive'], // Duplicates removed, empty values filtered
        validColumn: ['value1', 'value2'],
      });
    });

    it('should handle filter operations with validation', () => {
      const initialFilters = { status: ['active'] };

      // Test SET operation
      const setOperation = {
        type: FilterChangeType.SET,
        columnName: 'region',
        values: ['us-east-1', '', 'us-west-2'], // Contains empty value
        timestamp: Date.now(),
      };

      const afterSet = applyFilterOperation(initialFilters, setOperation);
      expect(afterSet).toEqual({
        status: ['active'],
        region: ['us-east-1', '', 'us-west-2'], // Raw operation doesn't validate
      });

      // Normalize the result
      const normalized = normalizeFilters(afterSet);
      expect(normalized).toEqual({
        status: ['active'],
        region: ['us-east-1', 'us-west-2'], // Empty value removed
      });
    });

    it('should handle complex integration scenarios', () => {
      // Simulate a complex workflow: URL -> normalization -> operations -> serialization

      // 1. Start with URL parameters
      const urlParams = {
        name: 'nodes',
        filter_status: 'active,inactive,active', // Duplicates
        filter_region: 'us-east-1,  ,us-west-2', // Empty value
        'filter_invalid-name': 'value', // Invalid column
      };

      // 2. Deserialize and normalize
      const deserializedState = deserializeUrlParamsToState(
        urlParams,
        defaultConfig,
      );
      expect(deserializedState.filters).toEqual({
        status: ['active', 'inactive'], // Duplicates removed
        region: ['us-east-1', 'us-west-2'], // Empty value removed
        // Invalid column excluded
      });

      // 3. Apply filter operations
      const addOperation = {
        type: FilterChangeType.ADD,
        columnName: 'status',
        values: ['pending'],
        timestamp: Date.now(),
      };

      const afterAdd = applyFilterOperation(
        deserializedState.filters!,
        addOperation,
      );
      expect(afterAdd).toEqual({
        status: ['active', 'inactive', 'pending'],
        region: ['us-east-1', 'us-west-2'],
      });

      // 4. Serialize back to URL
      const newState = {
        ...deserializedState,
        filters: afterAdd,
      } as any;

      const serializedParams = serializeStateToUrlParams(newState, 'nodes');
      expect(serializedParams.filter_status).toBe('active,inactive,pending');
      expect(serializedParams.filter_region).toBe('us-east-1,us-west-2');
    });
  });

  describe('Race condition prevention', () => {
    it('should handle concurrent filter operations correctly', async () => {
      const manager = new FilterStateManager();
      const results: any[] = [];

      manager.addChangeListener((event) => {
        results.push({
          operation: event.operation.type,
          filters: { ...event.newFilters },
        });
      });

      // Simulate rapid concurrent operations
      manager.setFilter('status', ['active']);
      manager.setFilter('region', ['us-east-1']);
      manager.addToFilter('status', ['inactive']);
      manager.removeFromFilter('region', ['us-east-1']);
      manager.setFilter('protocol', ['http']);

      // All operations should be queued
      expect(results).toHaveLength(0);

      // Flush should execute all operations in order
      manager.flush();

      expect(results).toHaveLength(1); // Only one final event
      expect(results[0].filters).toEqual({
        status: ['active', 'inactive'],
        protocol: ['http'],
        // region should be empty after remove operation
      });

      manager.destroy();
    });

    it('should prevent filter state corruption during rapid changes', () => {
      const manager = new FilterStateManager();
      let eventCount = 0;

      manager.addChangeListener(() => {
        eventCount++;
      });

      // Simulate very rapid changes
      for (let i = 0; i < 100; i++) {
        manager.setFilter('status', [`value${i}`]);
      }

      // Should still be debounced
      expect(eventCount).toBe(0);

      manager.flush();

      // Should have only one event with the final value
      expect(eventCount).toBe(1);
      expect(manager.getFilters()).toEqual({
        status: ['value99'],
      });

      manager.destroy();
    });
  });
});
