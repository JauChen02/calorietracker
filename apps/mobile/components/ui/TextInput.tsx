import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  type TextInputProps as RNTextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';

type TextInputProps = RNTextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

/**
 * Themed text input with optional label and error message.
 * Handles focus ring color changes and Android-safe keyboard behavior
 * (KeyboardAvoidingView is owned by Screen, not this component).
 */
export function TextInput({ label, error, containerStyle, style, ...rest }: TextInputProps) {
  const { colors, typography, spacing } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={containerStyle}>
      {label !== undefined && (
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary, fontSize: typography.sm, fontWeight: typography.medium },
          ]}
        >
          {label}
        </Text>
      )}
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor,
            color: colors.text,
            fontSize: typography.base,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 2,
          },
          style,
        ]}
        placeholderTextColor={colors.textTertiary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
      {error !== undefined && (
        <Text
          accessibilityRole="alert"
          style={[
            styles.errorText,
            { color: colors.error, fontSize: typography.xs, marginTop: spacing.xs },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 10 },
  errorText: {},
});
