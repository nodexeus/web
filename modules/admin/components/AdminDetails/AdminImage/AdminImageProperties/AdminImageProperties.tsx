import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { css } from '@emotion/react';
import { spacing } from 'styles/utils.spacing.styles';
import { typo } from 'styles/utils.typography.styles';
import { colors } from 'styles/utils.colors.styles';
import { Button } from '@shared/components';
import { AdminImagePropertiesList } from './AdminImagePropertiesList/AdminImagePropertiesList';
import { AdminImagePropertyForm } from './AdminImagePropertyForm/AdminImagePropertyForm';
import { PropertyInheritanceModal } from './PropertyInheritanceModal/PropertyInheritanceModal';
import { ErrorDisplay } from './ErrorDisplay/ErrorDisplay';
import { LoadingState } from './LoadingState/LoadingState';
import { ConfirmationDialog } from './ConfirmationDialog/ConfirmationDialog';
import { 
  parsePropertyError, 
  getErrorToastMessage, 
  getDeleteConfirmationMessage,
  PropertyError 
} from '../../../../utils/errorHandling';
import { imageClient } from '@modules/grpc';
import { ImageProperty, AddImageProperty } from '@modules/grpc/library/blockjoy/v1/image';
import { organizationSelectors } from '@modules/organization';
import { useRecoilValue } from 'recoil';

interface AdminImagePropertiesProps {
  imageId: string;
  protocolName?: string;
  semanticVersion?: string;
}

