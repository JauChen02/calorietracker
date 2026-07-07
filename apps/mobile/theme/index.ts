import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export { lightColors, darkColors } from './colors';
export type { ColorScheme } from './colors';
export { spacing } from './spacing';
export type { Spacing } from './spacing';
export { typography } from './typography';
export type { Typography } from './typography';

export type Theme = {
  colors: typeof lightColors;
  spacing: typeof spacing;
  typography: typeof typography;
  isDark: boolean;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme: Theme = {
    colors: isDark ? darkColors : lightColors,
    spacing,
    typography,
    isDark,
  };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be called inside ThemeProvider');
  return ctx;
}
