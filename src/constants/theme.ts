import { DarkTheme, Theme } from '@react-navigation/native';
import { COLORS } from './colors';

export const AppTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.accent,
    background: COLORS.primaryDark,
    card: COLORS.primary,
    text: COLORS.white,
    border: COLORS.primaryDark,
    notification: COLORS.accentLight,
  },
};
