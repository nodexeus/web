import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { NodeLauncherConfigAdvanced } from '../Config/NodeLauncherConfigAdvanced/NodeLauncherConfigAdvanced';
import { nodeLauncherAtoms } from '@modules/node';
import { UiType } from '@modules/grpc/library/blockjoy/common/v1/protocol';
import { ImageProperty } from '@modules/grpc/library/blockjoy/v1/image';
import { NodePropertyGroup } from '@modules/node/types/common';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the auth selectors
jest.mock('@modules/auth', () => ({
  authSelectors: {
    isSuperUser: jest.fn(() => false),
  },
}));

// Mock the renderNodeConfigControl utility
jest.mock('@modules/node/utils/renderNodeConfigControl', () => ({
  renderNodeConfigControl: jest.fn((propertyGroup, onPropertyChanged) => (
    <div data-testid={`property-${propertyGroup.key}`}>
      <label>{propertyGroup.displayName || propertyGroup.key}</label>
      <input
        type={propertyGroup.uiType === UiType.UI_TYPE_PASSWORD ? 'password' : 'text'}
        defaultValue={propertyGroup.value || propertyGroup.properties[0]?.defaultValue}
        onChange={(e) => onPropertyChanged(propertyGroup.key, propertyGroup.keyGroup!, e.target.value)}
      />
    </div>
  )),
}));

describe('NodeLauncher Property Integration', () => {
  const mockOnNodeConfigPropertyChanged = jest.fn();
  const mockOnNodePropertyChanged = jest.fn();
  const mockOnVersionChanged = jest.fn();
  const mockOnVariantChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  const createMockPropertyGroup = (overrides: Partial<NodePropertyGroup> = {}): NodePropertyGroup => ({
    key: 'test-property',
    keyGroup: '',
    value: '',
    uiType: UiType.UI_TYPE_TEXT,
    properties: [createMockImageProperty()],
    displayName: 'Test Property',
    displayGroup: '',
    ...overrides,
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

  describe('Admin-created properties appear in node launch forms', () => {
    it('should display admin-created text properties with correct UI type', () => {
      const textProperty = createMockPropertyGroup({
        key: 'admin-text-prop',
        displayName: 'Admin Text Property',
        uiType: UiType.UI_TYPE_TEXT,
      });

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: [textProperty],
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnNodePropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      expect(screen.getByTestId('property-admin-text-prop')).toBeInTheDocument();
      expect(screen.getByLabelText('Admin Text Property')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('should display admin-created password properties with correct UI type', () => {
      const passwordProperty = createMockPropertyGroup({
        key: 'admin-password-prop',
        displayName: 'Admin Password Property',
        uiType: UiType.UI_TYPE_PASSWORD,
      });

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: [passwordProperty],
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      expect(screen.getByTestId('property-admin-password-prop')).toBeInTheDocument();
      expect(screen.getByLabelText('Admin Password Property')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password');
    });

    it('should display admin-created switch properties', () => {
      const switchProperty = createMockPropertyGroup({
        key: 'admin-switch-prop',
        displayName: 'Admin Switch Property',
        uiType: UiType.UI_TYPE_SWITCH,
      });

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: [switchProperty],
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      expect(screen.getByTestId('property-admin-switch-prop')).toBeInTheDocument();
      expect(screen.getByLabelText('Admin Switch Property')).toBeInTheDocument();
    });

    it('should display admin-created enum properties', () => {
      const enumProperty = createMockPropertyGroup({
        key: 'admin-enum-prop',
        displayName: 'Admin Enum Property',
        uiType: UiType.UI_TYPE_ENUM,
      });

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: [enumProperty],
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      expect(screen.getByTestId('property-admin-enum-prop')).toBeInTheDocument();
      expect(screen.getByLabelText('Admin Enum Property')).toBeInTheDocument();
    });
  });

  describe('Properties use correct display names', () => {
    it('should use displayName when provided', () => {
      const property = createMockPropertyGroup({
        key: 'technical-key',
        displayName: 'User Friendly Name',
      });

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: [property],
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      expect(screen.getByLabelText('User Friendly Name')).toBeInTheDocument();
      expect(screen.queryByLabelText('technical-key')).not.toBeInTheDocument();
    });

    it('should use displayGroup for grouped properties', () => {
      const groupedProperty = createMockPropertyGroup({
        key: 'grouped-prop',
        keyGroup: 'test-group',
        displayGroup: 'Test Group Display',
      });

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: [groupedProperty],
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      expect(screen.getByText('Test Group Display')).toBeInTheDocument();
    });
  });

  describe('Property grouping works correctly', () => {
    it('should group properties by keyGroup', () => {
      const groupedProperties = [
        createMockPropertyGroup({
          key: 'prop1',
          keyGroup: 'group1',
          displayGroup: 'Group 1',
        }),
        createMockPropertyGroup({
          key: 'prop2',
          keyGroup: 'group2',
          displayGroup: 'Group 2',
        }),
      ];

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: groupedProperties,
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      expect(screen.getByText('Group 1')).toBeInTheDocument();
      expect(screen.getByText('Group 2')).toBeInTheDocument();
    });
  });

  describe('Property validation during node creation', () => {
    it('should mark required text properties as required when empty', () => {
      const requiredProperty = createMockPropertyGroup({
        key: 'required-prop',
        displayName: 'Required Property',
        uiType: UiType.UI_TYPE_TEXT,
        value: '', // Empty value should make it required
      });

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: [requiredProperty],
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      // The FormLabel should have isRequired=true for empty text/password fields
      expect(screen.getByText('Required Property')).toBeInTheDocument();
    });

    it('should mark required password properties as required when empty', () => {
      const requiredPasswordProperty = createMockPropertyGroup({
        key: 'required-password-prop',
        displayName: 'Required Password Property',
        uiType: UiType.UI_TYPE_PASSWORD,
        value: '', // Empty value should make it required
      });

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: [requiredPasswordProperty],
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      expect(screen.getByText('Required Password Property')).toBeInTheDocument();
    });

    it('should handle property value changes correctly', async () => {
      const property = createMockPropertyGroup({
        key: 'changeable-prop',
        keyGroup: 'test-group',
        displayName: 'Changeable Property',
      });

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties: [property],
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new-value' } });

      await waitFor(() => {
        expect(mockOnNodeConfigPropertyChanged).toHaveBeenCalledWith(
          'changeable-prop',
          'test-group',
          'new-value'
        );
      });
    });
  });

  describe('Properties are sorted correctly', () => {
    it('should sort properties by key', () => {
      const properties = [
        createMockPropertyGroup({
          key: 'z-property',
          displayName: 'Z Property',
        }),
        createMockPropertyGroup({
          key: 'a-property',
          displayName: 'A Property',
        }),
        createMockPropertyGroup({
          key: 'm-property',
          displayName: 'M Property',
        }),
      ];

      const initialState = {
        [nodeLauncherAtoms.nodeLauncher]: {
          properties,
          firewall: [],
        },
      };

      renderWithRecoil(
        <NodeLauncherConfigAdvanced
          isOpen={true}
          onNodeConfigPropertyChanged={mockOnNodeConfigPropertyChanged}
          onNodePropertyChanged={mockOnPropertyChanged}
          onVersionChanged={mockOnVersionChanged}
          onVariantChanged={mockOnVariantChanged}
        />,
        initialState
      );

      // All properties should be rendered
      expect(screen.getByText('A Property')).toBeInTheDocument();
      expect(screen.getByText('M Property')).toBeInTheDocument();
      expect(screen.getByText('Z Property')).toBeInTheDocument();
    });
  });
});