import { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import { toast } from 'react-toastify';
import { Modal, Button } from '@shared/components';
import { spacing } from 'styles/utils.spacing.styles';
import { DateTime } from '@shared/components';

// TODO: Import these from the actual gRPC client once implemented
// import { imageClient } from '@modules/grpc';
// import { Image } from '@modules/grpc/library/blockjoy/v1/image';

// Temporary mock types until gRPC client is implemented
type Image = {
  imageId: string;
  protocolName: string;
  versionKey: string;
  buildVersion: number;
  propertyCount: number;
  createdAt: Date;
  orgId?: string;
  orgName?: string;
};

interface PropertyInheritanceModalProps {
  isOpen: boolean;
  sourceImage: Image;
  onConfirm: (targetImageIds: string[], syncType: 'newer' | 'all' | 'selected') => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const PropertyInheritanceModal = ({
  isOpen,
  sourceImage,
  onConfirm,
  onCancel,
  loading: externalLoading = false,
}: PropertyInheritanceModalProps) => {
  const [relatedImages, setRelatedImages] = useState<Image[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [syncType, setSyncType] = useState<'newer' | 'all' | 'selected'>('newer');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const isDisabled = loading || submitting || externalLoading;

  const loadRelatedImages = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual gRPC call once implemented
      // const response = await imageClient.getRelatedImages(sourceImage.imageId);
      // setRelatedImages(response.images || []);
      
      // Mock data for now - images with same protocol but different versions
      const mockRelatedImages: Image[] = [
        {
          imageId: 'img-eth-1000',
          protocolName: sourceImage.protocolName,
          versionKey: sourceImage.versionKey,
          buildVersion: 1000,
          propertyCount: 3,
          createdAt: new Date('2024-01-10'),
          orgId: sourceImage.orgId,
          orgName: sourceImage.orgName,
        },
        {
          imageId: 'img-eth-1002',
          protocolName: sourceImage.protocolName,
          versionKey: sourceImage.versionKey,
          buildVersion: 1002,
          propertyCount: 5,
          createdAt: new Date('2024-01-20'),
          orgId: sourceImage.orgId,
          orgName: sourceImage.orgName,
        },
        {
          imageId: 'img-eth-1003',
          protocolName: sourceImage.protocolName,
          versionKey: sourceImage.versionKey,
          buildVersion: 1003,
          propertyCount: 4,
          createdAt: new Date('2024-01-25'),
          orgId: sourceImage.orgId,
          orgName: sourceImage.orgName,
        },
      ].filter(img => img.imageId !== sourceImage.imageId);
      
      setRelatedImages(mockRelatedImages);
    } catch (error) {
      toast.error('Failed to load related images');
      console.error('Error loading related images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelection = (imageId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedImageIds);
    if (isSelected) {
      newSelected.add(imageId);
    } else {
      newSelected.delete(imageId);
    }
    setSelectedImageIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedImageIds.size === relatedImages.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(relatedImages.map(img => img.imageId)));
    }
  };

  const handleConfirm = async () => {
    let targetIds: string[] = [];
    
    switch (syncType) {
      case 'newer':
        targetIds = relatedImages
          .filter(img => img.buildVersion > sourceImage.buildVersion)
          .map(img => img.imageId);
        break;
      case 'all':
        targetIds = relatedImages.map(img => img.imageId);
        break;
      case 'selected':
        targetIds = Array.from(selectedImageIds);
        break;
    }

    if (targetIds.length === 0) {
      toast.error('No target images selected for synchronization');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(targetIds, syncType);
    } catch (error) {
      console.error('Error during property synchronization:', error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRelatedImages();
      setSelectedImageIds(new Set());
      setSyncType('newer');
    }
  }, [isOpen, sourceImage.imageId]);

  const newerImages = relatedImages.filter(img => img.buildVersion > sourceImage.buildVersion);
  const olderImages = relatedImages.filter(img => img.buildVersion < sourceImage.buildVersion);

  return (
    <Modal
      isOpen={isOpen}
      portalId="property-inheritance-modal"
      handleClose={onCancel}
      additionalStyles={[css`
        width: 800px;
        max-width: 90vw;
        max-height: 80vh;
        overflow: auto;
      `]}
    >
      <div css={css`font-size: 13px; opacity: 0.7;`} style={{ padding: '24px' }}>
        <h2 css={css`font-size: 13px; opacity: 0.7;`} style={{ margin: '0 0 16px 0' }}>
          Synchronize Properties Across Image Versions
        </h2>
        
        <div css={spacing.bottom.medium}>
          <p css={css`font-size: 13px; opacity: 0.7;`} style={{ margin: '0 0 8px 0' }}>
            Source Image: <strong>{sourceImage.protocolName} v{sourceImage.buildVersion}</strong>
          </p>
          <p css={css`font-size: 13px; opacity: 0.7;`} style={{ margin: 0 }}>
            This will copy properties from the source image to the selected target images.
          </p>
        </div>

        {loading ? (
          <div css={[spacing.top.medium, css`font-size: 13px; opacity: 0.7;`]}>Loading related images...</div>
        ) : relatedImages.length === 0 ? (
          <div css={[spacing.top.medium, css`font-size: 13px; opacity: 0.7;`]} style={{ 
            textAlign: 'center', 
            padding: '40px', 
            border: '1px dashed #ccc',
            borderRadius: '8px'
          }}>
            <p>No related image versions found.</p>
            <p style={{ marginTop: '8px' }}>
              Property synchronization is only available between different versions of the same protocol.
            </p>
          </div>
        ) : (
          <>
            {/* Sync Type Selection */}
            <div css={spacing.bottom.medium}>
              <h3 css={css`font-size: 13px; opacity: 0.7;`} style={{ margin: '0 0 12px 0' }}>Synchronization Options</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label css={css`font-size: 13px; opacity: 0.7;`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="syncType"
                    value="newer"
                    checked={syncType === 'newer'}
                    onChange={(e) => setSyncType(e.target.value as any)}
                  />
                  <span>
                    Apply to newer versions only ({newerImages.length} images)
                  </span>
                </label>
                <label css={css`font-size: 13px; opacity: 0.7;`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="syncType"
                    value="all"
                    checked={syncType === 'all'}
                    onChange={(e) => setSyncType(e.target.value as any)}
                  />
                  <span>
                    Apply to all related versions ({relatedImages.length} images)
                  </span>
                </label>
                <label css={css`font-size: 13px; opacity: 0.7;`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="syncType"
                    value="selected"
                    checked={syncType === 'selected'}
                    onChange={(e) => setSyncType(e.target.value as any)}
                  />
                  <span>
                    Apply to selected versions only
                  </span>
                </label>
              </div>
            </div>

            {/* Image Selection (only shown for 'selected' sync type) */}
            {syncType === 'selected' && (
              <div css={spacing.bottom.medium}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 css={css`font-size: 13px; opacity: 0.7;`} style={{ margin: 0 }}>Select Target Images</h3>
                  <Button
                    size="small"
                    style="outline"
                    onClick={handleSelectAll}
                  >
                    {selectedImageIds.size === relatedImages.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                
                <div style={{ 
                  maxHeight: '300px', 
                  overflow: 'auto',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px'
                }}>
                  {relatedImages.map((image, index) => (
                    <div
                      key={image.imageId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        borderBottom: index < relatedImages.length - 1 ? '1px solid #eee' : 'none',
                        backgroundColor: selectedImageIds.has(image.imageId) ? '#f8f9fa' : 'white'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedImageIds.has(image.imageId)}
                        onChange={(e) => handleImageSelection(image.imageId, e.target.checked)}
                        style={{ marginRight: '12px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div css={css`font-size: 13px; opacity: 0.7;`} style={{ fontWeight: 'bold' }}>
                          Build Version {image.buildVersion}
                          {image.buildVersion > sourceImage.buildVersion && (
                            <span style={{ color: '#28a745', marginLeft: '8px' }}>
                              (newer)
                            </span>
                          )}
                          {image.buildVersion < sourceImage.buildVersion && (
                            <span style={{ color: '#ffc107', marginLeft: '8px' }}>
                              (older)
                            </span>
                          )}
                        </div>
                        <div css={css`font-size: 13px; opacity: 0.7;`}>
                          {image.propertyCount} properties • Created <DateTime date={image.createdAt} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div css={spacing.bottom.medium} style={{ 
              padding: '12px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Summary</h4>
              <p style={{ margin: 0, fontSize: '14px' }}>
                {syncType === 'newer' && `Properties will be synchronized to ${newerImages.length} newer image versions.`}
                {syncType === 'all' && `Properties will be synchronized to all ${relatedImages.length} related image versions.`}
                {syncType === 'selected' && `Properties will be synchronized to ${selectedImageIds.size} selected image versions.`}
              </p>
              {syncType !== 'selected' && (
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
                  This will overwrite existing properties with the same keys in the target images.
                </p>
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button
            style="outline"
            onClick={onCancel}
            disabled={isDisabled}
          >
            Cancel
          </Button>
          <Button
            style="primary"
            onClick={handleConfirm}
            disabled={isDisabled || relatedImages.length === 0 || 
              (syncType === 'selected' && selectedImageIds.size === 0)}
            loading={submitting || externalLoading}
          >
            Synchronize Properties
          </Button>
        </div>
      </div>
    </Modal>
  );
};