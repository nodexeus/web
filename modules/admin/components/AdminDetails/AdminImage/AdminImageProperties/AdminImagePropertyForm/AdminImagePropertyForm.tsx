import { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import { spacing } from 'styles/utils.spacing.styles';
import { typo } from 'styles/utils.typography.styles';
import { colors } from 'styles/utils.colors.styles';
import { Textbox, Dropdown, Switch, Button } from '@shared/components';
import { FormLabel } from '@shared/components/Labels';
import { ErrorDisplay } from '../ErrorDisplay/ErrorDisplay';
import {
  parsePropertyError,
  PropertyError,
} from '../../../../../utils/errorHandling';
import {
  ImageProperty,
  AddImageProperty,
} from '@modules/grpc/library/blockjoy/v1/image';
import { UiType } from '@modules/grpc/library/blockjoy/common/v1/protocol';

interface AdminImagePropertyFormProps {
  property?: ImageProperty;
  onSave: (property: AddImageProperty) => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
  loading?: boolean;
}

const UI_TYPE_OPTIONS = [
  { id: UiType.UI_TYPE_TEXT.toString(), name: 'Text Input' },
  { id: UiType.UI_TYPE_PASSWORD.toString(), name: 'Password Input' },
  { id: UiType.UI_TYPE_SWITCH.toString(), name: 'Toggle Switch' },
  { id: UiType.UI_TYPE_ENUM.toString(), name: 'Dropdown' },
];

export const AdminImagePropertyForm = ({
  property,
  onSave,
  onCancel,
  isEditing,
  loading = false,
}: AdminImagePropertyFormProps) => {
  const [formData, setFormData] = useState<AddImageProperty>({
    key: '',
    newArchive: false,
    defaultValue: '',
    dynamicValue: true,
    uiType: UiType.UI_TYPE_TEXT,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<PropertyError | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (property) {
      setFormData({
        key: property.key,
        keyGroup: property.keyGroup,
        isGroupDefault: property.isGroupDefault,
        newArchive: property.newArchive,
        defaultValue: property.defaultValue,
        dynamicValue: property.dynamicValue,
        description: property.description,
        uiType: property.uiType,
        addCpuCores: property.addCpuCores,
        addMemoryBytes: property.addMemoryBytes ? property.addMemoryBytes / (1024 * 1024) : undefined,
        addDiskBytes: property.addDiskBytes ? property.addDiskBytes / (1024 * 1024) : undefined,
        displayName: property.displayName,
        displayGroup: property.displayGroup,
      });
    }
  }, [property]);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSwitchChange = (name: string, value: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (item: { id?: string; name?: string }) => {
    const uiTypeValue = parseInt(item.id!) as UiType;
    setFormData((prev) => ({ ...prev, uiType: uiTypeValue }));
  };

  const handleDropdownOpen = (open: boolean = true) => setIsDropdownOpen(open);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.key.trim()) {
      newErrors.key = 'Property key is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.key)) {
      newErrors.key =
        'Property key must be in lower-kebab-case format (e.g., rpc-port)';
    }

    if (!formData.displayName?.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    // Validate resource values
    if (formData.addCpuCores !== undefined && formData.addCpuCores < 0) {
      newErrors.addCpuCores = 'CPU cores must be 0 or positive';
    }

    if (formData.addMemoryBytes !== undefined && formData.addMemoryBytes < 0) {
      newErrors.addMemoryBytes = 'Memory MB must be 0 or positive';
    }

    if (formData.addDiskBytes !== undefined && formData.addDiskBytes < 0) {
      newErrors.addDiskBytes = 'Disk MB must be 0 or positive';
    }

    // Switch type validation
    if (
      formData.uiType === UiType.UI_TYPE_SWITCH &&
      formData.defaultValue &&
      !['true', 'false'].includes(formData.defaultValue.toLowerCase())
    ) {
      newErrors.defaultValue = 'Switch default value must be "true" or "false"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      // Clean up the form data - remove undefined values and convert strings to numbers where needed
      const cleanedData: AddImageProperty = {
        ...formData,
        addCpuCores: formData.addCpuCores
          ? Number(formData.addCpuCores)
          : undefined,
        addMemoryBytes: formData.addMemoryBytes
          ? Number(formData.addMemoryBytes) * 1024 * 1024
          : undefined,
        addDiskBytes: formData.addDiskBytes
          ? Number(formData.addDiskBytes) * 1024 * 1024
          : undefined,
      };

      await onSave(cleanedData);
    } catch (err) {
      const propertyError = parsePropertyError(err);
      setSubmitError(propertyError);

      // If it's a field-specific error, also set the field error
      if (propertyError.field && propertyError.code === 'DUPLICATE_KEY') {
        setErrors((prev) => ({
          ...prev,
          [propertyError.field!]: propertyError.message,
        }));
      }

      console.error('Error saving property:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRetrySubmit = () => {
    setSubmitError(null);
    handleSubmit(new Event('submit') as any);
  };

  const selectedUiType =
    UI_TYPE_OPTIONS.find(
      (option) => option.id === formData.uiType.toString(),
    ) || UI_TYPE_OPTIONS[0];

  const isFormDisabled = saving || loading;

  return (
    <div>
      {/* Submit Error Display */}
      {submitError && (
        <ErrorDisplay
          error={submitError}
          onRetry={handleRetrySubmit}
          onDismiss={() => setSubmitError(null)}
        />
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          {/* Left Column */}
          <div>
            <FormLabel>Property Key *</FormLabel>
            <Textbox
              name="key"
              type="text"
              isRequired={true}
              isError={!!errors.key}
              defaultValue={formData.key}
              placeholder="e.g., rpc-port"
              onChange={handleInputChange}
              isDisabled={isFormDisabled}
            />
            {errors.key && (
              <div css={[typo.tiny, colors.warning, spacing.top.micro]}>
                {errors.key}
              </div>
            )}

            <FormLabel>Display Name *</FormLabel>
            <Textbox
              name="displayName"
              type="text"
              isRequired={true}
              isError={!!errors.displayName}
              defaultValue={formData.displayName}
              placeholder="e.g., RPC Port"
              onChange={handleInputChange}
            />
            {errors.displayName && (
              <div css={[typo.tiny, colors.warning, spacing.top.micro]}>
                {errors.displayName}
              </div>
            )}

            <FormLabel>Description</FormLabel>
            <Textbox
              name="description"
              type="text"
              isRequired={false}
              defaultValue={formData.description}
              placeholder="Brief description of this property"
              onChange={handleInputChange}
            />

            <FormLabel>Display Group</FormLabel>
            <Textbox
              name="displayGroup"
              type="text"
              isRequired={false}
              defaultValue={formData.displayGroup}
              placeholder="e.g., Network, Security, Performance"
              onChange={handleInputChange}
            />

            <FormLabel>UI Type *</FormLabel>
            <Dropdown
              items={UI_TYPE_OPTIONS}
              selectedItem={selectedUiType}
              handleSelected={handleSelectChange}
              isOpen={isDropdownOpen}
              handleOpen={handleDropdownOpen}
              disabled={isFormDisabled}
              renderButtonText={<p css={colors.text5}>{selectedUiType.name}</p>}
              renderItem={(item) => item.name}
            />
          </div>

          {/* Right Column */}
          <div>
            <FormLabel>Default Value</FormLabel>
            <Textbox
              name="defaultValue"
              type={
                formData.uiType === UiType.UI_TYPE_PASSWORD
                  ? 'password'
                  : 'text'
              }
              isRequired={false}
              isError={!!errors.defaultValue}
              defaultValue={formData.defaultValue}
              placeholder={
                formData.uiType === UiType.UI_TYPE_SWITCH
                  ? 'true or false'
                  : 'Default value'
              }
              onChange={handleInputChange}
            />
            {errors.defaultValue && (
              <div css={[typo.tiny, colors.warning, spacing.top.micro]}>
                {errors.defaultValue}
              </div>
            )}

            <div css={spacing.top.medium}>
              <FormLabel>Property Options</FormLabel>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginTop: '8px',
                }}
              >
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                  `}
                  onClick={() => handleSwitchChange('dynamicValue', !formData.dynamicValue)}
                >
                  <Switch
                    name="dynamicValue"
                    checked={formData.dynamicValue}
                    onChange={handleSwitchChange}
                    noBottomMargin={true}
                  />
                  <span css={css`
                    font-size: 13px;
                    opacity: 0.7;
                    line-height: 1;
                  `}>Dynamic (can be changed after deployment)</span>
                </div>

                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                  `}
                  onClick={() => handleSwitchChange('newArchive', !formData.newArchive)}
                >
                  <Switch
                    name="newArchive"
                    checked={formData.newArchive}
                    onChange={handleSwitchChange}
                    noBottomMargin={true}
                  />
                  <span css={css`
                    font-size: 13px;
                    opacity: 0.7;
                    line-height: 1;
                  `}>Requires new archive data</span>
                </div>

                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                  `}
                  onClick={() => handleSwitchChange('isGroupDefault', !formData.isGroupDefault)}
                >
                  <Switch
                    name="isGroupDefault"
                    checked={formData.isGroupDefault}
                    onChange={handleSwitchChange}
                    noBottomMargin={true}
                  />
                  <span css={css`
                    font-size: 13px;
                    opacity: 0.7;
                    line-height: 1;
                  `}>Group default property</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Impact Section */}
        <div css={spacing.top.medium}>
          <FormLabel>Resource Impact (Optional)</FormLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              marginTop: '8px',
            }}
          >
            <div
              css={css`
                font-size: 13px;
                opacity: 0.7;
              `}
            >
              <label
                css={[typo.small, { marginBottom: '4px', display: 'block' }]}
              >
                Additional CPU Cores
              </label>
              <Textbox
                name="addCpuCores"
                type="number"
                isRequired={false}
                isError={!!errors.addCpuCores}
                defaultValue={formData.addCpuCores?.toString()}
                placeholder="0"
                onChange={handleInputChange}
              />
              {errors.addCpuCores && (
                <div css={[typo.tiny, colors.warning, spacing.top.micro]}>
                  {errors.addCpuCores}
                </div>
              )}
            </div>

            <div
              css={css`
                font-size: 13px;
                opacity: 0.7;
              `}
            >
              <label
                css={[typo.small, { marginBottom: '4px', display: 'block' }]}
              >
                Additional Memory (MB)
              </label>
              <Textbox
                name="addMemoryBytes"
                type="number"
                isRequired={false}
                isError={!!errors.addMemoryBytes}
                defaultValue={formData.addMemoryBytes?.toString()}
                placeholder="0"
                onChange={handleInputChange}
              />
              {errors.addMemoryBytes && (
                <div css={[typo.tiny, colors.warning, spacing.top.micro]}>
                  {errors.addMemoryBytes}
                </div>
              )}
            </div>

            <div
              css={css`
                font-size: 13px;
                opacity: 0.7;
              `}
            >
              <label
                css={[typo.small, { marginBottom: '4px', display: 'block' }]}
              >
                Additional Disk (MB)
              </label>
              <Textbox
                name="addDiskBytes"
                type="number"
                isRequired={false}
                isError={!!errors.addDiskBytes}
                defaultValue={formData.addDiskBytes?.toString()}
                placeholder="0"
                onChange={handleInputChange}
              />
              {errors.addDiskBytes && (
                <div css={[typo.tiny, colors.warning, spacing.top.micro]}>
                  {errors.addDiskBytes}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div
          css={spacing.top.large}
          style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}
        >
          <Button
            type="button"
            style="outline"
            onClick={onCancel}
            disabled={isFormDisabled}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            style="primary"
            disabled={isFormDisabled}
            loading={saving}
          >
            {isEditing ? 'Update Property' : 'Create Property'}
          </Button>
        </div>
      </form>
    </div>
  );
};
