import React, { Component, ErrorInfo, ReactNode } from 'react';
import { styles } from './AdminListErrorBoundary.styles';

/**
 * Error boundary props
 */
interface AdminListErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

/**
 * Error boundary state
 */
interface AdminListErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * Enhanced error boundary for admin list components
 * Provides comprehensive error handling with recovery options
 */
export class AdminListErrorBoundary extends Component<
  AdminListErrorBoundaryProps,
  AdminListErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: AdminListErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<AdminListErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('AdminListErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }

    // Log structured error data for debugging
    this.logErrorDetails(error, errorInfo);
  }

  componentDidUpdate(prevProps: AdminListErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys have changed
    if (
      hasError &&
      prevProps.resetKeys !== resetKeys &&
      resetKeys &&
      resetKeys.length > 0
    ) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevResetKeys[index],
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error state if any props have changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  /**
   * Logs detailed error information for debugging
   */
  private logErrorDetails = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      props: this.props.resetKeys,
    };

    // Log to console for development
    console.group('🚨 Admin List Error Boundary');
    console.error('Error Details:', errorDetails);
    console.error('Original Error:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();

    // In a real application, you might want to send this to an error reporting service
    // Example: errorReportingService.captureException(error, errorDetails);
  };

  /**
   * Resets the error boundary state
   */
  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  /**
   * Handles manual retry with delay
   */
  private handleRetry = () => {
    // Add a small delay to prevent immediate re-error
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 100);
  };

  /**
   * Handles page refresh as last resort
   */
  private handleRefresh = () => {
    window.location.reload();
  };

  /**
   * Copies error details to clipboard for support
   */
  private handleCopyError = async () => {
    const { error, errorInfo, errorId } = this.state;

    const errorDetails = {
      errorId,
      timestamp: new Date().toISOString(),
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace available',
      componentStack:
        errorInfo?.componentStack || 'No component stack available',
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    const errorText = JSON.stringify(errorDetails, null, 2);

    try {
      await navigator.clipboard.writeText(errorText);
      alert('Error details copied to clipboard');
    } catch (clipboardError) {
      console.error('Failed to copy error details:', clipboardError);
      // Fallback: show error details in a modal or alert
      alert(`Error details:\n\n${errorText}`);
    }
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div css={styles.errorContainer}>
          <div css={styles.errorIcon}>⚠️</div>
          <h3 css={styles.errorTitle}>Something went wrong</h3>
          <p css={styles.errorMessage}>
            An error occurred while loading the admin list. This might be due to
            a network issue or a temporary problem with the data.
          </p>

          {error && (
            <details css={styles.errorDetails}>
              <summary css={styles.errorDetailsSummary}>
                Technical Details (Error ID: {errorId})
              </summary>
              <pre css={styles.errorDetailsContent}>
                {error.message}
                {error.stack && (
                  <>
                    {'\n\nStack Trace:\n'}
                    {error.stack}
                  </>
                )}
              </pre>
            </details>
          )}

          <div css={styles.errorActions}>
            <button
              css={[styles.button, styles.primaryButton]}
              onClick={this.handleRetry}
              type="button"
            >
              Try Again
            </button>
            <button
              css={[styles.button, styles.secondaryButton]}
              onClick={this.handleRefresh}
              type="button"
            >
              Refresh Page
            </button>
            <button
              css={[styles.button, styles.tertiaryButton]}
              onClick={this.handleCopyError}
              type="button"
            >
              Copy Error Details
            </button>
          </div>

          <div css={styles.errorHelp}>
            <p css={styles.errorHelpText}>
              If this problem persists, please contact support with the error ID
              above.
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export const useAdminListErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
    hasError: !!error,
  };
};
