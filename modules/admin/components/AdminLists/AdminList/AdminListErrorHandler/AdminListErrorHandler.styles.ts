import { css } from '@emotion/react';

export const styles = {
  container: css`
    position: relative;
  `,

  errorSummary: css`
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    margin-bottom: 1rem;
    overflow: hidden;
  `,

  errorSummaryHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: #fee2e2;
    border-bottom: 1px solid #fecaca;
  `,

  errorSummaryTitle: css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: #7f1d1d;
  `,

  errorSummaryIcon: css`
    font-size: 1.25rem;
  `,

  errorSummaryActions: css`
    display: flex;
    gap: 0.5rem;
    align-items: center;
  `,

  errorList: css`
    max-height: 300px;
    overflow-y: auto;
  `,

  errorItem: css`
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #fecaca;

    &:last-child {
      border-bottom: none;
    }
  `,

  errorItemHeader: css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  `,

  errorItemIcon: css`
    font-size: 1rem;
  `,

  errorItemType: css`
    font-size: 0.75rem;
    font-weight: 500;
    color: #7f1d1d;
    background-color: #fecaca;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  `,

  errorItemTime: css`
    font-size: 0.75rem;
    color: #9ca3af;
    margin-left: auto;
  `,

  errorItemMessage: css`
    color: #7f1d1d;
    font-size: 0.875rem;
    line-height: 1.4;
    margin-bottom: 0.5rem;
  `,

  errorItemDetails: css`
    margin-top: 0.5rem;
  `,

  errorItemDetailsSummary: css`
    font-size: 0.75rem;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem 0;

    &:hover {
      color: #374151;
    }
  `,

  errorItemDetailsContent: css`
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.75rem;
    color: #374151;
    background-color: #f9fafb;
    padding: 0.5rem;
    border-radius: 4px;
    margin-top: 0.25rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  `,

  button: css`
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    border: 1px solid transparent;

    &:focus {
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,

  retryButton: css`
    background-color: #dc2626;
    color: white;
    border-color: #dc2626;

    &:hover:not(:disabled) {
      background-color: #b91c1c;
      border-color: #b91c1c;
    }

    &:active:not(:disabled) {
      background-color: #991b1b;
      border-color: #991b1b;
    }
  `,

  clearButton: css`
    background-color: #6b7280;
    color: white;
    border-color: #6b7280;

    &:hover:not(:disabled) {
      background-color: #4b5563;
      border-color: #4b5563;
    }

    &:active:not(:disabled) {
      background-color: #374151;
      border-color: #374151;
    }
  `,

  expandButton: css`
    background-color: transparent;
    color: #6b7280;
    border-color: #d1d5db;

    &:hover:not(:disabled) {
      color: #374151;
      background-color: #f9fafb;
      border-color: #9ca3af;
    }

    &:active:not(:disabled) {
      color: #111827;
      background-color: #f3f4f6;
      border-color: #6b7280;
    }
  `,

  clearItemButton: css`
    background-color: transparent;
    color: #9ca3af;
    border: none;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    line-height: 1;

    &:hover:not(:disabled) {
      color: #dc2626;
      background-color: #fee2e2;
    }

    &:active:not(:disabled) {
      color: #b91c1c;
      background-color: #fecaca;
    }
  `,
};
