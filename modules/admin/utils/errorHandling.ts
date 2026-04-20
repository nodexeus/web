import { toast } from 'react-toastify';

/**
 * Error types for admin list operations
 */
export enum AdminListErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILTER_ERROR = 'FILTER_ERROR',
  PAGINATION_ERROR = 'PAGINATION_ERROR',
  STATE_SYNC_ERROR = 'STATE_SYNC_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Structured error information
 */
export interface AdminListError {
  id: string;
  type: AdminListErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  timestamp: number;
  context?: Record<string, any>;
  originalError?: Error;
  retryable: boolean;
  userMessage: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: AdminListErrorType[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    AdminListErrorType.NETWORK_ERROR,
    AdminListErrorType.API_ERROR,
  ],
};

/**
 * Error recovery options
 */
export interface ErrorRecoveryOptions {
  showToast: boolean;
  logError: boolean;
  reportError: boolean;
  fallbackValue?: any;
  onError?: (error: AdminListError) => void;
  onRetry?: (attempt: number) => void;
  onRecovery?: (result: any) => void;
}

/**
 * Default error recovery options
 */
export const DEFAULT_RECOVERY_OPTIONS: ErrorRecoveryOptions = {
  showToast: true,
  logError: true,
  reportError: false,
};

/**
 * Creates a structured error from various error sources
 */
