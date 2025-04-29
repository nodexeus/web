import { ThemeProvider } from '@emotion/react';
import { SerializedStyles } from '@emotion/serialize';

export type ITheme = {
  id?: string;
  fontPrimary: string;
  colorPrimary: string;
  colorPrimaryText: string;
  colorAccent: string;
  colorDefault: string;
  colorCard: string;
  colorBorder: string;
  colorBorderGrey: string;
  colorDarkGrey: string;
  colorInput: string;
  colorTooltip: string;
  colorInput: string;
  colorInputOutline: string;
  colorLabel: string;
  colorPlaceholder: string;
  colorActive: string;
  colorHover: string;
  colorText: string;
  colorTextGrey: string;
  colorBackground: string;
  colorLightGrey: string;
  colorDanger: string;
  colorNote: string;
  colorOverlay: string;
  colorSuccess: string;
  colorTertiary: string;
  colorWarning: string;
  colorDark: string;
  screenXs: string;
  screenSm: string;
  screenMd: string;
  screenLg: string;
  screenXl: string;
  screenXxl: string;
};

declare module '@emotion/react' {
  export interface Theme extends ITheme, ThemeProvider {}
}

export type SerializedStylesWTheme =
  | SerializedStyles
  | ((theme: ITheme) => SerializedStyles);

export type SerializedStylesAll =
  | SerializedStylesWTheme
  | SerializedStylesWTheme[];
