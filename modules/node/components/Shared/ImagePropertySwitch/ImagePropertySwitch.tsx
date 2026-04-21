import { NodePropertyGroup } from '@modules/node/types/common';
import { Switch } from '@shared/components';

type Props = {
  isDisabled?: boolean;
  noBottomMargin?: boolean;
  propertyGroup: NodePropertyGroup;
  onPropertyChanged: (key: string, keyGroup: string, value: string) => void;
};

export const ImagePropertySwitch = ({
  isDisabled,
  noBottomMargin,
  propertyGroup,
  onPropertyChanged,
}: Props) => {
  const handleChange = (name: string, value: boolean) => {
    // Handle simple boolean switches (true/false values)
    const property = propertyGroup.properties[0];
    if (property) {
      onPropertyChanged(property.key, propertyGroup.keyGroup || '', value ? 'true' : 'false');
    } else {
      // Fallback to legacy on/off pattern if needed
      if (value) {
        const onValue = propertyGroup.properties.find((property) =>
          property.key.includes('on'),
        )?.key!;
        onPropertyChanged(onValue, propertyGroup.keyGroup || '', onValue);
      } else {
        const offValue = propertyGroup.properties.find((property) =>
          property.key.includes('off'),
        )?.key!;
        onPropertyChanged(offValue, propertyGroup.keyGroup || '', offValue);
      }
    }
  };

  const isChecked = propertyGroup.value ? 
    (propertyGroup.value.toLowerCase() === 'true' || propertyGroup.value.includes('on')) : 
    false;

  return (
    <Switch
      disabled={isDisabled}
      checked={isChecked}
      name={propertyGroup.keyGroup!}
      onChange={handleChange}
      noBottomMargin={noBottomMargin}
    />
  );
};