export const createAdminListError = (
  error: unknown,
  type: AdminListErrorType = AdminListErrorType.UNKNOWN_ERROR,
  context?: Record<string, any>,
): AdminListError => {
  const errorId = `error_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const timestamp = Date.now();

  let message = 'An unknown error occurred';
  let details: string | undefined;
  let originalError: Error | undefined;
  let severity = ErrorSeverity.MEDIUM;
  let retryable = false;

  // Extract error information based on error type
  if (error instanceof Error) {
    originalError = error;
    message = error.message;
    details = error.stack;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    // Handle API error responses
    const errorObj = error as any;
    if (errorObj.message) {
      message = errorObj.message;
    }
    if (errorObj.details) {
      details = errorObj.details;
    }
    if (errorObj.status || errorObj.statusCode) {
      context = { ...context, status: errorObj.status || errorObj.statusCode };
    }
  }

  // Determine severity and retryability based on error type
  switch (type) {
    case AdminListErrorType.NETWORK_ERROR:
      severity = ErrorSeverity.HIGH;
      retryable = true;
      break;
    case AdminListErrorType.API_ERROR:
      severity = ErrorSeverity.HIGH;
      retryable = true;
      break;
    case AdminListErrorType.VALIDATION_ERROR:
      severity = ErrorSeverity.MEDIUM;
      retryable = false;
      break;
    case AdminListErrorType.FILTER_ERROR:
      severity = ErrorSeverity.LOW;
      retryable = true;
      break;
    case AdminListErrorType.PAGINATION_ERROR:
      severity = ErrorSeverity.LOW;
      retryable = true;
      break;
    case AdminListErrorType.STATE_SYNC_ERROR:
      severity = ErrorSeverity.MEDIUM;
      retryable = true;
      break;
    default:
      severity = ErrorSeverity.MEDIUM;
      retryable = false;
  }

  // Generate user-friendly messages
  const userMessage = getUserFriendlyMessage(type, message, context);

  return {
    id: errorId,
    type,
    severity,
    message,
    details,
    timestamp,
    context,
    originalError,
    retryable,
    userMessage,
  };
};

/**
 * Generates user-friendly error messages
 */
const getUserFriendlyMessage = (
  type: AdminListErrorType,
  originalMessage: string,
  context?: Record<string, any>,
): string => {
  switch (type) {
    case AdminListErrorType.NETWORK_ERROR:
      return 'Unable to connect to the server. Please check your internet connection and try again.';

    case AdminListErrorType.API_ERROR:
      if (context?.status === 404) {
        return 'The requested data could not be found.';
      }
      if (context?.status === 403) {
        return 'You do not have permission to access this data.';
      }
      if (context?.status === 500) {
        return 'A server error occurred. Please try again later.';
      }
      return 'An error occurred while loading data. Please try again.';

    case AdminListErrorType.VALIDATION_ERROR:
      return 'The provided data is invalid. Please check your input and try again.';

    case AdminListErrorType.FILTER_ERROR:
      return 'An error occurred while applying filters. Please try adjusting your filters.';

    case AdminListErrorType.PAGINATION_ERROR:
      return 'An error occurred while navigating pages. Please try again.';

    case AdminListErrorType.STATE_SYNC_ERROR:
      return 'An error occurred while saving your preferences. Some settings may not be preserved.';

    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Logs error details for debugging
 */
export const logAdminListError = (error: AdminListError): void => {
  const logData = {
    errorId: error.id,
    type: error.type,
    severity: error.severity,
    message: error.message,
    timestamp: new Date(error.timestamp).toISOString(),
    context: error.context,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // Log based on severity
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      console.error('🚨 CRITICAL Admin List Error:', logData);
      break;
    case ErrorSeverity.HIGH:
      console.error('❌ HIGH Admin List Error:', logData);
      break;
    case ErrorSeverity.MEDIUM:
      console.warn('⚠️ MEDIUM Admin List Error:', logData);
      break;
    case ErrorSeverity.LOW:
      console.info('ℹ️ LOW Admin List Error:', logData);
      break;
  }

  // Log original error if available
  if (error.originalError) {
    console.error('Original Error:', error.originalError);
  }

  // Log stack trace if available
  if (error.details) {
    console.error('Error Details:', error.details);
  }
};

/**
 * Shows user-friendly error toast notifications
 */
export const showErrorToast = (error: AdminListError): void => {
  const toastOptions = {
    toastId: error.id,
    autoClose:
      error.severity === ErrorSeverity.CRITICAL ? (false as const) : 5000,
  };

  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      toast.error(error.userMessage, toastOptions);
      break;
    case ErrorSeverity.HIGH:
      toast.error(error.userMessage, toastOptions);
      break;
    case ErrorSeverity.MEDIUM:
      toast.warning(error.userMessage, toastOptions);
      break;
    case ErrorSeverity.LOW:
      toast.info(error.userMessage, toastOptions);
      break;
  }
};

/**
 * Calculates delay for retry attempts with exponential backoff
 */
const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
  const delay =
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
};

/**
 * Determines if an error is retryable
 */
const isRetryableError = (
  error: AdminListError,
  config: RetryConfig,
): boolean => {
  return error.retryable && config.retryableErrors.includes(error.type);
};

/**
 * Executes a function with retry logic and error handling
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  retryConfig: Partial<RetryConfig> = {},
  recoveryOptions: Partial<ErrorRecoveryOptions> = {},
): Promise<T> => {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  const options = { ...DEFAULT_RECOVERY_OPTIONS, ...recoveryOptions };

  let lastError: AdminListError | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();

      // If we had previous errors but now succeeded, log recovery
      if (lastError && options.onRecovery) {
        options.onRecovery(result);
      }

      return result;
    } catch (error) {
      // Create structured error
      const adminError = createAdminListError(
        error,
        AdminListErrorType.API_ERROR,
        { operation: operationName, attempt },
      );

      lastError = adminError;

      // Log error if enabled
      if (options.logError) {
        logAdminListError(adminError);
      }

      // Call custom error handler
      if (options.onError) {
        options.onError(adminError);
      }

      // Check if we should retry
      const shouldRetry =
        attempt < config.maxAttempts && isRetryableError(adminError, config);

      if (shouldRetry) {
        // Call retry callback
        if (options.onRetry) {
          options.onRetry(attempt);
        }

        // Wait before retrying
        const delay = calculateRetryDelay(attempt, config);
        await new Promise((resolve) => setTimeout(resolve, delay));

        continue;
      }

      // Final attempt failed, handle error
      if (options.showToast) {
        showErrorToast(adminError);
      }

      // Return fallback value if provided (including undefined)
      if ('fallbackValue' in options) {
        return options.fallbackValue;
      }

      // Re-throw the structured error
      throw adminError;
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Unexpected error in retry logic');
};

/**
 * Wraps an async operation with comprehensive error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorType: AdminListErrorType,
  context?: Record<string, any>,
  recoveryOptions: Partial<ErrorRecoveryOptions> = {},
): Promise<T> => {
  const options = { ...DEFAULT_RECOVERY_OPTIONS, ...recoveryOptions };

  try {
    return await operation();
  } catch (error) {
    // Create structured error
    const adminError = createAdminListError(error, errorType, context);

    // Log error if enabled
    if (options.logError) {
      logAdminListError(adminError);
    }

    // Show toast if enabled
    if (options.showToast) {
      showErrorToast(adminError);
    }

    // Call custom error handler
    if (options.onError) {
      options.onError(adminError);
    }

    // Return fallback value if provided (including undefined)
    if ('fallbackValue' in options) {
      return options.fallbackValue;
    }

    // Re-throw the structured error
    throw adminError;
  }
};

/**
 * Error recovery utilities for specific admin list operations
 */
export const AdminListErrorRecovery = {
  /**
   * Handles filter operation errors with recovery
   */
  handleFilterError: async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>,
  ): Promise<T | undefined> => {
    return withErrorHandling(
      operation,
      AdminListErrorType.FILTER_ERROR,
      context,
      {
        showToast: true,
        logError: true,
        fallbackValue: undefined as T | undefined,
      },
    );
  },

  /**
   * Handles pagination operation errors with recovery
   */
  handlePaginationError: async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>,
  ): Promise<T | undefined> => {
    return withErrorHandling(
      operation,
      AdminListErrorType.PAGINATION_ERROR,
      context,
      {
        showToast: true,
        logError: true,
        fallbackValue: undefined as T | undefined,
      },
    );
  },

  /**
   * Handles API call errors with retry logic
   */
  handleApiCall: async <T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
  ): Promise<T | undefined> => {
    return withRetry(operation, operationName, DEFAULT_RETRY_CONFIG, {
      showToast: true,
      logError: true,
      fallbackValue: undefined as T | undefined,
      onRetry: (attempt) => {
        console.info(`Retrying ${operationName} (attempt ${attempt})`);
      },
    });
  },

  /**
   * Handles state synchronization errors
   */
  handleStateSyncError: async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>,
  ): Promise<T | undefined> => {
    return withErrorHandling(
      operation,
      AdminListErrorType.STATE_SYNC_ERROR,
      context,
      {
        showToast: false, // Don't show toast for sync errors as they're not critical
        logError: true,
        fallbackValue: undefined as T | undefined,
      },
    );
  },
};

/**
 * Error boundary integration helpers
 */
export const ErrorBoundaryHelpers = {
  /**
   * Creates an error handler for React error boundaries
   */
  createErrorBoundaryHandler:
    (context?: Record<string, any>) =>
    (error: Error, errorInfo: React.ErrorInfo) => {
      const adminError = createAdminListError(
        error,
        AdminListErrorType.UNKNOWN_ERROR,
        {
          ...context,
          componentStack: errorInfo.componentStack,
        },
      );

      logAdminListError(adminError);

      // Don't show toast in error boundary as it might cause infinite loops
      // The error boundary UI will handle user communication
    },

  /**
   * Creates reset keys for error boundary based on critical state
   */
  createResetKeys: (state: Record<string, any>): string[] => {
    return [
      state.page?.toString() || '1',
      state.pageSize?.toString() || '24',
      JSON.stringify(state.filters || {}),
      state.search || '',
    ];
  },
};
