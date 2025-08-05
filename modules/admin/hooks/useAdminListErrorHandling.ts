import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AdminListError,
  AdminListErrorType,
  createAdminListError,
  logAdminListError,
  showErrorToast,
  withRetry,
  AdminListErrorRecovery,
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
  ErrorRecoveryOptions,
} from '../utils/errorHandling';

/**
 * Error handling state
 */
interface ErrorHandlingState {
  errors: AdminListError[];
  isRetrying: boolean;
  retryCount: number;
  lastError: AdminListError | null;
}

/**
 * Error handling configuration
 */
interface ErrorHandlingConfig {
  maxErrors: number;
  retryConfig: Partial<RetryConfig>;
  showToasts: boolean;
  logErrors: boolean;
  autoRetry: boolean;
}

/**
 * Default error handling configuration
 */
const DEFAULT_ERROR_CONFIG: ErrorHandlingConfig = {
  maxErrors: 10,
  retryConfig: DEFAULT_RETRY_CONFIG,
  showToasts: true,
  logErrors: true,
  autoRetry: true,
};

/**
 * Enhanced error handling hook for admin list operations
 * Provides comprehensive error handling, retry logic, and recovery options
 */
export const useAdminListErrorHandling = (
  config: Partial<ErrorHandlingConfig> = {},
) => {
  const errorConfig = { ...DEFAULT_ERROR_CONFIG, ...config };

  // Error state
  const [errorState, setErrorState] = useState<ErrorHandlingState>({
    errors: [],
    isRetrying: false,
    retryCount: 0,
    lastError: null,
  });

  // Refs for cleanup
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorQueueRef = useRef<AdminListError[]>([]);

  /**
   * Adds an error to the error queue
   */
  const addError = useCallback(
    (error: AdminListError) => {
      setErrorState((prev) => {
        const newErrors = [...prev.errors, error];

        // Limit error queue size
        if (newErrors.length > errorConfig.maxErrors) {
          newErrors.shift();
        }

        return {
          ...prev,
          errors: newErrors,
          lastError: error,
        };
      });

      // Log error if enabled
      if (errorConfig.logErrors) {
        logAdminListError(error);
      }

      // Show toast if enabled
      if (errorConfig.showToasts) {
        showErrorToast(error);
      }
    },
    [errorConfig.maxErrors, errorConfig.logErrors, errorConfig.showToasts],
  );

  /**
   * Clears all errors
   */
  const clearErrors = useCallback(() => {
    setErrorState({
      errors: [],
      isRetrying: false,
      retryCount: 0,
      lastError: null,
    });

    // Clear any pending retry timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Clears a specific error by ID
   */
  const clearError = useCallback((errorId: string) => {
    setErrorState((prev) => ({
      ...prev,
      errors: prev.errors.filter((error) => error.id !== errorId),
      lastError: prev.lastError?.id === errorId ? null : prev.lastError,
    }));
  }, []);

  /**
   * Handles filter operation errors
   */
  const handleFilterError = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: Record<string, any>,
    ): Promise<T | null> => {
      try {
        return await AdminListErrorRecovery.handleFilterError(
          operation,
          context,
        );
      } catch (error) {
        if (error instanceof Error || (error as any).type) {
          const adminError = error as AdminListError;
          addError(adminError);
        } else {
          const adminError = createAdminListError(
            error,
            AdminListErrorType.FILTER_ERROR,
            context,
          );
          addError(adminError);
        }
        return null;
      }
    },
    [addError],
  );

  /**
   * Handles pagination operation errors
   */
  const handlePaginationError = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: Record<string, any>,
    ): Promise<T | null> => {
      try {
        return await AdminListErrorRecovery.handlePaginationError(
          operation,
          context,
        );
      } catch (error) {
        if (error instanceof Error || (error as any).type) {
          const adminError = error as AdminListError;
          addError(adminError);
        } else {
          const adminError = createAdminListError(
            error,
            AdminListErrorType.PAGINATION_ERROR,
            context,
          );
          addError(adminError);
        }
        return null;
      }
    },
    [addError],
  );

  /**
   * Handles API call errors with retry logic
   */
  const handleApiCall = useCallback(
    async <T>(
      operation: () => Promise<T>,
      operationName: string,
      context?: Record<string, any>,
    ): Promise<T | null> => {
      try {
        setErrorState((prev) => ({ ...prev, isRetrying: true }));

        const result = await withRetry(
          operation,
          operationName,
          errorConfig.retryConfig,
          {
            showToast: errorConfig.showToasts,
            logError: errorConfig.logErrors,
            onRetry: (attempt) => {
              setErrorState((prev) => ({ ...prev, retryCount: attempt }));

              if (errorConfig.showToasts) {
                toast.info(
                  `Retrying ${operationName}... (attempt ${attempt})`,
                  {
                    toastId: `retry-${operationName}`,
                    autoClose: 2000,
                  },
                );
              }
            },
            onRecovery: () => {
              setErrorState((prev) => ({
                ...prev,
                isRetrying: false,
                retryCount: 0,
              }));

              if (errorConfig.showToasts) {
                toast.success(`${operationName} completed successfully`, {
                  toastId: `success-${operationName}`,
                  autoClose: 3000,
                });
              }
            },
          },
        );

        setErrorState((prev) => ({
          ...prev,
          isRetrying: false,
          retryCount: 0,
        }));

        return result;
      } catch (error) {
        setErrorState((prev) => ({
          ...prev,
          isRetrying: false,
          retryCount: 0,
        }));

        if (error instanceof Error || (error as any).type) {
          const adminError = error as AdminListError;
          addError(adminError);
        } else {
          const adminError = createAdminListError(
            error,
            AdminListErrorType.API_ERROR,
            { ...context, operation: operationName },
          );
          addError(adminError);
        }
        return null;
      }
    },
    [addError, errorConfig],
  );

  /**
   * Handles state synchronization errors
   */
  const handleStateSyncError = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: Record<string, any>,
    ): Promise<T | null> => {
      try {
        return await AdminListErrorRecovery.handleStateSyncError(
          operation,
          context,
        );
      } catch (error) {
        if (error instanceof Error || (error as any).type) {
          const adminError = error as AdminListError;
          addError(adminError);
        } else {
          const adminError = createAdminListError(
            error,
            AdminListErrorType.STATE_SYNC_ERROR,
            context,
          );
          addError(adminError);
        }
        return null;
      }
    },
    [addError],
  );

  /**
   * Wraps any operation with error handling
   */
  const withErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<T>,
      errorType: AdminListErrorType,
      context?: Record<string, any>,
    ): Promise<T | null> => {
      try {
        return await operation();
      } catch (error) {
        const adminError = createAdminListError(error, errorType, context);
        addError(adminError);
        return null;
      }
    },
    [addError],
  );

  /**
   * Manually retries the last failed operation
   */
  const retryLastOperation = useCallback(
    async (operation: () => Promise<any>): Promise<boolean> => {
      const { lastError } = errorState;

      if (!lastError || !lastError.retryable) {
        return false;
      }

      try {
        setErrorState((prev) => ({ ...prev, isRetrying: true }));

        await operation();

        // Clear the error that was successfully retried
        clearError(lastError.id);

        setErrorState((prev) => ({
          ...prev,
          isRetrying: false,
          retryCount: 0,
        }));

        if (errorConfig.showToasts) {
          toast.success('Operation completed successfully', {
            toastId: 'retry-success',
            autoClose: 3000,
          });
        }

        return true;
      } catch (error) {
        setErrorState((prev) => ({
          ...prev,
          isRetrying: false,
          retryCount: prev.retryCount + 1,
        }));

        const adminError = createAdminListError(error, lastError.type, {
          ...lastError.context,
          retryAttempt: errorState.retryCount + 1,
        });
        addError(adminError);

        return false;
      }
    },
    [errorState, clearError, addError, errorConfig.showToasts],
  );

  /**
   * Gets error statistics
   */
  const getErrorStats = useCallback(() => {
    const { errors } = errorState;

    const stats = {
      total: errors.length,
      byType: {} as Record<AdminListErrorType, number>,
      bySeverity: {} as Record<string, number>,
      retryable: 0,
      recent: errors.filter(
        (error) => Date.now() - error.timestamp < 5 * 60 * 1000, // Last 5 minutes
      ).length,
    };

    errors.forEach((error) => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

      // Count by severity
      stats.bySeverity[error.severity] =
        (stats.bySeverity[error.severity] || 0) + 1;

      // Count retryable errors
      if (error.retryable) {
        stats.retryable++;
      }
    });

    return stats;
  }, [errorState.errors]);

  /**
   * Exports error data for debugging
   */
  const exportErrorData = useCallback(() => {
    const { errors } = errorState;

    const exportData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      config: errorConfig,
      stats: getErrorStats(),
      errors: errors.map((error) => ({
        id: error.id,
        type: error.type,
        severity: error.severity,
        message: error.message,
        timestamp: new Date(error.timestamp).toISOString(),
        context: error.context,
        retryable: error.retryable,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }, [errorState.errors, errorConfig, getErrorStats]);

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    clearErrors();
  }, [clearErrors]);

  return {
    // State
    errors: errorState.errors,
    lastError: errorState.lastError,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    hasErrors: errorState.errors.length > 0,

    // Error handlers
    handleFilterError,
    handlePaginationError,
    handleApiCall,
    handleStateSyncError,
    withErrorHandling,

    // Error management
    addError,
    clearErrors,
    clearError,
    retryLastOperation,

    // Utilities
    getErrorStats,
    exportErrorData,
    cleanup,
  };
};
