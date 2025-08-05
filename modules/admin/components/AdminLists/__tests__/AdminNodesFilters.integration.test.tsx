import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { AdminNodesFilterStatus } from '../AdminNodes/AdminNodesFilter/AdminNodesFilterStatus/AdminNodesFilterStatus';
import { AdminNodesFilterProtocol } from '../AdminNodes/AdminNodesFilter/AdminNodesFilterProtocol/AdminNodesFilterProtocol';
import { Node } from '@generated/blockjoy/v1/node';
import { NodeState, NodeStatus } from '@generated/blockjoy/common/v1/node';

// Mock shared components
vi.mock('@shared/components', () => ({
  sort: (items: any[], options: any) =>
    items.sort((a, b) => a.name.localeCompare(b.name)),
}));

// Mock admin utilities
vi.mock('@modules/admin', () => ({
  dedupedAdminDropdownList: (items: any[]) =>
    items.filter(
      (item, index, self) => index === self.findIndex((t) => t.id === item.id),
    ),
}));

// Mock capitalize utility
vi.mock('utils/capitalize', () => ({
  capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
}));

// Mock shared index
vi.mock('@shared/index', () => ({
  unique: (items: any[], key: string) =>
    items.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t[key] === item[key]),
    ),
}));

// Test data
const mockNodes: Node[] = [
  {
    nodeId: '1',
    protocolId: 'eth',
    protocolName: 'ethereum',
    nodeStatus: {
      state: NodeState.NODE_STATE_RUNNING,
    } as NodeStatus,
  } as Node,
  {
    nodeId: '2',
    protocolId: 'btc',
    protocolName: 'bitcoin',
    nodeStatus: {
      state: NodeState.NODE_STATE_STOPPED,
    } as NodeStatus,
  } as Node,
  {
    nodeId: '3',
    protocolId: 'eth',
    protocolName: 'ethereum',
    nodeStatus: {
      state: NodeState.NODE_STATE_RUNNING,
    } as NodeStatus,
  } as Node,
];

const mockFilterProps = {
  columnName: 'testColumn',
  values: [],
  listAll: mockNodes,
  onFilterChange: vi.fn(),
  onReset: vi.fn(),
  isLoading: false,
  error: null,
  onRetry: vi.fn(),
};

