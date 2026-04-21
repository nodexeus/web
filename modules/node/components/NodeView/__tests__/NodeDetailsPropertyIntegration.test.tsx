import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { NodeViewConfig } from '../Tabs/Config/NodeViewConfig';
import { nodeAtoms } from '@modules/node';
import { UiType } from '@modules/grpc/library/blockjoy/common/v1/protocol';
import { ImageProperty, Image } from '@modules/grpc/library/blockjoy/v1/image';
import { Node } from '@modules/grpc/library/blockjoy/v1/node';
import { NodeConfig } from '@modules/node/types/common';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the auth selectors
jest.mock('@modules/auth', () => ({
  authSelectors: {
    isSuperUser: jest.fn(() => false),
  },
}));

// Mock the useNodeView hook
const mockUpdateNode = jest.fn();
jest.mock('@modules/node/hooks/useNodeView', () => ({
  useNodeView: () => ({
    node: mockNode,
    nodeImage: mockNodeImage,
    isLoading: false,
    updateNode: mockUpdateNode,
  }),
}));

// Mock the renderNodeConfigControl utility
jest.mock('@modules/node/utils/renderNodeConfigControl', () => ({
  renderNodeConfigControl: jest.fn((propertyGroup, onPropertyChanged, noBottomMargin) => (
    <div data-testid={`property-control-${propertyGroup.key}`}>
      <input
        type={propertyGroup.uiType === UiType.UI_TYPE_PASSWORD ? 'password' : 'text'}
        value={propertyGroup.value}
        disabled={!propertyGroup.properties[0]?.dynamicValue}
        onChange={(e) => onPropertyChanged(propertyGroup.key, propertyGroup.keyGroup!, e.target.value)}
        data-testid={`property-input-${propertyGroup.key}`}
      />
    </div>
  )),
}));

const createMockImageProperty = (overrides: Partial<ImageProperty> = {}): ImageProperty => ({
  id: 'prop-1',
  imageId: 'image-1',
  key: 'test-property',
  keyGroup: '',
  isGroupDefault: false,
  newArchive: false,
  defaultValue: 'default-value',
  dynamicValue: true,
  description: 'Test property description',
  uiType: UiType.UI_TYPE_TEXT,
  addCpuCores: 0,
  addMemoryBytes: 0,
  addDiskBytes: 0,
  displayName: 'Test Property',
  displayGroup: '',
  ...overrides,
});

const mockNodeImage: Image = {
  id: 'image-1',
  protocolVersionId: 'protocol-1',
  versionKey: 'test-protocol',
  semanticVersion: '1.0.0',
  buildVersion: 1,
  orgId: 'org-1',
  properties: [
    createMockImageProperty({
      key: 'admin-text-prop',
      displayName: 'Admin Text Property',
      dynamicValue: true,
      uiType: UiType.UI_TYPE_TEXT,
    }),
    createMockImageProperty({
      key: 'admin-readonly-prop',
      displayName: 'Admin Read-Only Property',
      dynamicValue: false,
      uiType: UiType.UI_TYPE_TEXT,
    }),
    createMockImageProperty({
      key: 'admin-password-prop',
      displayName: 'Admin Password Property',
      dynamicValue: true,
      uiType: UiType.UI_TYPE_PASSWORD,
    }),
    createMockImageProperty({
      key: 'admin-switch-prop',
      displayName: 'Admin Switch Property',
      dynamicValue: true,
      uiType: UiType.UI_TYPE_SWITCH,
    }),
  ],
  firewall: null,
  createdAt: null,
};

const mockNode: Node = {
  nodeId: 'node-1',
  orgId: 'org-1',
  orgName: 'Test Org',
  hostId: 'host-1',
  displayName: 'Test Node',
  nodeName: 'test-node',
  versionKey: 'test-protocol',
  semanticVersion: '1.0.0',
  autoUpgrade: false,
  config: {
    id: 'config-1',
    image: {
      values: [
        { key: 'admin-text-prop', value: 'current-text-value' },
        { key: 'admin-readonly-prop', value: 'readonly-value' },
        { key: 'admin-password-prop', value: 'current-password' },
        { key: 'admin-switch-prop', value: 'true' },
      ],
    },
    firewall: {
      rules: [],
    },
  },
  // ... other required Node fields
} as Node;