export const AdminImageProperties = ({ imageId, protocolName, semanticVersion }: AdminImagePropertiesProps) => {
  const [properties, setProperties] = useState<ImageProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<ImageProperty | null>(null);
  const [showInheritanceModal, setShowInheritanceModal] = useState(false);
  const [sourceImage, setSourceImage] = useState<any>(null);
  const [error, setError] = useState<PropertyError | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const defaultOrganization = useRecoilValue(organizationSelectors.defaultOrganization);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'primary' | 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await imageClient.getImageDetails({
        imageId,
        orgId: defaultOrganization?.orgId,
      });
      
      if (response.image?.properties) {
        setProperties(response.image.properties);
      } else {
        setProperties([]);
      }
    } catch (err) {
      const propertyError = parsePropertyError(err);
      setError(propertyError);
      toast.error(getErrorToastMessage(propertyError));
      console.error('Error loading properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyAdd = async (property: AddImageProperty) => {
    try {
      setOperationLoading(true);
      setError(null);
      
      const response = await imageClient.addImageProperty({
        imageId,
        property,
        applyToNewerVersions: false,
      });
      
      if (response.property) {
        setProperties(prev => [...prev, response.property!]);
        setShowAddForm(false);
        setEditingProperty(null);
        toast.success('Property added successfully');
      }
    } catch (err) {
      const propertyError = parsePropertyError(err);
      setError(propertyError);
      toast.error(getErrorToastMessage(propertyError));
      console.error('Error adding property:', err);
    } finally {
      setOperationLoading(false);
    }
  };

  const handlePropertyUpdate = async (id: string, property: AddImageProperty) => {
    try {
      setOperationLoading(true);
      setError(null);
      
      const response = await imageClient.updateImageProperty({
        imagePropertyId: id,
        property,
        applyToNewerVersions: false,
      });
      
      if (response.property) {
        setProperties(prev => 
          prev.map(p => p.imagePropertyId === id ? response.property! : p)
        );
        setEditingProperty(null);
        setShowAddForm(false);
        toast.success('Property updated successfully');
      }
    } catch (err) {
      const propertyError = parsePropertyError(err);
      setError(propertyError);
      toast.error(getErrorToastMessage(propertyError));
      console.error('Error updating property:', err);
    } finally {
      setOperationLoading(false);
    }
  };

  const handlePropertyDelete = async (id: string) => {
    const property = properties.find(p => p.imagePropertyId === id);
    if (!property) return;

    const confirmationMessage = getDeleteConfirmationMessage(property.key, property.displayName);
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Property',
      message: confirmationMessage,
      variant: 'danger',
      onConfirm: () => performPropertyDelete(id)
    });
  };

  const performPropertyDelete = async (id: string) => {
    try {
      setOperationLoading(true);
      setError(null);
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      
      await imageClient.deleteImageProperty({
        imagePropertyId: id,
        applyToNewerVersions: false,
      });
      
      setProperties(prev => prev.filter(p => p.imagePropertyId !== id));
      toast.success('Property deleted successfully');
    } catch (err) {
      const propertyError = parsePropertyError(err);
      setError(propertyError);
      toast.error(getErrorToastMessage(propertyError));
      console.error('Error deleting property:', err);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditProperty = (property: ImageProperty) => {
    setEditingProperty(property);
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingProperty(null);
    setShowAddForm(false);
    setError(null);
  };

  const handleRetryOperation = () => {
    setError(null);
    loadProperties();
  };

  const handleDismissError = () => {
    setError(null);
  };

  const handleShowInheritance = () => {
    // Mock source image data - in real implementation, this would come from the parent component
    const mockSourceImage = {
      imageId,
      protocolName: 'ethereum',
      versionKey: 'mainnet',
      buildVersion: 1001,
      propertyCount: properties.length,
      createdAt: new Date('2024-01-15'),
      orgId: 'blockjoy',
      orgName: 'BlockJoy',
    };
    setSourceImage(mockSourceImage);
    setShowInheritanceModal(true);
  };

  const handleInheritanceConfirm = async (targetImageIds: string[], syncType: 'newer' | 'all' | 'selected') => {
    try {
      setOperationLoading(true);
      setError(null);
      
      const response = await imageClient.copyImageProperties({
        sourceImageId: imageId,
        targetImageIds,
      });
      
      toast.success(`Properties synchronized to ${response.affectedImageIds.length} image versions (${response.propertiesCopied} properties copied)`);
      setShowInheritanceModal(false);
    } catch (err) {
      const propertyError = parsePropertyError(err);
      setError(propertyError);
      toast.error(getErrorToastMessage(propertyError));
      console.error('Error synchronizing properties:', err);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleInheritanceCancel = () => {
    setShowInheritanceModal(false);
    setSourceImage(null);
  };

  useEffect(() => {
    loadProperties();
  }, [imageId]);

  if (loading) {
    return (
      <div css={spacing.top.medium}>
        <LoadingState message="Loading properties..." size="medium" />
      </div>
    );
  }

  if (showAddForm) {
    return (
      <div css={css`font-size: 13px; opacity: 0.7;`}>
        <h3 css={[spacing.bottom.medium, css`font-size: 13px; opacity: 0.7;`]}>
          {editingProperty ? 'Edit Property' : 'Add New Property'}
        </h3>
        <AdminImagePropertyForm
          property={editingProperty || undefined}
          onSave={editingProperty 
            ? (property) => handlePropertyUpdate(editingProperty.imagePropertyId, property)
            : handlePropertyAdd
          }
          onCancel={handleCancelEdit}
          isEditing={!!editingProperty}
          loading={operationLoading}
        />
      </div>
    );
  }

  return (
    <div css={css`font-size: 13px; opacity: 0.7;`}>
      {/* Error Display */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={handleRetryOperation}
          onDismiss={handleDismissError}
        />
      )}

      <div css={[spacing.bottom.medium]} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 css={css`font-size: 13px; opacity: 0.7;`}>Image Properties ({properties.length})</h3>
          {protocolName && semanticVersion && (
            <div css={css`font-size: 13px; opacity: 0.7;`} style={{ marginTop: '4px' }}>
              {protocolName} - Version {semanticVersion}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="small"
            style="secondary"
            onClick={handleShowInheritance}
            disabled={operationLoading || properties.length === 0}
            loading={operationLoading}
          >
            Sync to Other Versions
          </Button>
          <Button
            size="small"
            style="primary"
            onClick={() => setShowAddForm(true)}
            disabled={operationLoading}
            loading={operationLoading}
          >
            Add Property
          </Button>
        </div>
      </div>
      
      <AdminImagePropertiesList
        properties={properties}
        onEdit={handleEditProperty}
        onDelete={handlePropertyDelete}
        loading={operationLoading}
      />
      
      {/* Property Inheritance Modal */}
      {sourceImage && (
        <PropertyInheritanceModal
          isOpen={showInheritanceModal}
          sourceImage={sourceImage}
          onConfirm={handleInheritanceConfirm}
          onCancel={handleInheritanceCancel}
          loading={operationLoading}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        confirmVariant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        loading={operationLoading}
      />
    </div>
  );
};