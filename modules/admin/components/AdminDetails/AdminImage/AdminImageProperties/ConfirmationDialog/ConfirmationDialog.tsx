import { css } from '@emotion/react';
import { Modal, Button } from '@shared/components';
import { spacing } from 'styles/utils.spacing.styles';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading = false
}: ConfirmationDialogProps) => {
  const getConfirmButtonStyle = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'warning';
      case 'warning':
        return 'warning';
      default:
        return 'primary';
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      portalId="confirmation-dialog"
      handleClose={loading ? undefined : onCancel}
      additionalStyles={[css`
        width: 500px;
        max-width: 90vw;
      `]}
    >
      <div style={{ padding: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>
          {title}
        </h2>
        
        <div css={spacing.bottom.large} style={{ 
          fontSize: '16px',
          lineHeight: '1.5',
          whiteSpace: 'pre-line'
        }}>
          {message}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button
            style="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            style={getConfirmButtonStyle()}
            onClick={onConfirm}
            disabled={loading}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};