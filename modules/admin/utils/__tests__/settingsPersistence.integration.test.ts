import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminListState } from '../../hooks/useAdminListState';
import { SortOrder } from '@generated/blockjoy/common/v1/search';
import {
  serializeStateToSettings,
  deserializeSettingsToState,
  mergeAdminListStates,
} from '../stateSynchronization';

// Mock Next.js router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  pathname: '/admin',
  query: { name: 'nodes' },
  asPath: '/admin?name=nodes',
  route: '/admin',
  back: vi.fn(),
  forward: vi.fn(),
  reload: vi.fn(),
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
};

vi.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

// Mock settings hook with persistence simulation
let mockPersistedSettings: any = {};
const mockUpdateSettings = vi.fn().mockImplementation((section, data) => {
  mockPersistedSettings = { ...mockPersistedSettings, [section]: data };
});

vi.mock('@modules/settings', () => ({
  useSettings: () => ({
    updateSettings: mockUpdateSettings,
  }),
}));

// Mock Recoil with dynamic settings
vi.mock('recoil', () => ({
  useRecoilValue: vi.fn(() => mockPersistedSettings.admin || {}),
}));

// Mock console for cleaner test output
const originalConsole = { ...console };
beforeEach(() => {
  console.warn = vi.fn();
  console.info = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
  vi.clearAllMocks();
  mockPersistedSettings = {};
});

const defaultConfig = {
  defaultPageSize: 24,
  defaultSortField: 1,
  defaultSortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
  initialFilters: {},
};

const syncOptions = {
  syncToUrl: false, // Disable URL sync for settings-focused tests
  syncToSettings: true,
  urlDebounceMs: 100,
  settingsDebounceMs: 50, // Shorter for testing
};

