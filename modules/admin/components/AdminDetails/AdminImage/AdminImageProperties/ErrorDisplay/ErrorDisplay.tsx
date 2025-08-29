import { useState } from 'react';
import { spacing } from 'styles/utils.spacing.styles';
import { Button } from '@shared/components';
import { PropertyError, shouldShowErrorDetails, isRetryableError } from '../../../../../utils/errorHandling';

interface ErrorDisplayProps {
  error: PropertyError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorDisplay = ({ error, onRetry, onDismiss, className }: ErrorDisplayProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const showRetryButton = isRetryableError(error) && onRetry;
  const showDetailsButton = shouldShowErrorDetails(error);
  
  return (
    <div 
      className={className}
      style={{
        padding: '16px',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        color: '#721c24',
        marginBottom: '16px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px', marginRight: '8px' }}>⚠️</span>
            <strong>{error.message}</strong>
          </div>
          
          {showDetailsButton && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#721c24',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: 0
                }}
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
              
              {showDetails && error.details && (
                <div css={spacing.top.small} style={{ 
                  fontSize: '14px',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  padding: '8px',
                  borderRadius: '4px',
                  marginTop: '8px'
                }}>
                  {error.details}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
          {showRetryButton && (
            <Button
              size="small"
              style="warning"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
          
          {onDismiss && (
            <Button
              size="small"
              style="outline"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};