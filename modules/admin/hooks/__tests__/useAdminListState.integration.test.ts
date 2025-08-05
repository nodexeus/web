import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminListState } from '../useAdminListState';
import { SortOrder } from '@generated/blockjoy/common/v1/search';

// Mock Next.js router
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  pathname: '/admin',
  query: { name: 'nodes', page: '1' },
  asPath: '/admin?name=nodes&page=1',
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

// Mock Recoil
const mockAdminSettings = {
  nodes: {
    columns: [],
    pageSize: 24,
    sort: {
      field: 1,
      order: SortOrder.SORT_ORDER_UNSPECIFIED,
    },
  },
};

vi.mock('recoil', () => ({
  useRecoilValue: vi.fn(() => mockAdminSettings),
}));

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
  vi.clearAllTimers();
});

const defaultConfig = {
  defaultPageSize: 24,
  defaultSortField: 1,
  defaultSortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
  initialFilters: {},
};

const defaultSyncOptions = {
  syncToUrl: true,
  syncToSettings: true,
  urlDebounceMs: 100, // Shorter for testing
  settingsDebounceMs: 100,
};

describe('useAdminListState Integration Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRouter.query = { name: 'nodes', page: '1' };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('State Initialization and URL Restoration', () => {
    it('should initialize with default state when no URL parameters', () => {
      mockRouter.query = { name: 'nodes' };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      expect(result.current.state).toEqual({
        search: '',
        page: 1,
        pageSize: 24,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
        filters: {},
        isLoading: false,
        error: null,
      });
    });

    it('should restore state from URL parameters on initialization', () => {
      mockRouter.query = {
        name: 'nodes',
        page: '3',
        pageSize: '48',
        search: 'test search',
        sortField: '2',
        sortOrder: '1',
        filter_status: 'active,pending',
        filter_region: 'us-east-1',
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      expect(result.current.state).toEqual({
        search: 'test search',
        page: 3,
        pageSize: 48,
        sortField: 2,
        sortOrder: 1,
        filters: {
          status: ['active', 'pending'],
          region: ['us-east-1'],
        },
        isLoading: false,
        error: null,
      });
    });

    it('should handle invalid URL parameters gracefully', () => {
      mockRouter.query = {
        name: 'nodes',
        page: 'invalid',
        pageSize: '-5',
        sortField: 'not_a_number',
        filter_status: '',
        filter_123invalid: 'value',
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Should use defaults for invalid values
      expect(result.current.state.page).toBe(1);
      expect(result.current.state.pageSize).toBe(24);
      expect(result.current.state.sortField).toBe(1);
      expect(result.current.state.filters).toEqual({});
    });

    it('should merge URL parameters with settings correctly', () => {
      // Mock settings with some values
      mockAdminSettings.nodes.pageSize = 48;
      mockAdminSettings.nodes.sort = {
        field: 2,
        order: SortOrder.SORT_ORDER_DESCENDING,
      };

      // URL has some different values
      mockRouter.query = {
        name: 'nodes',
        page: '2',
        filter_status: 'active',
      };

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Should merge correctly with URL taking precedence
      expect(result.current.state).toEqual({
        search: '',
        page: 2, // From URL
        pageSize: 48, // From settings
        sortField: 2, // From settings
        sortOrder: SortOrder.SORT_ORDER_DESCENDING, // From settings
        filters: {
          status: ['active'], // From URL
        },
        isLoading: false,
        error: null,
      });
    });
  });

  describe('URL Synchronization', () => {
    it('should update URL when search changes', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      act(() => {
        result.current.actions.setSearch('test search');
      });

      // Fast-forward timers to trigger debounced URL update
      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          {
            pathname: '/admin',
            query: {
              name: 'nodes',
              search: 'test search',
            },
          },
          undefined,
          { shallow: true },
        );
      });
    });

    it('should update URL when page changes', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      act(() => {
        result.current.actions.setPage(3);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          {
            pathname: '/admin',
            query: {
              name: 'nodes',
              page: 3,
            },
          },
          undefined,
          { shallow: true },
        );
      });
    });

    it('should update URL when page size changes', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      act(() => {
        result.current.actions.setPageSize(48);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          {
            pathname: '/admin',
            query: {
              name: 'nodes',
              pageSize: 48,
            },
          },
          undefined,
          { shallow: true },
        );
      });
    });

    it('should update URL when filters change', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      act(() => {
        result.current.actions.setFilters('status', ['active', 'pending']);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          {
            pathname: '/admin',
            query: {
              name: 'nodes',
              filter_status: 'active,pending',
            },
          },
          undefined,
          { shallow: true },
        );
      });
    });

    it('should update URL when sort changes', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      act(() => {
        result.current.actions.setSort(2, SortOrder.SORT_ORDER_ASCENDING);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          {
            pathname: '/admin',
            query: {
              name: 'nodes',
              sortField: 2,
              sortOrder: SortOrder.SORT_ORDER_ASCENDING,
            },
          },
          undefined,
          { shallow: true },
        );
      });
    });

    it('should debounce rapid URL updates', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Make multiple rapid changes
      act(() => {
        result.current.actions.setSearch('test1');
        result.current.actions.setSearch('test2');
        result.current.actions.setSearch('test3');
      });

      // Should not update URL immediately
      expect(mockPush).not.toHaveBeenCalled();

      // Fast-forward timers
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should only make one URL update with final state
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith(
          {
            pathname: '/admin',
            query: {
              name: 'nodes',
              search: 'test3',
            },
          },
          undefined,
          { shallow: true },
        );
      });
    });

    it('should handle URL update errors gracefully', async () => {
      // Mock router.push to fail
      mockPush.mockRejectedValue(new Error('Navigation failed'));

      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      act(() => {
        result.current.actions.setSearch('test');
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should set error state
      await waitFor(() => {
        expect(result.current.state.error).toContain('Failed to update URL');
      });
    });

    it('should not update URL when syncToUrl is disabled', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, {
          ...defaultSyncOptions,
          syncToUrl: false,
        }),
      );

      act(() => {
        result.current.actions.setSearch('test');
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should omit default values from URL to keep it clean', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set values that are defaults
      act(() => {
        result.current.actions.setPage(1);
        result.current.actions.setPageSize(24);
        result.current.actions.setSort(1, SortOrder.SORT_ORDER_UNSPECIFIED);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should only include the list name
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          {
            pathname: '/admin',
            query: {
              name: 'nodes',
            },
          },
          undefined,
          { shallow: true },
        );
      });
    });
  });

  describe('Browser Navigation Support', () => {
    it('should handle browser back navigation', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set some state
      act(() => {
        result.current.actions.setSearch('test');
        result.current.actions.setPage(2);
      });

      // Simulate browser back navigation
      act(() => {
        mockRouter.query = { name: 'nodes' };
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Should restore state from URL
      await waitFor(() => {
        expect(result.current.state.search).toBe('');
        expect(result.current.state.page).toBe(1);
      });
    });

    it('should handle browser forward navigation', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Start with some state
      act(() => {
        result.current.actions.setSearch('test');
      });

      // Simulate going back
      act(() => {
        mockRouter.query = { name: 'nodes' };
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Then forward again
      act(() => {
        mockRouter.query = { name: 'nodes', search: 'test' };
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Should restore forward state
      await waitFor(() => {
        expect(result.current.state.search).toBe('test');
      });
    });

    it('should validate restored state from navigation', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Simulate navigation to invalid state
      act(() => {
        mockRouter.query = {
          name: 'nodes',
          page: 'invalid',
          pageSize: '-5',
        };
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Should use defaults for invalid values
      await waitFor(() => {
        expect(result.current.state.page).toBe(1);
        expect(result.current.state.pageSize).toBe(24);
      });
    });
  });

  describe('Filter State Management Integration', () => {
    it('should handle complex filter operations', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set initial filters
      act(() => {
        result.current.actions.setBulkFilters({
          status: ['active', 'pending'],
          region: ['us-east-1'],
        });
      });

      expect(result.current.state.filters).toEqual({
        status: ['active', 'pending'],
        region: ['us-east-1'],
      });

      // Add to existing filter
      act(() => {
        result.current.actions.addToFilter('status', ['inactive']);
      });

      expect(result.current.state.filters.status).toEqual([
        'active',
        'pending',
        'inactive',
      ]);

      // Remove from filter
      act(() => {
        result.current.actions.removeFromFilter('status', ['pending']);
      });

      expect(result.current.state.filters.status).toEqual([
        'active',
        'inactive',
      ]);

      // Clear specific filter
      act(() => {
        result.current.actions.clearColumnFilter('status');
      });

      expect(result.current.state.filters).toEqual({
        region: ['us-east-1'],
      });

      // Clear all filters
      act(() => {
        result.current.actions.clearFilters();
      });

      expect(result.current.state.filters).toEqual({});
    });

    it('should reset page when filters change', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set page to 3
      act(() => {
        result.current.actions.setPage(3);
      });

      expect(result.current.state.page).toBe(3);

      // Apply filter
      act(() => {
        result.current.actions.setFilters('status', ['active']);
      });

      // Should reset to page 1
      expect(result.current.state.page).toBe(1);
    });

    it('should normalize filter values', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set filters with duplicates and empty values
      act(() => {
        result.current.actions.setBulkFilters({
          status: ['active', 'active', '', 'pending', '   ', 'active'],
          region: ['', '   '],
        });
      });

      // Should normalize filters
      expect(result.current.state.filters).toEqual({
        status: ['active', 'pending'], // Deduplicated and cleaned
        // region should be omitted as it has no valid values
      });
    });
  });

  describe('Pagination State Management Integration', () => {
    it('should handle page size changes with boundary validation', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set page to 5
      act(() => {
        result.current.actions.setPage(5);
      });

      // Change page size (should reset to page 1)
      act(() => {
        result.current.actions.setPageSize(48);
      });

      expect(result.current.state.page).toBe(1);
      expect(result.current.state.pageSize).toBe(48);
    });

    it('should validate page boundaries', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Test page validation with total items
      const validatedPage = result.current.helpers.validatePage(100); // 100 total items
      expect(validatedPage).toBe(1); // Current page 1 is valid

      // Set page to 10
      act(() => {
        result.current.actions.setPage(10);
      });

      // Validate with fewer total items
      const correctedPage = result.current.helpers.validatePage(50); // Only 50 items
      expect(correctedPage).toBe(3); // Should correct to last valid page
    });

    it('should provide pagination information', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set specific pagination state
      act(() => {
        result.current.actions.setPage(3);
        result.current.actions.setPageSize(24);
      });

      const paginationInfo = result.current.helpers.getPaginationInfo(100);

      expect(paginationInfo).toEqual({
        currentPage: 3,
        pageSize: 24,
        totalItems: 100,
        totalPages: 5,
        startIndex: 48, // (3-1) * 24
        endIndex: 71, // min(48 + 24 - 1, 99)
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });

  describe('Helper Functions Integration', () => {
    it('should provide accurate filter information', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set some filters
      act(() => {
        result.current.actions.setBulkFilters({
          status: ['active', 'pending'],
          region: ['us-east-1'],
        });
      });

      // Test helper functions
      expect(result.current.helpers.getActiveFilterCount()).toBe(3); // 2 + 1
      expect(result.current.helpers.isFilterActive('status')).toBe(true);
      expect(result.current.helpers.isFilterActive('status', 'active')).toBe(
        true,
      );
      expect(result.current.helpers.isFilterActive('status', 'inactive')).toBe(
        false,
      );
      expect(result.current.helpers.isFilterActive('protocol')).toBe(false);
    });

    it('should provide query parameters for API calls', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set various state values
      act(() => {
        result.current.actions.setSearch('test');
        result.current.actions.setPage(2);
        result.current.actions.setPageSize(48);
        result.current.actions.setSort(3, SortOrder.SORT_ORDER_DESCENDING);
        result.current.actions.setBulkFilters({
          status: ['active'],
          region: ['us-east-1'],
        });
      });

      const queryParams = result.current.helpers.getQueryParams();

      expect(queryParams).toEqual({
        search: 'test',
        page: 2,
        pageSize: 48,
        sortField: 3,
        sortOrder: SortOrder.SORT_ORDER_DESCENDING,
        filters: {
          status: ['active'],
          region: ['us-east-1'],
        },
      });
    });

    it('should handle state restoration from URL', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Change router query to simulate navigation
      mockRouter.query = {
        name: 'nodes',
        page: '3',
        search: 'restored',
        filter_status: 'active',
      };

      // Restore from URL
      const restoreResult = result.current.helpers.restoreFromUrl();

      expect(restoreResult.success).toBe(true);
      expect(result.current.state.page).toBe(3);
      expect(result.current.state.search).toBe('restored');
      expect(result.current.state.filters.status).toEqual(['active']);
    });

    it('should handle URL validation', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set invalid URL parameters
      mockRouter.query = {
        name: 'nodes',
        page: 'invalid',
        pageSize: '-5',
      };

      const validation = result.current.helpers.validateCurrentUrl();

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should clear URL parameters', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      result.current.helpers.clearUrlParams();

      expect(mockPush).toHaveBeenCalledWith(
        {
          pathname: '/admin',
          query: { name: 'nodes' },
        },
        undefined,
        { shallow: true },
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle state synchronization errors', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Mock router to throw error
      mockPush.mockRejectedValue(new Error('Router error'));

      act(() => {
        result.current.actions.setSearch('test');
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should set error state
      await waitFor(() => {
        expect(result.current.state.error).toContain('Failed to update URL');
      });

      // Should be able to clear error
      act(() => {
        result.current.actions.setError(null);
      });

      expect(result.current.state.error).toBe(null);
    });

    it('should handle invalid state updates gracefully', () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Try to set invalid values
      act(() => {
        result.current.actions.setPage(-5);
        result.current.actions.setPageSize(0);
      });

      // Should correct invalid values
      expect(result.current.state.page).toBe(1); // Corrected to minimum
      expect(result.current.state.pageSize).toBe(1); // Corrected to minimum
    });

    it('should maintain state consistency during errors', async () => {
      const { result } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Set initial state
      act(() => {
        result.current.actions.setSearch('initial');
        result.current.actions.setPage(2);
      });

      // Mock router to fail
      mockPush.mockRejectedValue(new Error('Router error'));

      // Try to update state
      act(() => {
        result.current.actions.setSearch('updated');
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // State should still be updated even if URL sync fails
      expect(result.current.state.search).toBe('updated');
      expect(result.current.state.page).toBe(2);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup resources on unmount', () => {
      const { unmount } = renderHook(() =>
        useAdminListState('nodes', defaultConfig, defaultSyncOptions),
      );

      // Unmount should not throw errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid mount/unmount cycles', () => {
      // Mount and unmount multiple times rapidly
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderHook(() =>
          useAdminListState('nodes', defaultConfig, defaultSyncOptions),
        );
        unmount();
      }

      // Should not cause memory leaks or errors
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });
});
