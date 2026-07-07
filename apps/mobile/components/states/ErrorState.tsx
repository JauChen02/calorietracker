import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Button } from '../ui/Button';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
};

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  style,
}: ErrorStateProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={colors.error}
        style={styles.icon}
      />
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
      {onRetry !== undefined && (
        <Button
          label="Try again"
          onPress={onRetry}
          variant="secondary"
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
