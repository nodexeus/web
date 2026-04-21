import { themeDefault } from './themeDefault';
import { ITheme } from 'types/theme';

export const themeDark: ITheme = {
  ...themeDefault,
  id: 'dark',
  colorPrimary: '#e84326',
  colorPrimaryText: '#121214',
  colorBorder: '#222224',
  colorLabel: '#e84326',
  colorDefault: '#a0a0a5',
  colorActive: '#2a2a2d',
  colorHover: '#2a2a2d',
  colorText: '#a0a0a5',
  colorCard: '#18181a',
  colorPlaceholder: '#6e6e73',
  colorBackground: '#0e0e10',
  colorLightGrey: '#18181a',
};
