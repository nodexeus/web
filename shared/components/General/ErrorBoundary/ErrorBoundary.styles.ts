import { css } from '@emotion/react';

export const styles = {
  wrapper: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 40px 20px;
  `,
  pageLevelWrapper: css`
    min-height: 100vh;
    width: 100%;
    background: var(--color-background, #1a1a2e);
  `,
  sectionLevelWrapper: css`
    min-height: 200px;
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
    background: var(--color-card-background, rgba(255, 255, 255, 0.05));
  `,
  widgetLevelWrapper: css`
    padding: 12px 16px;
  `,
  icon: css`
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.6;
  `,
  title: css`
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: var(--color-text-primary, rgba(255, 255, 255, 0.9));
  `,
  titleWidget: css`
    font-size: 14px;
    font-weight: 500;
    margin: 0 0 4px 0;
    color: var(--color-text-primary, rgba(255, 255, 255, 0.9));
  `,
  message: css`
    font-size: 14px;
    color: var(--color-text-secondary, rgba(255, 255, 255, 0.5));
    margin: 0 0 20px 0;
    max-width: 400px;
    line-height: 1.5;
  `,
  messageWidget: css`
    font-size: 13px;
    color: var(--color-text-secondary, rgba(255, 255, 255, 0.5));
    margin: 0 0 8px 0;
  `,
  button: css`
    padding: 10px 24px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    &:focus-visible {
      outline: 2px solid rgba(100, 140, 255, 0.8);
      outline-offset: 2px;
    }
  `,
  retryLink: css`
    font-size: 13px;
    color: rgba(100, 140, 255, 0.9);
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    text-decoration: underline;

    &:hover {
      color: rgba(100, 140, 255, 1);
    }

    &:focus-visible {
      outline: 2px solid rgba(100, 140, 255, 0.8);
      outline-offset: 2px;
    }
  `,
  details: css`
    margin-top: 16px;
    padding: 12px 16px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.2);
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    max-width: 500px;
    max-height: 120px;
    overflow: auto;
    text-align: left;
    font-family: monospace;
    white-space: pre-wrap;
    word-break: break-word;
  `,
};
