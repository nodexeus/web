import { css } from '@emotion/react';

export const styles = {
  errorContainer: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    margin: 1rem 0;
    min-height: 200px;
    text-align: center;
  `,

  errorIcon: css`
    font-size: 3rem;
    margin-bottom: 1rem;
  `,

  errorTitle: css`
    color: #dc2626;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
  `,

  errorMessage: css`
    color: #7f1d1d;
    font-size: 1rem;
    line-height: 1.5;
    margin: 0 0 1.5rem 0;
    max-width: 500px;
  `,

  errorDetails: css`
    margin: 1rem 0;
    text-align: left;
    width: 100%;
    max-width: 600px;
    background-color: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  `,

  errorDetailsSummary: css`
    padding: 0.75rem 1rem;
    background-color: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    cursor: pointer;
    font-weight: 500;
    color: #374151;

    &:hover {
      background-color: #f3f4f6;
    }
  `,

  errorDetailsContent: css`
    padding: 1rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.4;
    color: #374151;
    background-color: #fff;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  `,

  errorActions: css`
    display: flex;
    gap: 0.75rem;
    margin: 1.5rem 0 1rem 0;
    flex-wrap: wrap;
    justify-content: center;
  `,

  button: css`
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
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

  primaryButton: css`
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

  secondaryButton: css`
    background-color: #fff;
    color: #374151;
    border-color: #d1d5db;

    &:hover:not(:disabled) {
      background-color: #f9fafb;
      border-color: #9ca3af;
    }

    &:active:not(:disabled) {
      background-color: #f3f4f6;
      border-color: #6b7280;
    }
  `,

  tertiaryButton: css`
    background-color: transparent;
    color: #6b7280;
    border-color: transparent;

    &:hover:not(:disabled) {
      color: #374151;
      background-color: #f9fafb;
    }

    &:active:not(:disabled) {
      color: #111827;
      background-color: #f3f4f6;
    }
  `,

  errorHelp: css`
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #fecaca;
  `,

  errorHelpText: css`
    color: #7f1d1d;
    font-size: 0.875rem;
    margin: 0;
    font-style: italic;
  `,
};
