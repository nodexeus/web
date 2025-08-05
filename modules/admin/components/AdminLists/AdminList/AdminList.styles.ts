import { css } from '@emotion/react';

export const styles = {
  card: css`
    display: flex;
    flex-direction: column;
  `,
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
  `,
  errorMessage: css`
    color: #dc2626;
    font-size: 1rem;
    margin-bottom: 1rem;
    text-align: center;
  `,
  retryButton: css`
    background-color: #dc2626;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;

    &:hover {
      background-color: #b91c1c;
    }

    &:focus {
      outline: 2px solid #dc2626;
      outline-offset: 2px;
    }
  `,
};
