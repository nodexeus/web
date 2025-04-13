import { css } from '@emotion/react';
import { breakpoints } from 'styles/variables.styles';
import { ITheme } from 'types/theme';

export const styles = {
  base: (theme: ITheme) => css`
    position: sticky;
    z-index: 4;
    top: 0;
    display: flex;
    align-items: center;
    background: #1f1f1f;
    height: 72px;
    min-height: 72px;
    max-height: 72px;
    border-bottom: 1px solid ${theme.colorBorder};
    user-select: none;

    h1 {
      font-size: 18px;
      margin-right: auto;
    }

    @media ${breakpoints.toXlrg} {
      padding-left: 36px;
    }
  `,
  wrapper: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
  `,
  breadcrumb: css`
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;

    @media ${breakpoints.toMed} {
      max-width: 240px;
    }
  `,
  button: (theme: ITheme) => css`
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;

    p {
      color: ${theme.colorDefault};
    }

    svg > path {
      fill: ${theme.colorLabel};
    }

    & :is(p, path) {
      transition: 0.3s;
    }

    :hover {
      p {
        color: ${theme.colorText};
      }

      svg path {
        fill: ${theme.colorText};
      }
    }
  `,
  title: (theme: ITheme) => css`
    display: flex;
    align-items: center;
    gap: 11px;
    font-size: 16px;
    color: ${theme.colorText};

    svg > path {
      fill: ${theme.colorDefault};
    }
  `,
  separator: (theme: ITheme) => css`
    display: flex;
    align-items: center;
    color: ${theme.colorLabel};
    padding: 0 8px;
    height: 22px;
    font-size: 20px;
    opacity: 0.6;
  `,
  rightWrapper: css`
    flex: 1 1 auto;
    display: flex;
    justify-content: flex-end;
  `,
  orgPicker: css`
    display: flex;
    align-items: center;

    @media ${breakpoints.toLrg} {
      display: none;
    }
  `,
  childTitle: css`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  `,
  copyWrapper: css`
    margin-left: 4px;
  `,
};
