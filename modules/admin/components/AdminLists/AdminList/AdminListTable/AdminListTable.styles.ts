import { css } from '@emotion/react';
import { rgba } from 'polished';
import { breakpoints } from 'styles/variables.styles';
import { ITheme } from 'types/theme';

export const styles = {
  tableWrapper: (hasPagination: boolean) => (theme: ITheme) =>
    css`
      position: relative;
      overflow: auto;
      flex: 1 1 auto;
      border-bottom: 1px solid ${theme.colorBorder};

      @media ${breakpoints.fromSml} {
        max-height: calc(100vh - 220px);
      }

      @media ${breakpoints.toSml} {
        max-height: calc(100dvh - ${hasPagination ? '220px' : '180px'});
      }

      *::-webkit-scrollbar,
      *::-webkit-scrollbar-track {
        border-radius: 8px;
      }

      ::-webkit-scrollbar {
        width: 8px;
        padding-right: 8px;
      }

      ::-webkit-scrollbar-corner {
        background: transparent;
      }

      ::-webkit-scrollbar-track {
        background: transparent;
      }

      ::-webkit-scrollbar-thumb {
        background: rgb(255 255 255 / 10%);
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgb(255 255 255 / 20%);
        cursor: pointer;
      }
    `,
  table: (isScrolledDown: boolean) => (theme: ITheme) =>
    css`
      text-align: left;
      width: 100%;
      min-width: 500px;
      font-size: 13px;
      border-collapse: collapse;

      @media ${breakpoints.toSml} {
        font-size: 16px;
      }

      th {
        color: ${rgba(theme.colorDefault || '#a7a7a7', 0.8)};
        font-weight: 400;
      }

      th > span {
        min-height: 36px;
        white-space: nowrap;
      }

      thead {
        position: sticky;
        z-index: 1;
        top: 0;
        background: ${theme.colorBackground};
        transition: 0.3s;

        ${isScrolledDown &&
        css`
          box-shadow: 0 10px 40px ${rgba(theme.colorBackground || '#000', 1)};
        `};

        ::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          right: 0;
          height: 1px;
          background: ${theme.colorBorder};
        }
      }

      thead tr th,
      tbody tr td {
        height: 54px;
        border-bottom: 1px solid ${theme.colorBorder};
      }

      thead tr th {
        user-select: none;
      }

      tbody tr td {
        vertical-align: middle;
        opacity: 0.7;
        padding: 0 12px 0 0;
        white-space: nowrap;
        text-overflow: ellipsis;
        transition-property: opacity, border-color;
        transition-duration: 0.3s;
      }

      tbody tr.selected {
        background: rgb(255 255 255 / 2%);
      }

      tbody tr.selected td {
        opacity: 1;
      }

      tbody tr:hover td {
        opacity: 1;
        border-bottom-color: rgb(255 255 255 / 24%);
      }

      tbody tr:hover .copy-button {
        opacity: 1;
        visibility: visible;
      }
    `,
  resizeLine:
    (isResizing: boolean, isTableHeaderHovered: boolean) => (theme: ITheme) =>
      css`
        position: fixed;
        z-index: 2;
        top: 0;
        left: 0;
        bottom: 0;
        width: 1px;
        background: ${theme.colorBorderGrey};
        transition-property: opacity, visibility;
        transition-duration: 0.175s;
        cursor: col-resize;
        pointer-events: none;

        opacity: 0;
        visibility: hidden;

        ${(isTableHeaderHovered || isResizing) &&
        css`
          opacity: 1;
          visibility: visible;
        `}

        :hover {
          opacity: 1;
          visibility: visible;
        }
      `,
  tableCell: (
    width: string,
    isLastColumn: boolean,
    isRowClickDisabled: boolean,
    isOverflowHidden: boolean,
  ) => css`
    ${!isLastColumn &&
    css`
      max-width: ${width};
      width: ${width};
    `};

    ${isOverflowHidden &&
    css`
      overflow: hidden;
    `}

    min-width: ${width};

    ${!isRowClickDisabled &&
    css`
      cursor: pointer;
    `}

    box-sizing: border-box;
  `,
  copyButton: css`
    opacity: 0;
    visibility: hidden;
    transition: 0.3s;
  `,
  copyTd: css`
    display: flex;
    align-items: center;
  `,
  emptyMessage: (theme: ITheme) => css`
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    padding: 24px 16px 24px 0;
    font-size: 14px;
    margin: 0;
    border-bottom: 1px solid ${theme.colorBorder};
  `,
  bottomRow: (theme: ITheme) => css`
    display: flex;

    @media ${breakpoints.fromSml} {
      position: sticky;
      bottom: 0;
      height: 60px;
      background: ${theme.colorBackground};
    }

    @media ${breakpoints.toSml} {
      flex-direction: column;
    }
  `,
  paginationWrapper: (theme: ITheme) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 20px;
    height: 56px;

    @media ${breakpoints.toSml} {
      transform: scale(0.875);
      justify-content: center;
      flex-direction: column;
    }
  `,
  paginationControls: css`
    display: flex;
    align-items: center;
    gap: 16px;

    @media ${breakpoints.toSml} {
      flex-direction: column;
    }
  `,
  pageSizeSelector: css`
    display: flex;
    align-items: center;
  `,
  pageSizeLabel: css`
    margin-right: 8px;
    font-size: 12px;
    white-space: nowrap;
  `,
  selectWrapper: css`
    position: relative;
    display: inline-block;
  `,
  pageSizeSelect: (theme: ITheme) => css`
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    padding: 4px 24px 4px 8px;
    border-radius: 4px;
    border: 1px solid ${theme.colorBorder};
    background-color: ${theme.colorBackground};
    color: ${theme.colorDefault};
    cursor: pointer;
    font-size: 12px;

    &:focus {
      outline: none;
      border-color: ${theme.colorPrimary};
    }

    /* Custom dropdown arrow */
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='4' viewBox='0 0 8 4'%3E%3Cpath fill='%235F615D' d='M0 0h8L4 4z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;

    option {
      background-color: ${theme.colorBackground};
      color: ${theme.colorDefault};
    }
  `,
  checkboxButton: css`
    background: transparent;
    border: 0;
    display: grid;
    place-items: center;
    height: 48px;
    width: 50px;
    cursor: pointer;

    :disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
};
