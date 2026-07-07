import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

type ScreenEdge = 'top' | 'right' | 'bottom' | 'left';

type ScreenProps = {
  children: React.ReactNode;
  /** When true (default) the content scrolls vertically. */
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** SafeArea edges to apply. Defaults to bottom only — headers handle top. */
  edges?: ScreenEdge[];
};

/**
 * Root screen container. Applies theme background, safe-area insets, and
 * Android-compatible keyboard avoidance.
 */
export function Screen({
  children,
  scrollable = true,
  style,
  contentStyle,
  edges = ['bottom'],
}: ScreenProps) {
  const { colors } = useTheme();

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.container, { backgroundColor: colors.background }, style]}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
