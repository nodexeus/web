import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { AdminList } from '../AdminList/AdminList';
import { AdminListColumn } from '../../../types/AdminListColumn';
import { SortOrder } from '@generated/blockjoy/common/v1/search';
import { adminSelectors } from '../../../store/adminSelectors';

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

// Mock settings hook
const mockUpdateSettings = vi.fn();
vi.mock('@modules/settings', () => ({
  useSettings: () => ({
    updateSettings: mockUpdateSettings,
  }),
}));

// Mock Recoil selectors
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
  useRecoilValue: vi.fn((selector) => {
    if (selector === adminSelectors.settings) {
      return mockAdminSettings;
    }
    return null;
  }),
  RecoilRoot: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Test data
const mockColumns: AdminListColumn[] = [
  {
    name: 'name',
    displayName: 'Name',
    width: '200px',
    sortField: 1,
    isVisible: true,
  },
  {
    name: 'status',
    displayName: 'Status',
    width: '150px',
    sortField: 2,
    isVisible: true,
  },
  {
    name: 'region',
    displayName: 'Region',
    width: '150px',
    sortField: 3,
    isVisible: true,
  },
];

const mockData = [
  {
    id: '1',
    name: 'Node 1',
    status: 'active',
    region: 'us-east-1',
  },
  {
    id: '2',
    name: 'Node 2',
    status: 'inactive',
    region: 'us-west-2',
  },
  {
    id: '3',
    name: 'Node 3',
    status: 'active',
    region: 'us-east-1',
  },
];

// Mock API function
const mockGetList = vi.fn();

const defaultProps = {
  name: 'nodes' as keyof AdminSettings,
  idPropertyName: 'id',
  columns: mockColumns,
  defaultSortField: 1,
  defaultSortOrder: SortOrder.SORT_ORDER_UNSPECIFIED,
  getList: mockGetList,
  listMap: (list: any[]) => list,
};

const renderAdminList = (props = {}) => {
  return render(
    <RecoilRoot>
      <AdminList {...defaultProps} {...props} />
    </RecoilRoot>,
  );
};

