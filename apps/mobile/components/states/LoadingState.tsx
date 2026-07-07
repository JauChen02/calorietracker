import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

type LoadingStateProps = {
  message?: string;
  style?: ViewStyle;
};

export function LoadingState({ message, style }: LoadingStateProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator
        size="large"
        color={colors.primary}
        accessibilityLabel={message ?? 'Loading'}
      />
      {message !== undefined && (
        <Text
          style={[
            styles.message,
            {
              color: colors.textSecondary,
              fontSize: typography.sm,
              marginTop: spacing.md,
            },
          ]}
        >
          {message}
        </Text>
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
  message: { textAlign: 'center' },
});