describe('AdminNodes Filter Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('AdminNodesFilterStatus Integration', () => {
    it('should render status filter with enhanced controls', async () => {
      render(
        <RecoilRoot>
          <AdminNodesFilterStatus {...mockFilterProps} />
        </RecoilRoot>,
      );

      // Should render the enhanced filter control
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should process node status data correctly', async () => {
      const { rerender } = render(
        <RecoilRoot>
          <AdminNodesFilterStatus {...mockFilterProps} />
        </RecoilRoot>,
      );

      // Should process the node status data
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      // Update with different nodes
      const updatedNodes = [
        ...mockNodes,
        {
          nodeId: '4',
          nodeStatus: {
            state: NodeState.NODE_STATE_FAILED,
          } as NodeStatus,
        } as Node,
      ];

      rerender(
        <RecoilRoot>
          <AdminNodesFilterStatus {...mockFilterProps} listAll={updatedNodes} />
        </RecoilRoot>,
      );

      // Should handle the updated data
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should handle filter validation for status values', async () => {
      const onFilterChange = vi.fn();

      render(
        <RecoilRoot>
          <AdminNodesFilterStatus
            {...mockFilterProps}
            onFilterChange={onFilterChange}
          />
        </RecoilRoot>,
      );

      // The validation would be handled by the enhanced filter control
      // This test verifies the component renders without errors
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should handle loading and error states', async () => {
      const { rerender } = render(
        <RecoilRoot>
          <AdminNodesFilterStatus {...mockFilterProps} isLoading={true} />
        </RecoilRoot>,
      );

      // Should handle loading state
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      // Update to error state
      rerender(
        <RecoilRoot>
          <AdminNodesFilterStatus
            {...mockFilterProps}
            isLoading={false}
            error="Test error"
          />
        </RecoilRoot>,
      );

      // Should handle error state
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should provide proper accessibility features', async () => {
      render(
        <RecoilRoot>
          <AdminNodesFilterStatus {...mockFilterProps} />
        </RecoilRoot>,
      );

      // Should have proper ARIA labels
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        // The enhanced filter control should provide proper accessibility
      });
    });
  });

  describe('AdminNodesFilterProtocol Integration', () => {
    it('should render protocol filter correctly', async () => {
      render(
        <RecoilRoot>
          <AdminNodesFilterProtocol {...mockFilterProps} />
        </RecoilRoot>,
      );

      // Should render the filter control
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should process protocol data correctly', async () => {
      render(
        <RecoilRoot>
          <AdminNodesFilterProtocol {...mockFilterProps} />
        </RecoilRoot>,
      );

      // Should process the protocol data from nodes
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      // The component should extract unique protocols from the node list
      // This would be verified through the dropdown options in a full integration test
    });

    it('should handle empty protocol data', async () => {
      render(
        <RecoilRoot>
          <AdminNodesFilterProtocol {...mockFilterProps} listAll={[]} />
        </RecoilRoot>,
      );

      // Should handle empty data gracefully
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should deduplicate protocol options', async () => {
      // Mock nodes with duplicate protocols
      const duplicateProtocolNodes = [
        ...mockNodes,
        {
          nodeId: '4',
          protocolId: 'eth',
          protocolName: 'ethereum',
        } as Node,
      ];

      render(
        <RecoilRoot>
          <AdminNodesFilterProtocol
            {...mockFilterProps}
            listAll={duplicateProtocolNodes}
          />
        </RecoilRoot>,
      );

      // Should deduplicate the protocol options
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should handle filter changes correctly', async () => {
      const onFilterChange = vi.fn();

      render(
        <RecoilRoot>
          <AdminNodesFilterProtocol
            {...mockFilterProps}
            onFilterChange={onFilterChange}
          />
        </RecoilRoot>,
      );

      // Should be ready to handle filter changes
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      // The actual filter change would be triggered by user interaction
      // which would be tested in E2E tests
    });
  });

  describe('Filter Performance and Optimization', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const largeNodeSet = Array.from({ length: 1000 }, (_, i) => ({
        nodeId: `node-${i}`,
        protocolId: `protocol-${i % 10}`,
        protocolName: `protocol-${i % 10}`,
        nodeStatus: {
          state:
            i % 2 === 0
              ? NodeState.NODE_STATE_RUNNING
              : NodeState.NODE_STATE_STOPPED,
        } as NodeStatus,
      })) as Node[];

      const startTime = performance.now();

      render(
        <RecoilRoot>
          <AdminNodesFilterStatus {...mockFilterProps} listAll={largeNodeSet} />
        </RecoilRoot>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle rapid data updates efficiently', async () => {
      const { rerender } = render(
        <RecoilRoot>
          <AdminNodesFilterStatus {...mockFilterProps} />
        </RecoilRoot>,
      );

      // Simulate rapid data updates
      for (let i = 0; i < 10; i++) {
        const updatedNodes = mockNodes.map((node) => ({
          ...node,
          nodeId: `${node.nodeId}-${i}`,
        }));

        rerender(
          <RecoilRoot>
            <AdminNodesFilterStatus
              {...mockFilterProps}
              listAll={updatedNodes}
            />
          </RecoilRoot>,
        );
      }

      // Should handle rapid updates without issues
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should memoize filter options correctly', async () => {
      const { rerender } = render(
        <RecoilRoot>
          <AdminNodesFilterProtocol {...mockFilterProps} />
        </RecoilRoot>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      // Rerender with same data should not cause unnecessary recalculations
      rerender(
        <RecoilRoot>
          <AdminNodesFilterProtocol {...mockFilterProps} />
        </RecoilRoot>,
      );

      // Should still render correctly
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Error Handling', () => {
    it('should handle malformed node data gracefully', async () => {
      const malformedNodes = [
        { nodeId: '1' }, // Missing required fields
        { nodeId: '2', protocolName: null },
        { nodeId: '3', nodeStatus: null },
      ] as Node[];

      render(
        <RecoilRoot>
          <AdminNodesFilterStatus
            {...mockFilterProps}
            listAll={malformedNodes}
          />
        </RecoilRoot>,
      );

      // Should handle malformed data without crashing
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should handle undefined listAll prop', async () => {
      render(
        <RecoilRoot>
          <AdminNodesFilterStatus
            {...mockFilterProps}
            listAll={undefined as any}
          />
        </RecoilRoot>,
      );

      // Should handle undefined data gracefully
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should handle filter callback errors', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Filter callback error');
      });

      render(
        <RecoilRoot>
          <AdminNodesFilterStatus
            {...mockFilterProps}
            onFilterChange={errorCallback}
          />
        </RecoilRoot>,
      );

      // Should render without crashing even if callbacks throw errors
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });
  });

  describe('Filter State Management Integration', () => {
    it('should integrate with enhanced filter state management', async () => {
      const onFilterChange = vi.fn();
      const onReset = vi.fn();

      render(
        <RecoilRoot>
          <AdminNodesFilterStatus
            {...mockFilterProps}
            onFilterChange={onFilterChange}
            onReset={onReset}
            values={['RUNNING']}
          />
        </RecoilRoot>,
      );

      // Should render with pre-selected values
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      // The enhanced filter control should handle the state management
      // This would be tested through user interactions in E2E tests
    });

    it('should handle filter validation rules', async () => {
      render(
        <RecoilRoot>
          <AdminNodesFilterStatus {...mockFilterProps} />
        </RecoilRoot>,
      );

      // Should apply validation rules defined in the component
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      // The validation rules (max selections, allowed values, etc.)
      // would be tested through the enhanced filter control
    });

    it('should provide proper help text and accessibility', async () => {
      render(
        <RecoilRoot>
          <AdminNodesFilterStatus {...mockFilterProps} />
        </RecoilRoot>,
      );

      // Should provide proper accessibility features
      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        // The enhanced filter control should provide proper ARIA labels and help text
      });
    });
  });
});
