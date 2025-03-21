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
    if (value) {
      const onValue = propertyGroup.properties.find((property) =>
        property.key.includes('on'),
      )?.key!;
      onPropertyChanged(onValue, propertyGroup.keyGroup!, onValue);
    } else {
      const offValue = propertyGroup.properties.find((property) =>
        property.key.includes('off'),
      )?.key!;
      onPropertyChanged(offValue, propertyGroup.keyGroup!, offValue);
    }
  };

  return (
    <Switch
      disabled={isDisabled}
      checked={propertyGroup.value.includes('on')}
      name={propertyGroup.keyGroup!}
      onChange={handleChange}
      noBottomMargin={noBottomMargin}
    />
  );
};
