import { UiType } from '@modules/grpc/library/blockjoy/common/v1/protocol';
import { Textbox } from '@shared/components';
import {
  NodePropertyGroup,
  ImagePropertyEnum,
  ImagePropertySwitch,
} from '@modules/node';

export const renderNodeConfigControl = (
  propertyGroup: NodePropertyGroup,
  onPropertyChanged: (key: string, keyGroup: string, value: string) => void,
  noBottomMargin?: boolean,
) => {
  const property = propertyGroup.properties[0];

  const isDisabled = !property.dynamicValue;

  const handleTextboxChanged = (name: string, value: string) => {
    onPropertyChanged(name, propertyGroup.keyGroup || '', value);
  };

  switch (property.uiType) {
    case UiType.UI_TYPE_PASSWORD:
      return (
        <Textbox
          defaultValue={propertyGroup.value || property.defaultValue}
          type="password"
          isRequired
          isDisabled={isDisabled}
          name={property.key}
          onChange={handleTextboxChanged}
          noBottomMargin={noBottomMargin}
        />
      );
    case UiType.UI_TYPE_TEXT:
      return (
        <Textbox
          defaultValue={propertyGroup.value || property.defaultValue}
          type="text"
          isRequired
          isDisabled={isDisabled}
          name={property.key}
          onChange={handleTextboxChanged}
          noBottomMargin={noBottomMargin}
        />
      );
    case UiType.UI_TYPE_ENUM:
      return (
        <ImagePropertyEnum
          isDisabled={isDisabled}
          onPropertyChanged={onPropertyChanged}
          propertyGroup={propertyGroup}
          noBottomMargin={noBottomMargin}
        />
      );
    case UiType.UI_TYPE_SWITCH:
      return (
        <ImagePropertySwitch
          isDisabled={isDisabled}
          onPropertyChanged={onPropertyChanged}
          propertyGroup={propertyGroup}
          noBottomMargin={noBottomMargin}
        />
      );
  }
};
