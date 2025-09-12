import { useState } from 'react';
import { css } from '@emotion/react';
import { useTheme } from '@emotion/react';
import { spacing } from 'styles/utils.spacing.styles';
import { formatters } from '@shared/utils/formatters';
import { Button } from '@shared/components';
import { styles } from './AdminImagePropertiesList.styles';

import { ImageProperty } from '@modules/grpc/library/blockjoy/v1/image';

interface AdminImagePropertiesListProps {
  properties: ImageProperty[];
  onEdit: (property: ImageProperty) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export const AdminImagePropertiesList = ({ 
  properties, 
  onEdit, 
  onDelete,
  loading = false
}: AdminImagePropertiesListProps) => {
  const theme = useTheme();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group properties by keyGroup or use 'Ungrouped'
  const groupedProperties = properties.reduce((groups, property) => {
    const group = property.keyGroup || 'Ungrouped';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(property);
    return groups;
  }, {} as Record<string, ImageProperty[]>);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const getUiTypeDisplay = (uiType: number) => {
    // UiType enum values from protobuf
    switch (uiType) {
      case 0: return 'Unspecified'; // UI_TYPE_UNSPECIFIED
      case 1: return 'Toggle Switch'; // UI_TYPE_SWITCH
      case 2: return 'Text Input'; // UI_TYPE_TEXT
      case 3: return 'Password Input'; // UI_TYPE_PASSWORD
      case 4: return 'Dropdown'; // UI_TYPE_ENUM
      default: return `Unknown (${uiType})`;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const decimals = 2;
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    
    // Use more decimals for small values, fewer for large
    const precision = value < 10 && i > 0 ? decimals : value < 100 && i > 1 ? 1 : 0;
    
    return `${parseFloat(value.toFixed(precision))} ${units[i]}`;
  };

  const getResourceImpact = (property: ImageProperty) => {
    const impacts = [];
    if (property.addCpuCores) {
      impacts.push(`+${property.addCpuCores} CPU cores`);
    }
    if (property.addMemoryBytes) {
      impacts.push(`+${formatBytes(property.addMemoryBytes)} RAM`);
    }
    if (property.addDiskBytes) {
      impacts.push(`+${formatBytes(property.addDiskBytes)} disk`);
    }
    return impacts.length > 0 ? impacts.join(', ') : 'None';
  };

  if (properties.length === 0) {
    return (
      <div css={[spacing.top.medium, styles.emptyState(theme)]}>
        <p>No properties configured for this image.</p>
        <p style={{ marginTop: '8px' }}>
          Click "Add Property" to create the first property.
        </p>
      </div>
    );
  }

  return (
    <div css={styles.container}>
      {Object.entries(groupedProperties).map(([groupName, groupProperties]) => {
        const isExpanded = expandedGroups.has(groupName);
        
        return (
          <div key={groupName} css={styles.groupContainer}>
            <div
              onClick={() => toggleGroup(groupName)}
              css={[
                styles.groupHeader(theme),
                !isExpanded && styles.groupHeaderCollapsed
              ]}
            >
              <span css={[
                styles.expandIcon,
                isExpanded && styles.expandIconRotated
              ]}>
                ▶
              </span>
              <strong css={styles.groupTitle(theme)}>{groupName}</strong>
              <span css={styles.groupCount(theme)}>
                ({groupProperties.length} {groupProperties.length === 1 ? 'property' : 'properties'})
              </span>
            </div>
            
            {isExpanded && (
              <div css={styles.propertiesContainer(theme)}>
                {groupProperties.map((property, index) => (
                  <div
                    key={property.imagePropertyId}
                    css={[
                      styles.propertyItem(theme),
                      index < groupProperties.length - 1 && styles.propertyItemBorder(theme)
                    ]}
                  >
                    <div css={styles.propertyHeader}>
                      <div css={styles.propertyContent}>
                        <div css={styles.propertyTitleRow}>
                          <h4 css={styles.propertyTitle(theme)}>
                            {property.displayName || property.key}
                          </h4>
                          {property.key !== property.displayName && (
                            <code css={styles.propertyKey(theme)}>
                              {property.key}
                            </code>
                          )}
                        </div>
                        
                        {property.description && (
                          <p css={styles.propertyDescription(theme)}>
                            {property.description}
                          </p>
                        )}
                        
                        <div css={styles.propertyDetailsGrid}>
                          <div css={styles.propertyDetail(theme)}>
                            <span css={styles.propertyDetailLabel(theme)}>UI Type:</span> {getUiTypeDisplay(property.uiType)}
                          </div>
                          <div css={styles.propertyDetail(theme)}>
                            <span css={styles.propertyDetailLabel(theme)}>Default Value:</span> 
                            <span style={{ marginLeft: '4px' }}>
                              {property.uiType === 3 ? '••••••••' : property.defaultValue || '(empty)'}
                            </span>
                          </div>
                          <div css={styles.propertyDetail(theme)}>
                            <span css={styles.propertyDetailLabel(theme)}>Dynamic:</span> {property.dynamicValue ? 'Yes' : 'No'}
                          </div>
                          <div css={styles.propertyDetail(theme)}>
                            <span css={styles.propertyDetailLabel(theme)}>New Archive:</span> {property.newArchive ? 'Yes' : 'No'}
                          </div>
                          <div css={[styles.propertyDetail(theme), styles.resourceImpactRow]}>
                            <span css={styles.propertyDetailLabel(theme)}>Resource Impact:</span> {getResourceImpact(property)}
                          </div>
                        </div>
                      </div>
                      
                      {/* <div css={styles.propertyActions}>
                        <Button
                          size="small"
                          style="secondary"
                          onClick={() => onEdit(property)}
                          disabled={loading}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          style="warning"
                          onClick={() => onDelete(property.imagePropertyId)}
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      </div> */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};