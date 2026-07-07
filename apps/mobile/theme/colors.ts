export const lightColors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F9FAFB',

  // Brand
  primary: '#3B82F6',
  primaryText: '#FFFFFF',

  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // Borders
  border: '#E5E7EB',

  // Semantic
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabIconActive: '#3B82F6',
  tabIconInactive: '#9CA3AF',
} as const;

export const darkColors = {
  // Backgrounds
  background: '#0F172A',
  surface: '#1E293B',

  // Brand
  primary: '#60A5FA',
  primaryText: '#0F172A',

  // Text
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',

  // Borders
  border: '#334155',

  // Semantic
  error: '#F87171',
  success: '#34D399',
  warning: '#FCD34D',

  // Tab bar
  tabBar: '#0F172A',
  tabBarBorder: '#1E293B',
  tabIconActive: '#60A5FA',
  tabIconInactive: '#64748B',
} as const;

export type ColorScheme = typeof lightColors;
