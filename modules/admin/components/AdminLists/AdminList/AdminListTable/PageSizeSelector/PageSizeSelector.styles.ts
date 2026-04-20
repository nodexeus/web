// PageSizeSelector.styles.ts
import { css } from '@emotion/react';
import { ITheme } from 'types/theme';

export const styles = {
  container: css`
    display: flex;
    align-items: center;
    margin-right: 16px;
  `,
  label: (theme: ITheme) => css`
    margin-right: 8px;
    font-size: 12px;
    white-space: nowrap;
    color: ${theme.colorDefault};
  `,
  select: (theme: ITheme) => css`
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid ${theme.colorBorder};
    background-color: ${theme.colorBackground};
    color: ${theme.colorDefault};
    cursor: pointer;
    font-size: 12px;
    
    option {
      background-color: ${theme.colorBackground};
      color: ${theme.colorDefault};
    }
  `
};