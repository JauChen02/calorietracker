export const typography = {
  // Font sizes (sp)
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,

  // Font weights (React Native accepts string literals)
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // Line heights (px)
  lineHeightTight: 20,
  lineHeightBase: 24,
  lineHeightRelaxed: 28,
} as const;

export type Typography = typeof typography;
