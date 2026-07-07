import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

type ProgressBarProps = {
  /** 0 to 1. Values outside this range are clamped. */
  progress: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function ProgressBar({
  progress,
  color,
  height = 8,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = height / 2;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: colors.border, height, borderRadius: radius },
        style,
      ]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height,
          borderRadius: radius,
          backgroundColor: color ?? colors.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