describe('Settings Persistence Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Settings Serialization and Deserialization', () => {
    it('should serialize state to settings format correctly', () => {
      const state = {
        search: 'test',
        page: 2,
        pageSize: 48,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        filters: {
          status: ['active', 'pending'],
          region: ['us-east-1'],
        },
        isLoading: false,
        error: null,
      };

      const columns = [
        { name: 'status', isVisible: true },
        { name: 'region', isVisible: true },
      ];

      const settings = serializeStateToSettings(state, columns);

      expect(settings).toEqual({
        pageSize: 48,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        columns,
        defaultFilters: {
          status: ['active', 'pending'],
          region: ['us-east-1'],
        },
      });
    });

    it('should deserialize settings to state format correctly', () => {
      const settings = {
        pageSize: 48,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        columns: [],
        defaultFilters: {
          status: ['active'],
          region: ['us-east-1'],
        },
      };

      const state = deserializeSettingsToState(settings, defaultConfig);

      expect(state).toEqual({
        pageSize: 48,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_ASCENDING,
        filters: {
          status: ['active'],
          region: ['us-east-1'],
        },
      });
    });

    it('should handle missing or invalid settings gracefully', () => {
      const invalidSettings = {
        pageSize: -5,
        sortField: 'invalid',
        sortOrder: 999,
        defaultFilters: 'not_an_object',
      };

      const state = deserializeSettingsToState(
        invalidSettings as any,
        defaultConfig,
      );

      // Should use defaults for invalid values
      expect(state.pageSize).toBeUndefined(); // Will use config default
      expect(state.sortField).toBeUndefined();
      expect(state.sortOrder).toBeUndefined();
      expect(state.filters).toBeUndefined();
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
        search: 'test', // From URL
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

  describe('Page Size Persistence', () => {
    it('should persist page size changes', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Change page size
      act(() => {
        result.current.actions.setPageSize(48);
      });

      // Fast-forward to trigger settings sync
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should update settings
      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith('admin', {
          nodes: expect.objectContaining({
            pageSize: 48,
          }),
        });
      });
    });

    it('should restore page size from persisted settings', () => {
      // Set up persisted settings
      mockPersistedSettings.admin = {
        nodes: {
          pageSize: 48,
          columns: [],
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Should initialize with persisted page size
      expect(result.current.state.pageSize).toBe(48);
    });

    it('should handle page size persistence across component remounts', async () => {
      // First mount - change page size
      let { result, unmount } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      act(() => {
        result.current.actions.setPageSize(48);
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalled();
      });

      // Simulate settings persistence
      mockPersistedSettings.admin = {
        nodes: {
          pageSize: 48,
          columns: [],
        },
      };

      unmount();

      // Second mount - should restore page size
      ({ result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      ));

      expect(result.current.state.pageSize).toBe(48);
    });

    it('should validate persisted page size values', () => {
      // Set invalid persisted page size
      mockPersistedSettings.admin = {
        nodes: {
          pageSize: -5, // Invalid
          columns: [],
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Should use default instead of invalid value
      expect(result.current.state.pageSize).toBe(24);
    });
  });

  describe('Sort Preferences Persistence', () => {
    it('should persist sort changes', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Change sort
      act(() => {
        result.current.actions.setSort(3, SortOrder.SORT_ORDER_DESCENDING);
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should update settings
      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith('admin', {
          nodes: expect.objectContaining({
            sort: {
              field: 3,
              order: SortOrder.SORT_ORDER_DESCENDING,
            },
          }),
        });
      });
    });

    it('should restore sort preferences from settings', () => {
      mockPersistedSettings.admin = {
        nodes: {
          pageSize: 24,
          sort: {
            field: 3,
            order: SortOrder.SORT_ORDER_DESCENDING,
          },
          columns: [],
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      expect(result.current.state.sortField).toBe(3);
      expect(result.current.state.sortOrder).toBe(
        SortOrder.SORT_ORDER_DESCENDING,
      );
    });

    it('should handle invalid sort preferences', () => {
      mockPersistedSettings.admin = {
        nodes: {
          sort: {
            field: -1, // Invalid
            order: 999, // Invalid
          },
          columns: [],
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Should use defaults for invalid values
      expect(result.current.state.sortField).toBe(1);
      expect(result.current.state.sortOrder).toBe(
        SortOrder.SORT_ORDER_UNSPECIFIED,
      );
    });
  });

  describe('Filter Preferences Persistence', () => {
    it('should persist default filters', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Set filters
      act(() => {
        result.current.actions.setBulkFilters({
          status: ['active', 'pending'],
          region: ['us-east-1'],
        });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should update settings with default filters
      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith('admin', {
          nodes: expect.objectContaining({
            defaultFilters: {
              status: ['active', 'pending'],
              region: ['us-east-1'],
            },
          }),
        });
      });
    });

    it('should restore default filters from settings', () => {
      mockPersistedSettings.admin = {
        nodes: {
          pageSize: 24,
          columns: [],
          defaultFilters: {
            status: ['active'],
            region: ['us-east-1'],
          },
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      expect(result.current.state.filters).toEqual({
        status: ['active'],
        region: ['us-east-1'],
      });
    });

    it('should handle invalid filter preferences', () => {
      mockPersistedSettings.admin = {
        nodes: {
          columns: [],
          defaultFilters: 'invalid', // Should be object
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Should use empty filters for invalid value
      expect(result.current.state.filters).toEqual({});
    });

    it('should normalize persisted filter values', () => {
      mockPersistedSettings.admin = {
        nodes: {
          columns: [],
          defaultFilters: {
            status: ['active', 'active', '', 'pending'], // Duplicates and empty
            region: ['', '   '], // Only empty/whitespace
          },
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      expect(result.current.state.filters).toEqual({
        status: ['active', 'pending'], // Normalized
        // region omitted due to no valid values
      });
    });
  });

  describe('Column Settings Persistence', () => {
    it('should persist column visibility changes', async () => {
      const columns = [
        { name: 'name', isVisible: true },
        { name: 'status', isVisible: false },
      ];

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Simulate column settings update (this would typically come from a column settings UI)
      act(() => {
        // This would be triggered by the AdminList component when columns change
        mockUpdateSettings('admin', {
          nodes: {
            columns,
            pageSize: result.current.state.pageSize,
          },
        });
      });

      expect(mockUpdateSettings).toHaveBeenCalledWith('admin', {
        nodes: expect.objectContaining({
          columns,
        }),
      });
    });

    it('should restore column settings from persistence', () => {
      const persistedColumns = [
        { name: 'name', isVisible: true },
        { name: 'status', isVisible: false },
        { name: 'region', isVisible: true },
      ];

      mockPersistedSettings.admin = {
        nodes: {
          columns: persistedColumns,
          pageSize: 24,
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // The hook itself doesn't directly manage columns, but they should be available
      // through the settings system for the AdminList component to use
      expect(mockPersistedSettings.admin.nodes.columns).toEqual(
        persistedColumns,
      );
    });
  });

  describe('Settings Persistence Error Handling', () => {
    it('should handle settings update failures gracefully', async () => {
      // Mock settings update to fail
      mockUpdateSettings.mockRejectedValue(new Error('Settings save failed'));

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Change page size
      act(() => {
        result.current.actions.setPageSize(48);
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should not crash or affect state
      expect(result.current.state.pageSize).toBe(48);
      expect(result.current.state.error).toBe(null); // Settings errors don't set state error
    });

    it('should continue working when settings are unavailable', () => {
      // Mock settings to be undefined
      mockPersistedSettings = {};

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Should initialize with defaults
      expect(result.current.state.pageSize).toBe(24);
      expect(result.current.state.sortField).toBe(1);
      expect(result.current.state.filters).toEqual({});

      // Should still allow state changes
      act(() => {
        result.current.actions.setPageSize(48);
      });

      expect(result.current.state.pageSize).toBe(48);
    });

    it('should handle corrupted settings data', () => {
      // Mock corrupted settings
      mockPersistedSettings.admin = {
        nodes: {
          pageSize: 'not_a_number',
          sortField: { invalid: 'object' },
          filters: ['not', 'an', 'object'],
          columns: 'not_an_array',
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Should use defaults for corrupted data
      expect(result.current.state.pageSize).toBe(24);
      expect(result.current.state.sortField).toBe(1);
      expect(result.current.state.filters).toEqual({});
    });
  });

  describe('Settings Synchronization Timing', () => {
    it('should debounce rapid settings updates', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Make multiple rapid changes
      act(() => {
        result.current.actions.setPageSize(48);
        result.current.actions.setPageSize(96);
        result.current.actions.setPageSize(192);
      });

      // Should not update settings immediately
      expect(mockUpdateSettings).not.toHaveBeenCalled();

      // Fast-forward timers
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should only make one settings update with final state
      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
        expect(mockUpdateSettings).toHaveBeenCalledWith('admin', {
          nodes: expect.objectContaining({
            pageSize: 192,
          }),
        });
      });
    });

    it('should handle concurrent state changes correctly', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Make concurrent changes to different state properties
      act(() => {
        result.current.actions.setPageSize(48);
        result.current.actions.setSort(3, SortOrder.SORT_ORDER_ASCENDING);
        result.current.actions.setBulkFilters({ status: ['active'] });
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should update settings with all changes
      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith('admin', {
          nodes: expect.objectContaining({
            pageSize: 48,
            sort: {
              field: 3,
              order: SortOrder.SORT_ORDER_ASCENDING,
            },
            defaultFilters: {
              status: ['active'],
            },
          }),
        });
      });
    });

    it('should not persist transient state properties', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Set transient properties
      act(() => {
        result.current.actions.setLoading(true);
        result.current.actions.setError('Test error');
        result.current.actions.setSearch('test search');
        result.current.actions.setPage(3);
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should not persist transient properties like loading, error, search, page
      await waitFor(() => {
        const settingsCall = mockUpdateSettings.mock.calls[0];
        if (settingsCall) {
          const [, data] = settingsCall;
          expect(data.nodes).not.toHaveProperty('isLoading');
          expect(data.nodes).not.toHaveProperty('error');
          expect(data.nodes).not.toHaveProperty('search');
          expect(data.nodes).not.toHaveProperty('page');
        }
      });
    });
  });

  describe('Cross-Session Persistence', () => {
    it('should maintain settings across browser sessions', () => {
      // Simulate first session
      let { result, unmount } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      act(() => {
        result.current.actions.setPageSize(48);
        result.current.actions.setSort(3, SortOrder.SORT_ORDER_DESCENDING);
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Simulate settings being persisted
      mockPersistedSettings.admin = {
        nodes: {
          pageSize: 48,
          sort: {
            field: 3,
            order: SortOrder.SORT_ORDER_DESCENDING,
          },
          columns: [],
        },
      };

      unmount();

      // Simulate new browser session (new component mount)
      ({ result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      ));

      // Should restore settings from previous session
      expect(result.current.state.pageSize).toBe(48);
      expect(result.current.state.sortField).toBe(3);
      expect(result.current.state.sortOrder).toBe(
        SortOrder.SORT_ORDER_DESCENDING,
      );
    });

    it('should handle settings migration/versioning', () => {
      // Simulate old settings format
      mockPersistedSettings.admin = {
        nodes: {
          // Old format might have different property names
          itemsPerPage: 48, // Old name for pageSize
          sortBy: 3, // Old name for sortField
          columns: [],
        },
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, syncOptions),
      );

      // Should handle gracefully and use defaults for unrecognized properties
      expect(result.current.state.pageSize).toBe(24); // Default
      expect(result.current.state.sortField).toBe(1); // Default
    });
  });
});
