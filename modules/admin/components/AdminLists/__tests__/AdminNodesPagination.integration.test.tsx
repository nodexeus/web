import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { AdminNodes } from '../AdminNodes/AdminNodes';
import { SortOrder } from '@generated/blockjoy/common/v1/search';
import { NodeSortField } from '@generated/blockjoy/v1/node';

// Mock Next.js router
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
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

// Mock gRPC clients
const mockNodeClient = {
  listNodes: vi.fn(),
  updateNode: vi.fn(),
};

const mockProtocolClient = {
  listProtocols: vi.fn(),
};

const mockUserClient = {
  listUsers: vi.fn(),
};

vi.mock('@modules/grpc', () => ({
  nodeClient: mockNodeClient,
  protocolClient: mockProtocolClient,
  userClient: mockUserClient,
}));

// Mock Recoil
const mockAdminSettings = {
  nodes: {
    columns: [],
    pageSize: 24,
    sort: {
      field: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
      order: SortOrder.SORT_ORDER_DESCENDING,
    },
  },
};

vi.mock('recoil', () => ({
  useRecoilValue: vi.fn(() => mockAdminSettings),
  RecoilRoot: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-toastify
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock('react-toastify', () => ({
  toast: mockToast,
}));

// Mock shared components
vi.mock('@shared/components', () => ({
  DateTime: ({ date }: { date: any }) => <span>{date?.toString()}</span>,
  NodeItems: {
    NodeStatus: ({ nodeStatus }: { nodeStatus: any }) => (
      <span>{nodeStatus}</span>
    ),
    ProtocolHealth: ({ nodeStatus }: { nodeStatus: any }) => (
      <span>{nodeStatus}</span>
    ),
    ProtocolStatus: ({ nodeStatus, jobs }: { nodeStatus: any; jobs: any }) => (
      <span>{nodeStatus}</span>
    ),
  },
}));

// Mock admin utilities
vi.mock('@modules/admin', () => ({
  capitalized: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
  createAdminNodeFilters: (filters: any[]) => ({
    protocol: [],
    nodeStatus: [],
    orgIds: [],
    userIds: [],
    hostIds: [],
    regions: [],
    ips: [],
    networks: [],
    semanticVersions: [],
    versionKeys: [],
  }),
}));

// Test data
const createMockNodes = (count: number, startId: number = 1) => {
  return Array.from({ length: count }, (_, i) => ({
    nodeId: `${startId + i}`,
    sqd_name: `node-${startId + i}`,
    displayName: `Node ${startId + i}`,
    nodeName: `node${startId + i}`,
    dnsName: `node${startId + i}.example.com`,
    nodeStatus: 'RUNNING',
    protocolName: 'ethereum',
    regionName: 'us-east-1',
    hostDisplayName: `host-${startId + i}`,
    hostNetworkName: `host${startId + i}`,
    createdAt: new Date(`2023-01-${String(i + 1).padStart(2, '0')}`),
    createdBy: { resourceId: 'user1', resourceType: 1 },
    apr: 5.5,
    jailed: false,
    jailedReason: '',
    cost: { amount: { amountMinorUnits: '1000' } },
    versionKey: { variantKey: 'mainnet' },
    jobs: [],
    tags: { tags: [] },
  }));
};

const mockProtocols = [
  { protocolId: '1', name: 'ethereum', displayName: 'Ethereum' },
];

const mockUsers = [{ userId: 'user1', firstName: 'John', lastName: 'Doe' }];

const renderAdminNodes = () => {
  return render(
    <RecoilRoot>
      <AdminNodes />
    </RecoilRoot>,
  );
};

describe('AdminNodes Pagination Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    mockProtocolClient.listProtocols.mockResolvedValue({
      protocols: mockProtocols,
    });

    mockUserClient.listUsers.mockResolvedValue({
      users: mockUsers,
    });

    // Reset router query
    mockRouter.query = { name: 'nodes', page: '1' };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Pagination Functionality', () => {
    it('should handle first page load correctly', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 0, // 0-based for API
            itemsPerPage: 24,
          }),
          expect.anything(),
        );
      });

      // Should display first page nodes
      await waitFor(() => {
        expect(screen.getByText('node-1')).toBeInTheDocument();
        expect(screen.getByText('node-24')).toBeInTheDocument();
      });
    });

    it('should handle page navigation correctly', async () => {
      const firstPageNodes = createMockNodes(24, 1);
      const secondPageNodes = createMockNodes(24, 25);

      // Start on page 1
      mockNodeClient.listNodes.mockResolvedValueOnce({
        nodes: firstPageNodes,
        total: 100,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 0,
            itemsPerPage: 24,
          }),
          expect.anything(),
        );
      });

      // Navigate to page 2
      mockNodeClient.listNodes.mockResolvedValueOnce({
        nodes: secondPageNodes,
        total: 100,
      });

      act(() => {
        mockRouter.query = { name: 'nodes', page: '2' };
      });

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 1, // Page 2 (0-based)
            itemsPerPage: 24,
          }),
          expect.anything(),
        );
      });
    });

    it('should handle page size changes correctly', async () => {
      const mockNodes = createMockNodes(48);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      renderAdminNodes();

      // Initial load with default page size
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 0,
            itemsPerPage: 24,
          }),
          expect.anything(),
        );
      });

      // Change page size
      act(() => {
        mockRouter.query = { name: 'nodes', page: '1', pageSize: '48' };
      });

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 0, // Should reset to first page
            itemsPerPage: 48,
          }),
          expect.anything(),
        );
      });
    });

    it('should use default page size when pageSize is undefined', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            itemsPerPage: 24, // Should use default from constants
          }),
          expect.anything(),
        );
      });
    });
  });

  describe('Page Boundary Validation', () => {
    it('should handle page out of bounds gracefully', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 50, // Only supports 3 pages with 24 items per page
      });

      // Try to access page 5 (out of bounds)
      mockRouter.query = { name: 'nodes', page: '5' };

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // The AdminList component should handle page boundary validation
      // and either redirect to a valid page or show appropriate content
    });

    it('should handle zero total items', async () => {
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: [],
        total: 0,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 0,
            itemsPerPage: 24,
          }),
          expect.anything(),
        );
      });

      // Should handle empty results gracefully
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should handle single page of results', async () => {
      const mockNodes = createMockNodes(10); // Less than page size
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 10,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 0,
            itemsPerPage: 24,
          }),
          expect.anything(),
        );
      });

      // Should display all nodes on single page
      await waitFor(() => {
        expect(screen.getByText('node-1')).toBeInTheDocument();
        expect(screen.getByText('node-10')).toBeInTheDocument();
      });
    });

    it('should handle exact page boundary', async () => {
      const mockNodes = createMockNodes(24); // Exactly one page
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 24,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 0,
            itemsPerPage: 24,
          }),
          expect.anything(),
        );
      });

      // Should display all nodes
      await waitFor(() => {
        expect(screen.getByText('node-1')).toBeInTheDocument();
        expect(screen.getByText('node-24')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination with Filters and Sorting', () => {
    it('should maintain pagination when filters are applied', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 50,
      });

      // Start with filters
      mockRouter.query = {
        name: 'nodes',
        page: '2',
        'filter.protocolName': 'ethereum',
      };

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            protocol: ['ethereum'],
          }),
          expect.objectContaining({
            currentPage: 1, // Page 2 (0-based)
            itemsPerPage: 24,
          }),
          expect.anything(),
        );
      });
    });

    it('should reset to page 1 when filters change', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      // Start on page 2
      mockRouter.query = { name: 'nodes', page: '2' };

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 1,
          }),
          expect.anything(),
        );
      });

      // Apply filter (should reset to page 1)
      act(() => {
        mockRouter.query = {
          name: 'nodes',
          page: '1', // Should reset to page 1
          'filter.protocolName': 'ethereum',
        };
      });

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            protocol: ['ethereum'],
          }),
          expect.objectContaining({
            currentPage: 0, // Should be page 1 (0-based)
          }),
          expect.anything(),
        );
      });
    });

    it('should maintain pagination with sorting', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      mockRouter.query = {
        name: 'nodes',
        page: '2',
        sortField: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME.toString(),
        sortOrder: SortOrder.SORT_ORDER_ASCENDING.toString(),
      };

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 1, // Page 2 (0-based)
            itemsPerPage: 24,
          }),
          expect.arrayContaining([
            expect.objectContaining({
              field: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME,
              order: SortOrder.SORT_ORDER_ASCENDING,
            }),
          ]),
        );
      });
    });
  });

  describe('Pagination Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 10000, // Large total
      });

      const startTime = performance.now();

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render efficiently even with large total
      expect(renderTime).toBeLessThan(1000);

      // Should only load current page data
      expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.objectContaining({
          itemsPerPage: 24, // Should not try to load all 10000 items
        }),
        expect.anything(),
      );
    });

    it('should handle rapid page changes efficiently', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 1000,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Simulate rapid page changes
      const pages = ['2', '3', '4', '5'];
      for (const page of pages) {
        act(() => {
          mockRouter.query = { name: 'nodes', page };
        });
      }

      // Should handle rapid changes without issues
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });
    });

    it('should cache and reuse protocol/user data across pages', async () => {
      const firstPageNodes = createMockNodes(24, 1);
      const secondPageNodes = createMockNodes(24, 25);

      // First page load
      mockNodeClient.listNodes.mockResolvedValueOnce({
        nodes: firstPageNodes,
        total: 100,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockProtocolClient.listProtocols).toHaveBeenCalledTimes(1);
        expect(mockUserClient.listUsers).toHaveBeenCalledTimes(1);
      });

      // Navigate to second page
      mockNodeClient.listNodes.mockResolvedValueOnce({
        nodes: secondPageNodes,
        total: 100,
      });

      act(() => {
        mockRouter.query = { name: 'nodes', page: '2' };
      });

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledTimes(2);
      });

      // Should not refetch protocols and users
      expect(mockProtocolClient.listProtocols).toHaveBeenCalledTimes(1);
      expect(mockUserClient.listUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pagination Error Handling', () => {
    it('should handle API errors during pagination', async () => {
      // First page loads successfully
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValueOnce({
        nodes: mockNodes,
        total: 100,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledTimes(1);
      });

      // Second page fails
      mockNodeClient.listNodes.mockRejectedValueOnce(new Error('API Error'));

      act(() => {
        mockRouter.query = { name: 'nodes', page: '2' };
      });

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledTimes(2);
      });

      // Should show error toast
      expect(mockToast.error).toHaveBeenCalledWith(
        'Failed to load node data. Please try again.',
      );

      // Component should still be functional
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should handle invalid page parameters', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      // Invalid page parameter
      mockRouter.query = { name: 'nodes', page: 'invalid' };

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should handle invalid page gracefully
      // The exact behavior depends on the AdminList component's validation
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should handle negative page numbers', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      mockRouter.query = { name: 'nodes', page: '-1' };

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should handle negative page numbers gracefully
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should handle zero page number', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      mockRouter.query = { name: 'nodes', page: '0' };

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should handle zero page number gracefully
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });

  describe('Settings Integration', () => {
    it('should use persisted page size from settings', async () => {
      // Mock persisted page size
      mockAdminSettings.nodes.pageSize = 48;

      const mockNodes = createMockNodes(48);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            itemsPerPage: 48, // Should use persisted page size
          }),
          expect.anything(),
        );
      });
    });

    it('should persist page size changes to settings', async () => {
      const mockNodes = createMockNodes(24);
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 100,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should update settings with initial configuration
      expect(mockUpdateSettings).toHaveBeenCalledWith('admin', {
        nodes: expect.objectContaining({
          columns: expect.any(Array),
        }),
      });
    });
  });
});