describe('Node Details Property Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRecoil = (component: React.ReactElement, initialState = {}) => {
    const initializeState = ({ set }: any) => {
      Object.entries(initialState).forEach(([key, value]) => {
        set(key, value);
      });
    };

    return render(
      <RecoilRoot initializeState={initializeState}>
        {component}
      </RecoilRoot>
    );
  };

  describe('Admin-created properties appear in node details', () => {
    it('should display all admin-created properties with current values', () => {
      renderWithRecoil(<NodeViewConfig />);

      expect(screen.getByTestId('property-control-admin-text-prop')).toBeInTheDocument();
      expect(screen.getByTestId('property-control-admin-readonly-prop')).toBeInTheDocument();
      expect(screen.getByTestId('property-control-admin-password-prop')).toBeInTheDocument();
      expect(screen.getByTestId('property-control-admin-switch-prop')).toBeInTheDocument();
    });

    it('should display property values from node config', () => {
      renderWithRecoil(<NodeViewConfig />);

      const textInput = screen.getByTestId('property-input-admin-text-prop');
      const readonlyInput = screen.getByTestId('property-input-admin-readonly-prop');
      const passwordInput = screen.getByTestId('property-input-admin-password-prop');
      const switchInput = screen.getByTestId('property-input-admin-switch-prop');

      expect(textInput).toHaveValue('current-text-value');
      expect(readonlyInput).toHaveValue('readonly-value');
      expect(passwordInput).toHaveValue('current-password');
      expect(switchInput).toHaveValue('true');
    });

    it('should use display names for property labels', () => {
      renderWithRecoil(<NodeViewConfig />);

      expect(screen.getByText('Admin Text Property')).toBeInTheDocument();
      expect(screen.getByText('Admin Read-Only Property')).toBeInTheDocument();
      expect(screen.getByText('Admin Password Property')).toBeInTheDocument();
      expect(screen.getByText('Admin Switch Property')).toBeInTheDocument();
    });
  });

  describe('Dynamic vs read-only property handling', () => {
    it('should make dynamic properties editable', () => {
      renderWithRecoil(<NodeViewConfig />);

      const dynamicInput = screen.getByTestId('property-input-admin-text-prop');
      const passwordInput = screen.getByTestId('property-input-admin-password-prop');
      const switchInput = screen.getByTestId('property-input-admin-switch-prop');

      expect(dynamicInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(switchInput).not.toBeDisabled();
    });

    it('should make non-dynamic properties read-only', () => {
      renderWithRecoil(<NodeViewConfig />);

      const readonlyInput = screen.getByTestId('property-input-admin-readonly-prop');
      expect(readonlyInput).toBeDisabled();
    });
  });

  describe('Property updates on running nodes', () => {
    it('should handle property value changes', async () => {
      renderWithRecoil(<NodeViewConfig />);

      const textInput = screen.getByTestId('property-input-admin-text-prop');
      fireEvent.change(textInput, { target: { value: 'new-text-value' } });

      // Verify the input value changed locally
      expect(textInput).toHaveValue('new-text-value');
    });

    it('should enable update button when properties are modified', async () => {
      renderWithRecoil(<NodeViewConfig />);

      const textInput = screen.getByTestId('property-input-admin-text-prop');
      fireEvent.change(textInput, { target: { value: 'modified-value' } });

      await waitFor(() => {
        const updateButton = screen.getByRole('button', { name: /update/i });
        expect(updateButton).not.toBeDisabled();
      });
    });

    it('should call updateNode with new property values', async () => {
      renderWithRecoil(<NodeViewConfig />);

      const textInput = screen.getByTestId('property-input-admin-text-prop');
      fireEvent.change(textInput, { target: { value: 'updated-value' } });

      const updateButton = screen.getByRole('button', { name: /update/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalledWith(
          expect.objectContaining({
            nodeId: 'node-1',
            newValues: expect.arrayContaining([
              expect.objectContaining({
                key: 'admin-text-prop',
                value: 'updated-value',
              }),
            ]),
          }),
          true
        );
      });
    });
  });

  describe('Property validation', () => {
    it('should validate required text properties', () => {
      // Mock a property with empty value
      const nodeWithEmptyProperty = {
        ...mockNode,
        config: {
          ...mockNode.config,
          image: {
            values: [
              { key: 'admin-text-prop', value: '' }, // Empty required field
            ],
          },
        },
      };

      // Mock the useNodeView hook to return node with empty property
      jest.doMock('@modules/node/hooks/useNodeView', () => ({
        useNodeView: () => ({
          node: nodeWithEmptyProperty,
          nodeImage: mockNodeImage,
          isLoading: false,
          updateNode: mockUpdateNode,
        }),
      }));

      renderWithRecoil(<NodeViewConfig />);

      const updateButton = screen.getByRole('button', { name: /update/i });
      expect(updateButton).toBeDisabled();
    });

    it('should allow updates when all required fields are filled', () => {
      renderWithRecoil(<NodeViewConfig />);

      const updateButton = screen.getByRole('button', { name: /update/i });
      // Should be disabled initially since no changes made
      expect(updateButton).toBeDisabled();

      // Make a change
      const textInput = screen.getByTestId('property-input-admin-text-prop');
      fireEvent.change(textInput, { target: { value: 'valid-value' } });

      // Should be enabled after valid change
      expect(updateButton).not.toBeDisabled();
    });
  });

  describe('Property sorting and display', () => {
    it('should sort properties by key', () => {
      renderWithRecoil(<NodeViewConfig />);

      const propertyControls = screen.getAllByTestId(/property-control-/);
      const propertyKeys = propertyControls.map(control => 
        control.getAttribute('data-testid')?.replace('property-control-', '')
      );

      // Should be sorted alphabetically
      expect(propertyKeys).toEqual([
        'admin-password-prop',
        'admin-readonly-prop', 
        'admin-switch-prop',
        'admin-text-prop'
      ]);
    });
  });

  describe('Update confirmation for property changes', () => {
    it('should show confirmation modal for property updates', async () => {
      renderWithRecoil(<NodeViewConfig />);

      const textInput = screen.getByTestId('property-input-admin-text-prop');
      fireEvent.change(textInput, { target: { value: 'new-value' } });

      const updateButton = screen.getByRole('button', { name: /update/i });
      fireEvent.click(updateButton);

      // Should show confirmation modal for property changes
      await waitFor(() => {
        expect(screen.getByText(/updating node config properties will trigger a node restart/i)).toBeInTheDocument();
      });
    });
  });
});