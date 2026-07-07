import React, { type ComponentProps } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Button } from '../ui/Button';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

type EmptyStateProps = {
  icon?: IoniconsName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
};

export function EmptyState({
  icon = 'leaf-outline',
  title,
  message,
  action,
  style,
}: EmptyStateProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={48} color={colors.textTertiary} style={styles.icon} />
      <Text
        style={[
          styles.title,
          { color: colors.text, fontSize: typography.lg, fontWeight: typography.semibold },
        ]}
      >
        {title}
      </Text>
      {message !== undefined && (
        <Text
          style={[
            styles.message,
            {
              color: colors.textSecondary,
              fontSize: typography.sm,
              lineHeight: typography.lineHeightBase,
              marginTop: spacing.sm,
            },
          ]}
        >
          {message}
        </Text>
      )}
      {action !== undefined && (
        <Button
          label={action.label}
          onPress={action.onPress}
          style={{ marginTop: spacing.lg }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: { marginBottom: 16 },
  title: { textAlign: 'center' },
  message: { textAlign: 'center' },
});
