import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/theme';

type Variant = 'primary' | 'secondary';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  labelStyle,
}: ButtonProps) {
  const { colors, typography, spacing } = useTheme();
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.72}
      style={[
        styles.button,
        {
          backgroundColor: isPrimary ? colors.primary : 'transparent',
          borderColor: colors.primary,
          borderWidth: isPrimary ? 0 : 1.5,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? colors.primaryText : colors.primary}
          accessibilityLabel="Loading"
        />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color: isPrimary ? colors.primaryText : colors.primary,
              fontSize: typography.base,
              fontWeight: typography.semibold,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
