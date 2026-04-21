import { css } from '@emotion/react';
import { ITheme } from 'types/theme';

export const styles = {
  container: css`
    font-size: 13px;
    opacity: 0.7;
  `,
  emptyState: (theme: ITheme) => css`
    text-align: center;
    padding: 40px;
    border: 1px dashed ${theme.colorBorderGrey};
    border-radius: 8px;
    margin-top: 20px;
  `,
  groupContainer: css`
    margin-bottom: 20px;
  `,
  groupHeader: (theme: ITheme) => css`
    display: flex;
    align-items: center;
    padding: 12px;
    background: ${theme.colorInput};
    border: 1px solid ${theme.colorBorderGrey};
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 8px;
    color: ${theme.colorText};
  `,
  groupHeaderCollapsed: css`
    margin-bottom: 0;
  `,
  expandIcon: css`
    margin-right: 8px;
    transform: rotate(0deg);
    transition: transform 0.2s;
  `,
  expandIconRotated: css`
    transform: rotate(90deg);
  `,
  groupTitle: (theme: ITheme) => css`
    font-weight: 600;
    color: ${theme.colorText};
    font-size: 13px;
  `,
  groupCount: (theme: ITheme) => css`
    margin-left: 8px;
    color: ${theme.colorDefault};
    font-size: 13px;
  `,
  propertiesContainer: (theme: ITheme) => css`
    border: 1px solid ${theme.colorBorderGrey};
    border-top: none;
    border-radius: 0 0 4px 4px;
    background: ${theme.colorBackground};
  `,
  propertyItem: (theme: ITheme) => css`
    padding: 16px;
    background: ${theme.colorBackground};
    color: ${theme.colorText};
  `,
  propertyItemBorder: (theme: ITheme) => css`
    border-bottom: 1px solid ${theme.colorBorder};
  `,
  propertyHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  `,
  propertyContent: css`
    flex: 1;
  `,
  propertyTitleRow: css`
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  `,
  propertyTitle: (theme: ITheme) => css`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${theme.colorText};
  `,
  propertyKey: (theme: ITheme) => css`
    margin-left: 8px;
    background: ${theme.colorInput};
    color: ${theme.colorDefault};
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  `,
  propertyDescription: (theme: ITheme) => css`
    margin: 0 0 12px 0;
    font-size: 13px;
    color: ${theme.colorDefault};
  `,
  propertyDetailsGrid: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    font-size: 13px;
  `,
  propertyDetail: (theme: ITheme) => css`
    color: ${theme.colorDefault};
  `,
  propertyDetailLabel: (theme: ITheme) => css`
    font-weight: 600;
    color: ${theme.colorText};
  `,
  propertyActions: css`
    margin-left: 16px;
    display: flex;
    gap: 8px;
  `,
  resourceImpactRow: css`
    grid-column: 1 / -1;
  `,
};