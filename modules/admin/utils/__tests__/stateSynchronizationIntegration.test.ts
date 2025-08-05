import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SortOrder } from '../../../../generated/blockjoy/common/v1/search';
import {
  serializeStateToUrlParams,
  deserializeUrlParamsToState,
  serializeStateToSettings,
  deserializeSettingsToState,
  mergeAdminListStates,
  validateAdminListState,
  StateSyncDebouncer,
} from '../stateSynchronization';
import { afterEach } from 'node:test';

// Mock types
const mockConfig = {
  defaultPageSize: 24,
  defaultSortField: 1,
  defaultSortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
  initialFilters: {},
};

describe('State Synchronization Integration Tests', () => {
  describe('Complete URL round-trip synchronization', () => {
    it('should maintain state integrity through URL serialization/deserialization', () => {
      const originalState = {
        search: 'test query',
        page: 3,
        pageSize: 50,
        sortField: 2,
        sortOrder: SortOrder.SORT_ORDER_DESC,
        filters: {
          status: ['active', 'pending'],
          type: ['node', 'host'],
          region: ['us-east-1'],
        },
        isLoading: false,
        error: null,
      };

      // Serialize to URL
      const urlParams = serializeStateToUrlParams(originalState, 'nodes');

      // Deserialize back to state
      const deserializedState = deserializeUrlParamsToState(
        urlParams,
        mockConfig,
      );

      // Validate the round-trip
      expect(deserializedState.search).toBe(originalState.search);
      expect(deserializedState.page).toBe(originalState.page);
      expect(deserializedState.pageSize).toBe(originalState.pageSize);
      expect(deserializedState.sortField).toBe(originalState.sortField);
      expect(deserializedState.sortOrder).toBe(originalState.sortOrder);
      expect(deserializedState.filters).toEqual(originalState.filters);
    });

    it('should handle edge cases in URL round-trip', () => {
      const edgeCaseState = {
        search: '',
        page: 1,
        pageSize: 24, // Default value
        sortField: 0,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {},
        isLoading: true,
        error: 'Test error',
      };

      const urlParams = serializeStateToUrlParams(edgeCaseState, 'nodes');
      const deserializedState = deserializeUrlParamsToState(
        urlParams,
        mockConfig,
      );

      // Should only have the list name since all other values are defaults
      expect(urlParams).toEqual({ name: 'nodes' });
      expect(Object.keys(deserializedState)).toHaveLength(0);
    });
  });

  describe('Complete Settings round-trip synchronization', () => {
    it('should maintain state integrity through settings serialization/deserialization', () => {
      const originalState = {
        search: 'ignored in settings',
        page: 999, // Ignored in settings
        pageSize: 100,
        sortField: 5,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        filters: {
          environment: ['production', 'staging'],
          version: ['v1.2.3'],
        },
        isLoading: false,
        error: null,
      };

      const mockColumns = [
        { name: 'status', isVisible: true },
        { name: 'type', isVisible: false },
      ];

      // Serialize to settings
      const settingsData = serializeStateToSettings(originalState, mockColumns);

      // Deserialize back to state
      const deserializedState = deserializeSettingsToState(
        settingsData,
        mockConfig,
      );

      // Validate the round-trip (only persistent fields)
      expect(deserializedState.pageSize).toBe(originalState.pageSize);
      expect(deserializedState.sortField).toBe(originalState.sortField);
      expect(deserializedState.sortOrder).toBe(originalState.sortOrder);
      expect(deserializedState.filters).toEqual(originalState.filters);

      // Verify settings structure
      expect(settingsData.columns).toEqual(mockColumns);
      expect(settingsData.defaultFilters).toEqual(originalState.filters);
    });

    it('should handle invalid settings gracefully', () => {
      const invalidSettings = {
        pageSize: -100,
        sortField: -5,
        sortOrder: 999,
        columns: [],
        defaultFilters: 'not an object',
      };

      const deserializedState = deserializeSettingsToState(
        invalidSettings as any,
        mockConfig,
      );

      // Should return empty state for invalid values
      expect(Object.keys(deserializedState)).toHaveLength(0);
    });
  });

  describe('Multi-source state merging', () => {
    it('should correctly merge state from URL, settings, and defaults with proper priority', () => {
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

      // Settings provide persistent preferences
      const settingsState = {
        pageSize: 50,
        sortField: 2,
        sortOrder: 1, // SortOrder.SORT_ORDER_ASC
        filters: {
          defaultFilter: ['default_value'],
        },
      };

      // URL provides current session state (highest priority)
      const urlState = {
        page: 3,
        search: 'current search',
        filters: {
          sessionFilter: ['session_value'],
          defaultFilter: ['overridden_value'], // Should override settings
        },
      };

      const mergedState = mergeAdminListStates(
        baseState,
        settingsState,
        urlState,
      );

      expect(mergedState).toEqual({
        search: 'current search', // From URL
        page: 3, // From URL
        pageSize: 50, // From settings
        sortField: 2, // From settings
        sortOrder: 1, // SortOrder.SORT_ORDER_ASC from settings
        filters: {
          defaultFilter: ['overridden_value'], // URL overrides settings
          sessionFilter: ['session_value'], // From URL
        },
        isLoading: false, // From base
        error: null, // From base
      });
    });

    it('should validate merged state and correct invalid values', () => {
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

      const invalidPartialState = {
        page: -5, // Invalid
        pageSize: 2000, // Too large
        search: 'a'.repeat(1000), // Too long
        filters: {
          'invalid-column!': ['value'], // Invalid column name
          validColumn: ['valid_value'],
        },
      };

      const mergedState = mergeAdminListStates(baseState, invalidPartialState);
      const validatedState = validateAdminListState(mergedState, mockConfig);

      expect(validatedState.page).toBe(1); // Reset to default
      expect(validatedState.pageSize).toBe(24); // Reset to default since 2000 is invalid
      expect(validatedState.search).toBe(''); // Reset to default
      expect(validatedState.filters).toEqual({
        validColumn: ['valid_value'], // Only valid filter remains
      });
    });
  });

  describe('Real-world workflow simulation', () => {
    it('should handle a complete user workflow with state synchronization', () => {
      // 1. User loads page with URL parameters
      const initialUrlParams = {
        name: 'nodes',
        page: '2',
        search: 'production',
        filter_status: 'active,running',
        filter_region: 'us-west-2',
      };

      let currentState = deserializeUrlParamsToState(
        initialUrlParams,
        mockConfig,
      );
      expect(currentState.page).toBe(2);
      expect(currentState.search).toBe('production');
      expect(currentState.filters).toEqual({
        status: ['active', 'running'],
        region: ['us-west-2'],
      });

      // 2. User changes page size (should reset page to 1)
      const stateAfterPageSizeChange = mergeAdminListStates(
        { ...mockConfig, ...currentState } as any,
        { pageSize: 100, page: 1 },
      );

      expect(stateAfterPageSizeChange.pageSize).toBe(100);
      expect(stateAfterPageSizeChange.page).toBe(1);

      // 3. User adds another filter
      const stateAfterFilterAdd = mergeAdminListStates(
        stateAfterPageSizeChange,
        {
          filters: {
            ...stateAfterPageSizeChange.filters,
            type: ['node'],
          },
        },
      );

      expect(stateAfterFilterAdd.filters).toEqual({
        status: ['active', 'running'],
        region: ['us-west-2'],
        type: ['node'],
      });

      // 4. Serialize final state to URL for bookmarking
      const finalUrlParams = serializeStateToUrlParams(
        stateAfterFilterAdd,
        'nodes',
      );

      expect(finalUrlParams).toEqual({
        name: 'nodes',
        pageSize: 100,
        search: 'production',
        filter_status: 'active,running',
        filter_region: 'us-west-2',
        filter_type: 'node',
      });

      // 5. Serialize to settings for persistence
      const settingsData = serializeStateToSettings(stateAfterFilterAdd, []);

      expect(settingsData.pageSize).toBe(100);
      expect(settingsData.defaultFilters).toEqual({
        status: ['active', 'running'],
        region: ['us-west-2'],
        type: ['node'],
      });
    });
  });

  describe('StateSyncDebouncer integration', () => {
    let debouncer: StateSyncDebouncer;

    beforeEach(() => {
      debouncer = new StateSyncDebouncer();
      vi.useFakeTimers();
    });

    afterEach(() => {
      debouncer.destroy();
      vi.useRealTimers();
    });

    it('should coordinate multiple synchronization operations', () => {
      const urlSyncFn = vi.fn();
      const settingsSyncFn = vi.fn();

      // Simulate rapid state changes
      debouncer.debounce('url-sync', urlSyncFn, 300);
      debouncer.debounce('settings-sync', settingsSyncFn, 1000);

      // More changes before debounce completes
      debouncer.debounce('url-sync', urlSyncFn, 300);
      debouncer.debounce('settings-sync', settingsSyncFn, 1000);

      // URL sync should trigger first
      vi.advanceTimersByTime(300);
      expect(urlSyncFn).toHaveBeenCalledTimes(1);
      expect(settingsSyncFn).not.toHaveBeenCalled();

      // Settings sync should trigger later
      vi.advanceTimersByTime(700);
      expect(settingsSyncFn).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup properly', () => {
      const syncFn = vi.fn();

      debouncer.debounce('test', syncFn, 500);
      debouncer.clear('test');

      vi.advanceTimersByTime(500);
      expect(syncFn).not.toHaveBeenCalled();
    });
  });

  describe('Error handling and recovery', () => {
    it('should handle malformed URL parameters gracefully', () => {
      const malformedParams = {
        name: 'nodes',
        page: 'not_a_number',
        pageSize: null,
        search: undefined,
        sortOrder: 'invalid_enum',
        filter_status: null,
        'filter_invalid!@#$%': 'value',
        filter_empty: '',
      };

      const result = deserializeUrlParamsToState(
        malformedParams as any,
        mockConfig,
      );

      // Should return empty object for all invalid values
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle corrupted settings data gracefully', () => {
      const corruptedSettings = {
        pageSize: 'not_a_number',
        sortField: null,
        sortOrder: undefined,
        columns: 'not_an_array',
        defaultFilters: null,
      };

      const result = deserializeSettingsToState(
        corruptedSettings as any,
        mockConfig,
      );

      // Should return empty object for all invalid values
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should recover from state corruption during merge', () => {
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

      const corruptedState = {
        page: 'corrupted',
        filters: 'not_an_object',
        unknownField: 'should_be_ignored',
      };

      // Should not throw and should maintain base state integrity
      const result = mergeAdminListStates(baseState, corruptedState as any);
      expect(result.search).toBe('');
      expect(result.page).toBe('corrupted'); // Merged as-is, validation happens later
      expect(result.pageSize).toBe(24);
      expect(result.filters).toEqual({}); // Normalized to empty object
    });
  });
});
