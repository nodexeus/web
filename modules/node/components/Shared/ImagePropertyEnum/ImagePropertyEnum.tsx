import { NodePropertyGroup } from '@modules/node/types/common';
import { PillPicker } from '@shared/components';
import { kebabToCapitalized } from 'utils';

type Props = {
  isDisabled?: boolean;
  noBottomMargin?: boolean;
  propertyGroup: NodePropertyGroup;
  onPropertyChanged: (key: string, keyGroup: string, value: string) => void;
};

export const ImagePropertyEnum = ({
  isDisabled,
  noBottomMargin,
  propertyGroup,
  onPropertyChanged,
}: Props) => {
  return (
    <PillPicker
      isDisabled={isDisabled}
      noBottomMargin={noBottomMargin}
      name={propertyGroup.keyGroup!}
      onChange={(item: { id: string | undefined; name: string }) => {
        onPropertyChanged(item.id!, propertyGroup.keyGroup!, item.id!);
      }}
      selectedItem={{
        id: propertyGroup.value,
        name: kebabToCapitalized(propertyGroup.value),
      }}
      items={propertyGroup.properties.map((property) => ({
        id: property.key,
        name: property.displayName || kebabToCapitalized(property.key),
      }))}
    />
  );
};
