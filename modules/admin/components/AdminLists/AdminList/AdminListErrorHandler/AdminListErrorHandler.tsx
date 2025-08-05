import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  AdminListError,
  AdminListErrorType,
  ErrorSeverity,
} from '../../../../utils/errorHandling';
import { useAdminListErrorHandling } from '../../../../hooks/useAdminListErrorHandling';
import { styles } from './AdminListErrorHandler.styles';

/**
 * Props for the error handler component
 */
interface AdminListErrorHandlerProps {
  children: React.ReactNode;
  onError?: (error: AdminListError) => void;
  onRetry?: () => Promise<void>;
  showErrorSummary?: boolean;
  maxVisibleErrors?: number;
}

/**
 * Error summary component
 */
const ErrorSummary: FunctionComponent<{
  errors: AdminListError[];
  onClearAll: () => void;
  onClearError: (errorId: string) => void;
  onRetry?: () => Promise<void>;
  maxVisible: number;
}> = ({ errors, onClearAll, onClearError, onRetry, maxVisible }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const visibleErrors = isExpanded ? errors : errors.slice(0, maxVisible);
  const hasMoreErrors = errors.length > maxVisible;

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return '🚨';
      case ErrorSeverity.HIGH:
        return '❌';
      case ErrorSeverity.MEDIUM:
        return '⚠️';
      case ErrorSeverity.LOW:
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  const getErrorTypeLabel = (type: AdminListErrorType) => {
    switch (type) {
      case AdminListErrorType.NETWORK_ERROR:
        return 'Network';
      case AdminListErrorType.API_ERROR:
        return 'API';
      case AdminListErrorType.VALIDATION_ERROR:
        return 'Validation';
      case AdminListErrorType.FILTER_ERROR:
        return 'Filter';
      case AdminListErrorType.PAGINATION_ERROR:
        return 'Pagination';
      case AdminListErrorType.STATE_SYNC_ERROR:
        return 'Sync';
      default:
        return 'Unknown';
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div css={styles.errorSummary}>
      <div css={styles.errorSummaryHeader}>
        <div css={styles.errorSummaryTitle}>
          <span css={styles.errorSummaryIcon}>⚠️</span>
          <span>
            {errors.length} Error{errors.length !== 1 ? 's' : ''} Occurred
          </span>
        </div>
        <div css={styles.errorSummaryActions}>
          {onRetry && (
            <button
              css={[styles.button, styles.retryButton]}
              onClick={handleRetry}
              disabled={isRetrying}
              type="button"
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
          <button
            css={[styles.button, styles.clearButton]}
            onClick={onClearAll}
            type="button"
          >
            Clear All
          </button>
          {hasMoreErrors && (
            <button
              css={[styles.button, styles.expandButton]}
              onClick={() => setIsExpanded(!isExpanded)}
              type="button"
            >
              {isExpanded ? 'Show Less' : `Show All (${errors.length})`}
            </button>
          )}
        </div>
      </div>

      <div css={styles.errorList}>
        {visibleErrors.map((error) => (
          <div key={error.id} css={styles.errorItem}>
            <div css={styles.errorItemHeader}>
              <span css={styles.errorItemIcon}>
                {getErrorIcon(error.severity)}
              </span>
              <span css={styles.errorItemType}>
                {getErrorTypeLabel(error.type)}
              </span>
              <span css={styles.errorItemTime}>
                {new Date(error.timestamp).toLocaleTimeString()}
              </span>
              <button
                css={[styles.button, styles.clearItemButton]}
                onClick={() => onClearError(error.id)}
                type="button"
                aria-label="Clear this error"
              >
                ×
              </button>
            </div>
            <div css={styles.errorItemMessage}>{error.userMessage}</div>
            {error.context && Object.keys(error.context).length > 0 && (
              <details css={styles.errorItemDetails}>
                <summary css={styles.errorItemDetailsSummary}>
                  Technical Details
                </summary>
                <pre css={styles.errorItemDetailsContent}>
                  {JSON.stringify(error.context, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main error handler component that wraps admin list operations
 * with comprehensive error handling and recovery options
 */
export const AdminListErrorHandler: FunctionComponent<
  AdminListErrorHandlerProps
> = ({
  children,
  onError,
  onRetry,
  showErrorSummary = true,
  maxVisibleErrors = 3,
}) => {
  const {
    errors,
    lastError,
    isRetrying,
    hasErrors,
    clearErrors,
    clearError,
    retryLastOperation,
  } = useAdminListErrorHandling({
    showToasts: true,
    logErrors: true,
    autoRetry: false,
  });

  // Call custom error handler when new errors occur
  useEffect(() => {
    if (lastError && onError) {
      onError(lastError);
    }
  }, [lastError, onError]);

  const handleRetry = useCallback(async () => {
    if (onRetry) {
      await onRetry();
    } else if (lastError?.retryable) {
      await retryLastOperation(async () => {
        // This would need to be provided by the parent component
        // For now, we'll just clear the error
        console.log('Retrying last operation...');
      });
    }
  }, [onRetry, lastError, retryLastOperation]);

  return (
    <div css={styles.container}>
      {showErrorSummary && hasErrors && (
        <ErrorSummary
          errors={errors}
          onClearAll={clearErrors}
          onClearError={clearError}
          onRetry={handleRetry}
          maxVisible={maxVisibleErrors}
        />
      )}
      {children}
    </div>
  );
};

/**
 * Higher-order component for wrapping components with error handling
 */
export const withAdminListErrorHandling = <P extends object>(
  Component: React.ComponentType<P>,
  errorHandlerProps?: Partial<AdminListErrorHandlerProps>,
) => {
  const WrappedComponent = (props: P) => {
    return (
      <AdminListErrorHandler {...errorHandlerProps}>
        <Component {...(props as any)} />
      </AdminListErrorHandler>
    );
  };

  WrappedComponent.displayName = `withAdminListErrorHandling(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
};