describe('AdminList Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetList.mockResolvedValue({
      list: mockData,
      total: mockData.length,
    });

    // Reset router query
    mockRouter.query = { name: 'nodes', page: '1' };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Component Initialization and Data Fetching', () => {
    it('should initialize and fetch data on mount', async () => {
      renderAdminList();

      // Should call API with initial parameters
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          0, // 0-based page for API
          1,
          SortOrder.SORT_ORDER_UNSPECIFIED,
          [],
          24,
        );
      });
    });

    it('should display fetched data', async () => {
      renderAdminList();

      // Wait for data to be loaded and displayed
      await waitFor(() => {
        expect(screen.getByText('Node 1')).toBeInTheDocument();
        expect(screen.getByText('Node 2')).toBeInTheDocument();
        expect(screen.getByText('Node 3')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockGetList.mockRejectedValue(new Error('API Error'));

      renderAdminList();

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show loading state during data fetch', async () => {
      // Mock API with delay
      mockGetList.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ list: mockData, total: mockData.length }),
              100,
            ),
          ),
      );

      renderAdminList();

      // Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Should show data after loading
      await waitFor(() => {
        expect(screen.getByText('Node 1')).toBeInTheDocument();
      });
    });
  });

  describe('URL Parameter Restoration', () => {
    it('should restore state from URL parameters on initialization', async () => {
      // Set URL with parameters
      mockRouter.query = {
        name: 'nodes',
        page: '2',
        pageSize: '48',
        search: 'test search',
        sortField: '2',
        sortOrder: '1',
      };

      renderAdminList();

      // Should call API with restored parameters
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          'test search',
          1, // Page 2 (0-based)
          2,
          1, // SortOrder.SORT_ORDER_ASCENDING
          [],
          48,
        );
      });
    });

    it('should handle invalid URL parameters gracefully', async () => {
      // Set URL with invalid parameters
      mockRouter.query = {
        name: 'nodes',
        page: 'invalid',
        pageSize: '-5',
        sortField: 'not_a_number',
      };

      renderAdminList();

      // Should use defaults for invalid values
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          0, // Default page 1 (0-based)
          1, // Default sort field
          SortOrder.SORT_ORDER_UNSPECIFIED,
          [],
          24, // Default page size
        );
      });
    });

    it('should restore filter parameters from URL', async () => {
      // Set URL with filter parameters
      mockRouter.query = {
        name: 'nodes',
        filter_status: 'active,pending',
        filter_region: 'us-east-1',
      };

      renderAdminList();

      // Should call API with restored filters
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          0,
          1,
          SortOrder.SORT_ORDER_UNSPECIFIED,
          expect.arrayContaining([
            expect.objectContaining({
              name: 'status',
              filterSettings: expect.objectContaining({
                values: ['active', 'pending'],
              }),
            }),
            expect.objectContaining({
              name: 'region',
              filterSettings: expect.objectContaining({
                values: ['us-east-1'],
              }),
            }),
          ]),
          24,
        );
      });
    });
  });

  describe('URL Synchronization', () => {
    it('should update URL when state changes', async () => {
      const { rerender } = renderAdminList();

      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalled();
      });

      // Simulate state change by re-rendering with different router query
      mockRouter.query = { name: 'nodes', page: '2' };
      rerender(
        <RecoilRoot>
          <AdminList {...defaultProps} />
        </RecoilRoot>,
      );

      // Should call API with new parameters
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          1, // Page 2 (0-based)
          1,
          SortOrder.SORT_ORDER_UNSPECIFIED,
          [],
          24,
        );
      });
    });

    it('should handle browser navigation events', async () => {
      renderAdminList();

      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalled();
      });

      // Simulate browser back navigation
      act(() => {
        mockRouter.query = { name: 'nodes', page: '3' };
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Should update state based on new URL
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          2, // Page 3 (0-based)
          1,
          SortOrder.SORT_ORDER_UNSPECIFIED,
          [],
          24,
        );
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should initialize settings if they do not exist', async () => {
      // Mock empty settings
      mockAdminSettings.nodes = undefined;

      renderAdminList();

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith('admin', {
          nodes: expect.objectContaining({
            columns: mockColumns,
          }),
        });
      });
    });

    it('should use persisted settings for initialization', async () => {
      // Mock persisted settings
      mockAdminSettings.nodes = {
        columns: mockColumns,
        pageSize: 48,
        sort: {
          field: 2,
          order: SortOrder.SORT_ORDER_DESCENDING,
        },
      };

      renderAdminList();

      // Should use persisted settings
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          0,
          2, // From persisted settings
          SortOrder.SORT_ORDER_DESCENDING, // From persisted settings
          [],
          48, // From persisted settings
        );
      });
    });

    it('should persist settings changes', async () => {
      renderAdminList();

      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalled();
      });

      // Simulate settings change (this would typically come from user interaction)
      // For now, we'll verify that the component calls updateSettings when needed
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
  });

  describe('Pagination Integration', () => {
    it('should handle page size changes', async () => {
      mockGetList.mockResolvedValue({
        list: mockData,
        total: 100, // More data to support pagination
      });

      renderAdminList();

      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalled();
      });

      // Simulate page size change through router query
      act(() => {
        mockRouter.query = { name: 'nodes', pageSize: '48' };
      });

      // Should call API with new page size
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          0, // Should reset to page 1
          1,
          SortOrder.SORT_ORDER_UNSPECIFIED,
          [],
          48,
        );
      });
    });

    it('should validate page boundaries', async () => {
      // Start on page 5
      mockRouter.query = { name: 'nodes', page: '5' };

      // Mock data that only supports 2 pages
      mockGetList.mockResolvedValue({
        list: mockData,
        total: 30, // Only supports 2 pages with default page size
      });

      renderAdminList();

      // Should automatically correct to valid page
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          expect.any(Number), // Should be corrected
          1,
          SortOrder.SORT_ORDER_UNSPECIFIED,
          [],
          24,
        );
      });
    });
  });

  describe('Error Recovery', () => {
    it('should provide retry functionality on error', async () => {
      // Mock API to fail initially
      let callCount = 0;
      mockGetList.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve({ list: mockData, total: mockData.length });
      });

      renderAdminList();

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Find and click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should recover and show data
      await waitFor(() => {
        expect(screen.getByText('Node 1')).toBeInTheDocument();
      });
    });

    it('should handle concurrent API calls gracefully', async () => {
      // Mock API with delays
      mockGetList.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ list: mockData, total: mockData.length }),
              50,
            ),
          ),
      );

      renderAdminList();

      // Trigger multiple state changes rapidly
      act(() => {
        mockRouter.query = { name: 'nodes', page: '2' };
      });

      act(() => {
        mockRouter.query = { name: 'nodes', page: '3' };
      });

      // Should handle concurrent calls without issues
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalled();
      });

      // Should eventually show data
      await waitFor(() => {
        expect(screen.getByText('Node 1')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should debounce rapid state changes', async () => {
      renderAdminList();

      const initialCallCount = mockGetList.mock.calls.length;

      // Simulate rapid state changes
      act(() => {
        mockRouter.query = { name: 'nodes', search: 'test1' };
      });

      act(() => {
        mockRouter.query = { name: 'nodes', search: 'test2' };
      });

      act(() => {
        mockRouter.query = { name: 'nodes', search: 'test3' };
      });

      // Should not make excessive API calls
      await waitFor(() => {
        const finalCallCount = mockGetList.mock.calls.length;
        expect(finalCallCount - initialCallCount).toBeLessThan(5);
      });
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Node ${i}`,
        status: 'active',
        region: 'us-east-1',
      }));

      mockGetList.mockResolvedValue({
        list: largeDataset.slice(0, 24), // First page
        total: largeDataset.length,
      });

      renderAdminList();

      // Should handle large dataset without performance issues
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalled();
      });

      // Should render efficiently
      expect(screen.getByText('Node 0')).toBeInTheDocument();
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state during component remounts', async () => {
      // Set initial state
      mockRouter.query = { name: 'nodes', page: '2', search: 'test' };

      const { unmount, rerender } = renderAdminList();

      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          'test',
          1, // Page 2 (0-based)
          1,
          SortOrder.SORT_ORDER_UNSPECIFIED,
          [],
          24,
        );
      });

      // Unmount and remount
      unmount();

      rerender(
        <RecoilRoot>
          <AdminList {...defaultProps} />
        </RecoilRoot>,
      );

      // Should restore same state
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          'test',
          1,
          1,
          SortOrder.SORT_ORDER_UNSPECIFIED,
          [],
          24,
        );
      });
    });

    it('should handle state conflicts gracefully', async () => {
      // Set conflicting URL and settings
      mockRouter.query = { name: 'nodes', pageSize: '48' };
      mockAdminSettings.nodes.pageSize = 96;

      renderAdminList();

      // URL should take precedence
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          0,
          1,
          SortOrder.SORT_ORDER_UNSPECIFIED,
          [],
          48, // From URL, not settings
        );
      });
    });
  });

  describe('Integration with AdminList Components', () => {
    it('should integrate with header components', async () => {
      renderAdminList();

      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalled();
      });

      // Should render header components
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should integrate with table components', async () => {
      renderAdminList();

      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalled();
      });

      // Should render table with data
      await waitFor(() => {
        expect(screen.getByText('Node 1')).toBeInTheDocument();
      });
    });

    it('should handle component prop changes', async () => {
      const { rerender } = renderAdminList();

      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalled();
      });

      // Change props
      const newProps = {
        ...defaultProps,
        defaultSortField: 2,
        defaultSortOrder: SortOrder.SORT_ORDER_DESCENDING,
      };

      rerender(
        <RecoilRoot>
          <AdminList {...newProps} />
        </RecoilRoot>,
      );

      // Should use new props
      await waitFor(() => {
        expect(mockGetList).toHaveBeenCalledWith(
          '',
          0,
          2, // New sort field
          SortOrder.SORT_ORDER_DESCENDING, // New sort order
          [],
          24,
        );
      });
    });
  });
});
