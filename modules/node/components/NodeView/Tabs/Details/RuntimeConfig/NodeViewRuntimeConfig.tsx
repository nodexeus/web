import { useState, Fragment } from 'react';
import { useRecoilValue } from 'recoil';
import { UiType } from '@modules/grpc/library/blockjoy/common/v1/protocol';
import { ImageProperty } from '@modules/grpc/library/blockjoy/v1/image';
import { PropertyValueConfig } from '@modules/grpc/library/blockjoy/common/v1/config';
import { NodePropertyGroup } from '@modules/node/types/common';
import { useNodeView } from '@modules/node';
import { FormLabel, FormHeaderCaps, Button, DetailsTable } from '@shared/components';
import { renderNodeConfigControl } from '@modules/node/utils/renderNodeConfigControl';
import { kebabToCapitalized } from 'utils/kebabToCapitalized';
import { authSelectors } from '@modules/auth';
import { styles } from './NodeViewRuntimeConfig.styles';

export const NodeViewRuntimeConfig = () => {
  const { node, nodeImage, updateNode } = useNodeView();
  const isSuperUser = useRecoilValue(authSelectors.isSuperUser);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [runtimeValues, setRuntimeValues] = useState<Record<string, string>>({});

  if (!node || !nodeImage) {
    return null;
  }

  // Get runtime properties from the image
  const runtimeProperties = nodeImage.properties?.filter(
    (property: ImageProperty) => property.dynamicValue
  ) ?? [];

  // Don't render if there are no runtime properties
  if (runtimeProperties.length === 0) {
    return null;
  }

  const handlePropertyChanged = (key: string, keyGroup: string, value: string) => {
    setRuntimeValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleStartEdit = () => {
    // Initialize runtime values with current values
    const initialValues: Record<string, string> = {};
    runtimeProperties.forEach((property) => {
      const currentValue = node.config?.image?.values?.find(
        (value: PropertyValueConfig) =>
          value.key === property.key && value.keyGroup === property.keyGroup
      )?.value ?? property.defaultValue;
      initialValues[property.key] = currentValue;
    });
    setRuntimeValues(initialValues);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setRuntimeValues({});
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);

    try {
      // Build the new values array with only the runtime properties that changed
      const newValues = Object.entries(runtimeValues).map(([key, value]) => {
        const property = runtimeProperties.find(p => p.key === key);
        return {
          key,
          keyGroup: property?.keyGroup || '',
          value,
        };
      });

      // Update the node config
      await updateNode({
        nodeId: node.nodeId,
        newValues,
      });

      setIsEditing(false);
      setRuntimeValues({});
    } catch (error) {
      console.error('Failed to update runtime config:', error);
    } finally {
      setIsSaving(false);
    }
  };


  // Create table data in the same format as mapNodeToDetails
  const runtimeConfigDetails = runtimeProperties.map((property) => {
    // Find the current value from node config
    const currentValue = node.config?.image?.values?.find(
      (value: PropertyValueConfig) =>
        value.key === property.key && value.keyGroup === property.keyGroup
    )?.value ?? property.defaultValue;

    const displayLabel = property.displayName || kebabToCapitalized(property.key);
    
    if (isEditing) {
      // Create property group for editing
      const propertyGroup: NodePropertyGroup = {
        key: property.key,
        keyGroup: property.keyGroup,
        value: runtimeValues[property.key] ?? currentValue,
        uiType: property.uiType,
        properties: [property],
        displayName: displayLabel,
        displayGroup: property.displayGroup,
      };

      return {
        label: displayLabel,
        data: renderNodeConfigControl(propertyGroup, handlePropertyChanged, true),
      };
    }

    return {
      label: displayLabel,
      data: currentValue || '<not set>',
    };
  });

  return (
    <section css={styles.section}>
      <div css={styles.header}>
        <FormHeaderCaps noBottomMargin>Runtime Config</FormHeaderCaps>
        <div css={styles.actions}>
          {!isEditing ? (
            isSuperUser && (
              <Button
                style="outline"
                size="small"
                onClick={handleStartEdit}
              >
                Edit
              </Button>
            )
          ) : (
            <>
              <Button
                style="ghost"
                size="small"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                style="primary"
                size="small"
                onClick={handleSaveChanges}
                disabled={isSaving}
                loading={isSaving}
              >
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <DetailsTable bodyElements={runtimeConfigDetails} />
    </section>
  );
};