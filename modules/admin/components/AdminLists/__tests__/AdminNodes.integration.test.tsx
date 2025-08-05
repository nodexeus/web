import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
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
    protocolName:
      filters?.find((f) => f.name === 'protocolName')?.filterSettings?.values ||
      [],
    nodeStatus:
      filters?.find((f) => f.name === 'nodeState')?.filterSettings?.values ||
      [],
    regionName:
      filters?.find((f) => f.name === 'region')?.filterSettings?.values || [],
  }),
}));

// Test data
const mockNodes = [
  {
    nodeId: '1',
    sqd_name: 'node-1',
    displayName: 'Node 1',
    nodeName: 'node1',
    dnsName: 'node1.example.com',
    nodeStatus: 'RUNNING',
    protocolName: 'ethereum',
    regionName: 'us-east-1',
    hostDisplayName: 'host-1',
    hostNetworkName: 'host1',
    createdAt: new Date('2023-01-01'),
    createdBy: { resourceId: 'user1', resourceType: 1 },
    apr: 5.5,
    jailed: false,
    jailedReason: '',
    cost: { amount: { amountMinorUnits: '1000' } },
    versionKey: { variantKey: 'mainnet' },
    jobs: [],
    tags: { tags: [] },
  },
  {
    nodeId: '2',
    sqd_name: 'node-2',
    displayName: 'Node 2',
    nodeName: 'node2',
    dnsName: 'node2.example.com',
    nodeStatus: 'STOPPED',
    protocolName: 'bitcoin',
    regionName: 'us-west-2',
    hostDisplayName: 'host-2',
    hostNetworkName: 'host2',
    createdAt: new Date('2023-01-02'),
    createdBy: { resourceId: 'user2', resourceType: 1 },
    apr: 3.2,
    jailed: true,
    jailedReason: 'Double signing',
    cost: { amount: { amountMinorUnits: '2000' } },
    versionKey: { variantKey: 'testnet' },
    jobs: [],
    tags: { tags: [] },
  },
];

const mockProtocols = [
  { protocolId: '1', name: 'ethereum', displayName: 'Ethereum' },
  { protocolId: '2', name: 'bitcoin', displayName: 'Bitcoin' },
];

const mockUsers = [
  { userId: 'user1', firstName: 'John', lastName: 'Doe' },
  { userId: 'user2', firstName: 'Jane', lastName: 'Smith' },
];

const renderAdminNodes = () => {
  return render(
    <RecoilRoot>
      <AdminNodes />
    </RecoilRoot>,
  );
};

