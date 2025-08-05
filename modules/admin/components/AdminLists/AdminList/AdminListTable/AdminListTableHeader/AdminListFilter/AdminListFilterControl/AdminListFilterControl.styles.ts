import { css } from '@emotion/react';
import { ITheme } from 'types/theme';

export const styles = {
  item: css`
    word-break: break-word;
    :hover {
      background: rgb(255 255 255 / 5%);
    }
  `,
  scrollbar: css`
    max-height: 260px;
    height: max-content;

    ::-webkit-scrollbar-track {
      background: rgb(255 255 255 / 10%);
    }
  `,

  // Loading states
  loadingContainer: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    min-height: 80px;
  `,
  loadingSpinner: css`
    width: 20px;
    height: 20px;
    border: 2px solid rgb(255 255 255 / 20%);
    border-top: 2px solid rgb(255 255 255 / 80%);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 8px;

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `,
  loadingText: css`
    font-size: 12px;
    color: rgb(255 255 255 / 60%);
  `,

  // Error states
  errorContainer: css`
    display: flex;
    flex-direction: column;
    padding: 16px;
    background: rgb(220 38 38 / 10%);
    border: 1px solid rgb(220 38 38 / 20%);
    border-radius: 4px;
    margin: 8px;
  `,
  errorMessage: css`
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;
  `,
  errorText: css`
    font-size: 13px;
    font-weight: 500;
    color: rgb(220 38 38);
    margin-bottom: 4px;
  `,
  errorDetails: css`
    font-size: 11px;
    color: rgb(220 38 38 / 80%);
    line-height: 1.4;
  `,
  retryButton: css`
    align-self: flex-start;
    font-size: 11px;
    padding: 4px 8px;
  `,

  // Empty state
  emptyContainer: css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    min-height: 60px;
  `,
  emptyText: css`
    font-size: 12px;
    color: rgb(255 255 255 / 50%);
    font-style: italic;
  `,

  // Filter actions
  actionsContainer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-top: 1px solid rgb(255 255 255 / 10%);
    background: rgb(255 255 255 / 2%);
  `,
  resetButton: css`
    font-size: 11px;
    padding: 4px 8px;
    opacity: 0.9;

    &:hover {
      opacity: 1;
    }
  `,
  filterCount: css`
    font-size: 11px;
    color: rgb(255 255 255 / 60%);
    font-weight: 500;
  `,

  // Enhanced item states
  itemDisabled: css`
    opacity: 0.5;
    pointer-events: none;
  `,
  itemLoading: css`
    opacity: 0.7;
    transition: opacity 0.2s ease;
  `,

  // Success feedback
  successFeedback: css`
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: rgb(34 197 94 / 10%);
    border: 1px solid rgb(34 197 94 / 20%);
    border-radius: 4px;
    margin: 8px;
    font-size: 12px;
    color: rgb(34 197 94);
  `,
};
