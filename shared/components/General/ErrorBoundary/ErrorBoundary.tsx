import { Component, ErrorInfo, ReactNode } from 'react';
/** @jsxImportSource @emotion/react */
import { styles } from './ErrorBoundary.styles';

type ErrorBoundaryLevel = 'page' | 'section' | 'widget';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: ErrorBoundaryLevel;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  renderPageFallback(): ReactNode {
    return (
      <div css={[styles.wrapper, styles.pageLevelWrapper]}>
        <div css={styles.icon}>⚠️</div>
        <h1 css={styles.title}>Something went wrong</h1>
        <p css={styles.message}>
          An unexpected error occurred. Please try reloading the page. If the
          problem persists, contact support.
        </p>
        <button css={styles.button} onClick={this.handleReload}>
          Reload Page
        </button>
        {process.env.NODE_ENV === 'development' && this.state.error && (
          <div css={styles.details}>
            {this.state.error.name}: {this.state.error.message}
          </div>
        )}
      </div>
    );
  }

  renderSectionFallback(): ReactNode {
    return (
      <div css={[styles.wrapper, styles.sectionLevelWrapper]}>
        <div css={styles.icon}>⚠️</div>
        <h2 css={styles.title}>Failed to load this section</h2>
        <p css={styles.message}>
          Something went wrong while loading this content. You can try again or
          navigate to a different page.
        </p>
        <button css={styles.button} onClick={this.handleRetry}>
          Try Again
        </button>
        {process.env.NODE_ENV === 'development' && this.state.error && (
          <div css={styles.details}>
            {this.state.error.name}: {this.state.error.message}
          </div>
        )}
      </div>
    );
  }

  renderWidgetFallback(): ReactNode {
    return (
      <div css={[styles.wrapper, styles.widgetLevelWrapper]}>
        <p css={styles.titleWidget}>Something went wrong</p>
        <p css={styles.messageWidget}>This component failed to load.</p>
        <button css={styles.retryLink} onClick={this.handleRetry}>
          Retry
        </button>
      </div>
    );
  }

  renderFallback(): ReactNode {
    if (this.props.fallback) return this.props.fallback;

    const level = this.props.level || 'section';

    switch (level) {
      case 'page':
        return this.renderPageFallback();
      case 'section':
        return this.renderSectionFallback();
      case 'widget':
        return this.renderWidgetFallback();
      default:
        return this.renderSectionFallback();
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderFallback();
    }

    return this.props.children;
  }
}