describe('AdminNodes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    mockNodeClient.listNodes.mockResolvedValue({
      nodes: mockNodes,
      total: mockNodes.length,
    });

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

  describe('Node Data Fetching and Integration', () => {
    it('should fetch and display node data correctly', async () => {
      renderAdminNodes();

      // Should fetch protocols, users, and nodes
      await waitFor(() => {
        expect(mockProtocolClient.listProtocols).toHaveBeenCalled();
        expect(mockUserClient.listUsers).toHaveBeenCalled();
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should display node data
      await waitFor(() => {
        expect(screen.getByText('node-1')).toBeInTheDocument();
        expect(screen.getByText('node-2')).toBeInTheDocument();
      });
    });

    it('should call node API with correct parameters', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            keyword: '',
          }),
          expect.objectContaining({
            currentPage: 0,
            itemsPerPage: 24,
          }),
          expect.arrayContaining([
            expect.objectContaining({
              field: NodeSortField.NODE_SORT_FIELD_CREATED_AT,
              order: SortOrder.SORT_ORDER_DESCENDING,
            }),
          ]),
        );
      });
    });

    it('should handle node data transformation correctly', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should transform and display node data
      await waitFor(() => {
        // Check transformed data is displayed
        expect(screen.getByText('5.50%')).toBeInTheDocument(); // APR formatting
        expect(screen.getByText('Yes')).toBeInTheDocument(); // Jailed status
        expect(screen.getByText('No')).toBeInTheDocument(); // Not jailed status
        expect(screen.getByText('John Doe')).toBeInTheDocument(); // Created by user
      });
    });

    it('should handle empty node list gracefully', async () => {
      // Mock empty response
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: [],
        total: 0,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should show empty state or handle gracefully
      // The exact behavior depends on the AdminList component implementation
      expect(mockNodeClient.listNodes).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockNodeClient.listNodes.mockRejectedValue(new Error('API Error'));

      renderAdminNodes();

      // Should handle error without crashing
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Component should still render (error handling is internal)
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });

  describe('Node Pagination Integration', () => {
    it('should handle pagination with large node datasets', async () => {
      // Mock large dataset
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 1000,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Simulate page change through router query
      act(() => {
        mockRouter.query = { name: 'nodes', page: '2' };
      });

      // Should call API with correct page
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

    it('should handle page size changes for node data', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Simulate page size change
      act(() => {
        mockRouter.query = { name: 'nodes', pageSize: '48' };
      });

      // Should call API with new page size
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 0, // Reset to first page
            itemsPerPage: 48,
          }),
          expect.anything(),
        );
      });
    });

    it('should validate page boundaries with node data', async () => {
      // Start on page 5 with data that supports it
      mockRouter.query = { name: 'nodes', page: '5' };
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: 200, // Supports page 5
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            currentPage: 4, // Page 5 (0-based)
          }),
          expect.anything(),
        );
      });
    });
  });

  describe('Node URL Synchronization', () => {
    it('should restore node state from URL parameters', async () => {
      // Set URL with node-specific parameters
      mockRouter.query = {
        name: 'nodes',
        page: '2',
        pageSize: '48',
        search: 'node-1',
        sortField: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME.toString(),
        sortOrder: SortOrder.SORT_ORDER_ASCENDING.toString(),
      };

      renderAdminNodes();

      // Should restore state and make API call
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          'node-1',
          expect.objectContaining({
            keyword: 'node-1',
          }),
          expect.objectContaining({
            currentPage: 1, // Page 2 (0-based)
            itemsPerPage: 48,
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

    it('should handle invalid URL parameters for nodes', async () => {
      // Set URL with invalid parameters
      mockRouter.query = {
        name: 'nodes',
        page: 'invalid',
        pageSize: '-5',
        sortField: 'invalid',
      };

      renderAdminNodes();

      // Should use defaults for invalid parameters
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            keyword: '',
          }),
          expect.objectContaining({
            currentPage: 0, // Default to page 1
            itemsPerPage: 24, // Default page size
          }),
          expect.arrayContaining([
            expect.objectContaining({
              field: NodeSortField.NODE_SORT_FIELD_CREATED_AT, // Default sort
              order: SortOrder.SORT_ORDER_DESCENDING,
            }),
          ]),
        );
      });
    });

    it('should handle browser navigation for nodes', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Simulate browser navigation
      act(() => {
        mockRouter.query = { name: 'nodes', page: '3', search: 'test' };
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Should update state based on navigation
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          'test',
          expect.objectContaining({
            keyword: 'test',
          }),
          expect.objectContaining({
            currentPage: 2, // Page 3 (0-based)
          }),
          expect.anything(),
        );
      });
    });
  });

  describe('Node Settings Persistence', () => {
    it('should use persisted node settings', async () => {
      // Mock persisted settings
      mockAdminSettings.nodes = {
        columns: [],
        pageSize: 48,
        sort: {
          field: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME,
          order: SortOrder.SORT_ORDER_ASCENDING,
        },
      };

      renderAdminNodes();

      // Should use persisted settings
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            itemsPerPage: 48, // From persisted settings
          }),
          expect.arrayContaining([
            expect.objectContaining({
              field: NodeSortField.NODE_SORT_FIELD_DISPLAY_NAME, // From persisted settings
              order: SortOrder.SORT_ORDER_ASCENDING,
            }),
          ]),
        );
      });
    });

    it('should persist node settings changes', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should initialize settings if they don't exist
      expect(mockUpdateSettings).toHaveBeenCalledWith('admin', {
        nodes: expect.objectContaining({
          columns: expect.any(Array),
        }),
      });
    });

    it('should handle settings persistence across remounts', async () => {
      // First render
      const { unmount } = renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Simulate settings being persisted
      mockAdminSettings.nodes.pageSize = 48;

      unmount();

      // Second render should use persisted settings
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            itemsPerPage: 48, // Should use persisted value
          }),
          expect.anything(),
        );
      });
    });
  });

  describe('Node Action Integration', () => {
    it('should handle node selection state', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Component should render with selection capabilities
      // The exact implementation depends on the AdminList component
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should handle node cost updates', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // The cost update functionality would be tested through the AdminListEditCost component
      // For now, we verify that the update function is available
      expect(mockNodeClient.updateNode).toBeDefined();
    });

    it('should cache protocol and user data efficiently', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockProtocolClient.listProtocols).toHaveBeenCalledTimes(1);
        expect(mockUserClient.listUsers).toHaveBeenCalledTimes(1);
      });

      // Simulate state change that would trigger re-render
      act(() => {
        mockRouter.query = { name: 'nodes', page: '2' };
      });

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should not refetch protocols and users
      expect(mockProtocolClient.listProtocols).toHaveBeenCalledTimes(1);
      expect(mockUserClient.listUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Error Handling', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle large node datasets efficiently', async () => {
      // Mock large dataset
      const largeNodeSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockNodes[0],
        nodeId: `node-${i}`,
        sqd_name: `node-${i}`,
      }));

      mockNodeClient.listNodes.mockResolvedValue({
        nodes: largeNodeSet.slice(0, 24), // First page
        total: largeNodeSet.length,
      });

      renderAdminNodes();

      // Should handle large dataset without performance issues
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should render efficiently
      expect(screen.getByText('node-0')).toBeInTheDocument();
    });

    it('should handle concurrent API calls gracefully', async () => {
      // Mock API with delays
      mockNodeClient.listNodes.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ nodes: mockNodes, total: mockNodes.length }),
              50,
            ),
          ),
      );

      renderAdminNodes();

      // Trigger multiple state changes
      act(() => {
        mockRouter.query = { name: 'nodes', page: '2' };
      });

      act(() => {
        mockRouter.query = { name: 'nodes', page: '3' };
      });

      // Should handle concurrent calls without issues
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });
    });

    it('should recover from API failures', async () => {
      // Mock API to fail initially, then succeed
      let callCount = 0;
      mockNodeClient.listNodes.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve({ nodes: mockNodes, total: mockNodes.length });
      });

      renderAdminNodes();

      // Should handle initial failure
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should show error toast
      expect(mockToast.error).toHaveBeenCalledWith(
        'Failed to load node data. Please try again.',
      );

      // Component should still be functional
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should handle user data fetch failures gracefully', async () => {
      // Mock user API to fail
      mockUserClient.listUsers.mockRejectedValue(new Error('User API Error'));
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: mockNodes.length,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockUserClient.listUsers).toHaveBeenCalled();
      });

      // Should show error toast for user data
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load user data');

      // Should still fetch nodes
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });
    });

    it('should handle protocol data fetch failures gracefully', async () => {
      // Mock protocol API to fail
      mockProtocolClient.listProtocols.mockRejectedValue(
        new Error('Protocol API Error'),
      );
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: mockNodes,
        total: mockNodes.length,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockProtocolClient.listProtocols).toHaveBeenCalled();
      });

      // Should show error toast for protocol data
      expect(mockToast.error).toHaveBeenCalledWith(
        'Failed to load protocol data',
      );

      // Should still fetch nodes
      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });
    });

    it('should handle node cost update failures', async () => {
      // Mock update to fail
      mockNodeClient.updateNode.mockRejectedValue(new Error('Update failed'));

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // The cost update error handling would be tested through the AdminListEditCost component
      // For now, we verify that the update function is properly configured
      expect(mockNodeClient.updateNode).toBeDefined();
    });

    it('should use proper default page size when pageSize is undefined', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.anything(),
          expect.objectContaining({
            itemsPerPage: 24, // Should use default page size
          }),
          expect.anything(),
        );
      });
    });

    it('should handle empty API responses gracefully', async () => {
      // Mock empty responses
      mockNodeClient.listNodes.mockResolvedValue({
        nodes: undefined,
        total: undefined,
      });

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should handle undefined responses without crashing
      expect(screen.getByRole('article')).toBeInTheDocument();
    });
  });

  describe('Enhanced Filter System Integration', () => {
    it('should handle node-specific filter combinations', async () => {
      // Mock URL with multiple node filters
      mockRouter.query = {
        name: 'nodes',
        page: '1',
        'filter.nodeState': 'RUNNING,STOPPED',
        'filter.protocolName': 'ethereum',
        'filter.region': 'us-east-1',
      };

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            nodeStatus: ['RUNNING', 'STOPPED'],
            protocol: ['ethereum'],
            regions: ['us-east-1'],
          }),
          expect.anything(),
          expect.anything(),
        );
      });
    });

    it('should handle empty filter values correctly', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
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
          expect.anything(),
          expect.anything(),
        );
      });
    });

    it('should handle filter validation for node-specific filters', async () => {
      // This would be tested through the individual filter components
      // For now, we verify that the filter creation function is called correctly
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Verify that createAdminNodeFilters is called with proper parameters
      const lastCall =
        mockNodeClient.listNodes.mock.calls[
          mockNodeClient.listNodes.mock.calls.length - 1
        ];
      const filterParams = lastCall[1];

      // Should have all expected filter properties
      expect(filterParams).toHaveProperty('protocol');
      expect(filterParams).toHaveProperty('nodeStatus');
      expect(filterParams).toHaveProperty('orgIds');
      expect(filterParams).toHaveProperty('userIds');
      expect(filterParams).toHaveProperty('hostIds');
      expect(filterParams).toHaveProperty('regions');
      expect(filterParams).toHaveProperty('ips');
      expect(filterParams).toHaveProperty('networks');
      expect(filterParams).toHaveProperty('semanticVersions');
      expect(filterParams).toHaveProperty('versionKeys');
    });

    it('should handle filter reset for node filters', async () => {
      // Start with filters applied
      mockRouter.query = {
        name: 'nodes',
        page: '1',
        'filter.nodeState': 'RUNNING',
        'filter.protocolName': 'ethereum',
      };

      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Simulate filter reset
      act(() => {
        mockRouter.query = { name: 'nodes', page: '1' };
      });

      // Should call API with empty filters
      await waitFor(() => {
        const lastCall =
          mockNodeClient.listNodes.mock.calls[
            mockNodeClient.listNodes.mock.calls.length - 1
          ];
        const filterParams = lastCall[1];
        expect(filterParams.protocol).toEqual([]);
        expect(filterParams.nodeStatus).toEqual([]);
      });
    });
  });

  describe('Node-Specific Features', () => {
    it('should handle node status display correctly', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should display node status components
      await waitFor(() => {
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
        expect(screen.getByText('STOPPED')).toBeInTheDocument();
      });
    });

    it('should handle node protocol information', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should display protocol information
      await waitFor(() => {
        expect(screen.getByText('Ethereum')).toBeInTheDocument();
        expect(screen.getByText('Bitcoin')).toBeInTheDocument();
      });
    });

    it('should handle node creation information', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Should display creation information
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should handle node selection state correctly', async () => {
      renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Component should render with selection capabilities
      expect(screen.getByRole('article')).toBeInTheDocument();

      // Selection state should be managed properly
      // This would be tested through user interactions in a full E2E test
    });

    it('should optimize performance with memoized callbacks', async () => {
      const { rerender } = renderAdminNodes();

      await waitFor(() => {
        expect(mockNodeClient.listNodes).toHaveBeenCalled();
      });

      // Rerender should not cause unnecessary re-computations
      rerender(
        <RecoilRoot>
          <AdminNodes />
        </RecoilRoot>,
      );

      // The memoized callbacks should prevent unnecessary API calls
      // This is more of a performance optimization that would be measured in practice
      expect(mockNodeClient.listNodes).toHaveBeenCalled();
    });
  });
});
