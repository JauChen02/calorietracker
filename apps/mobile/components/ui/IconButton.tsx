import React, { type ComponentProps } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

type IconButtonProps = {
  name: IoniconsName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
};

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  size = 24,
  color,
  style,
}: IconButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      activeOpacity={0.7}
      style={[styles.button, style]}
    >
      <Ionicons name={name} size={size} color={color ?? colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
});
