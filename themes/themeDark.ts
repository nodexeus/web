import { themeDefault } from './themeDefault';
import { ITheme } from 'types/theme';

export const themeDark: ITheme = {
  ...themeDefault,
  id: 'dark',
  colorPrimary: '#e84326',
  colorPrimaryText: '#121212',
  colorBorder: '#2a2a2a',
  colorLabel: '#e84326',
  colorDefault: '#a7a7a7',
  colorActive: '#363938',
  colorHover: '#363938',
  colorText: '#a3a3a3',
  colorCard: '#1f1f1f',
  colorPlaceholder: '#A5A8A3',
  colorBackground: '#101010',
  colorLightGrey: '#1f1f1f',
};
