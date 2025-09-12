import { Fragment } from 'react';
import { useRecoilValue } from 'recoil';
import { UiType } from '@modules/grpc/library/blockjoy/common/v1/protocol';
import { NodePropertyGroup } from '@modules/node/types/common';
import { nodeLauncherAtoms } from '@modules/node';
import { FormLabel } from '@shared/components';
import { renderNodeConfigControl } from '@modules/node/utils/renderNodeConfigControl';
import { kebabToCapitalized } from 'utils/kebabToCapitalized';
import { styles } from './NodeLauncherConfigRuntime.styles';

type Props = {
  onNodeConfigPropertyChanged: (
    key: string,
    keyGroup: string,
    value: string | boolean,
  ) => void;
};

export const NodeLauncherConfigRuntime = ({
  onNodeConfigPropertyChanged,
}: Props) => {
  const nodeLauncher = useRecoilValue(nodeLauncherAtoms.nodeLauncher);

  const { properties } = nodeLauncher;

  // Filter for runtime properties (dynamicValue: true)
  const runtimeProperties = properties?.filter((propertyGroup: NodePropertyGroup) => {
    return propertyGroup.properties.some(property => property.dynamicValue);
  }) ?? [];

  // Don't render anything if there are no runtime properties
  if (runtimeProperties.length === 0) {
    return null;
  }

  return (
    <div css={styles.runtimeConfig}>
      {runtimeProperties.map((propertyGroup: NodePropertyGroup, index) => {
        const isRequired =
          (propertyGroup.uiType === UiType.UI_TYPE_TEXT ||
            propertyGroup.uiType === UiType.UI_TYPE_PASSWORD) &&
          propertyGroup.value === '';

        // Use a stable key that doesn't include index to prevent remounting
        const stableKey = propertyGroup.keyGroup || propertyGroup.key || `runtime-property-${index}`;

        return (
          <Fragment key={stableKey}>
            <FormLabel isCapitalized isRequired={isRequired}>
              {propertyGroup.displayGroup ||
                kebabToCapitalized(propertyGroup.keyGroup || propertyGroup.key)}
            </FormLabel>
            {renderNodeConfigControl(
              propertyGroup,
              onNodeConfigPropertyChanged,
            )}
          </Fragment>
        );
      })}
    </div>
  );
};