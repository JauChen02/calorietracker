import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

type Padding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: Padding;
};

export function Card({ children, style, padding = 'md' }: CardProps) {
  const { colors, spacing } = useTheme();

  const paddingMap: Record<Padding, number> = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: paddingMap[padding],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
});
