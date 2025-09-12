import { css } from '@emotion/react';
import { ITheme } from 'types/theme';

export const styles = {
  section: css`
    padding-bottom: 40px;
  `,

  header: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  `,

  actions: css`
    display: flex;
    gap: 8px;
  `,
};