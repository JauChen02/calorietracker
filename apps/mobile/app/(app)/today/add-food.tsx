import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme';

type EntryOption = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
  onPress: () => void;
  enabled: boolean;
};

export default function AddFoodScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();

  const options: EntryOption[] = [
    {
      icon: 'heart-outline',
      label: 'Favorites',
      description: 'Re-log a food you saved as a favorite',
      onPress: () => router.replace('/today/favorites'),
      enabled: true,
    },
    {
      icon: 'restaurant-outline',
      label: 'Saved Meals',
      description: 'Add a group of foods you eat together',
      onPress: () => router.replace('/today/saved-meals'),
      enabled: true,
    },
    {
      icon: 'create-outline',
      label: 'Manual entry',
      description: 'Enter food name, calories, and macros yourself',
      onPress: () => router.replace('/today/manual-entry'),
      enabled: true,
    },
    {
      icon: 'time-outline',
      label: 'Recent foods',
      description: 'Re-log something you ate before',
      onPress: () => router.replace('/today/recent-foods'),
      enabled: true,
    },
    {
      icon: 'bookmark-outline',
      label: 'My Foods',
      description: 'Add from your saved foods',
      onPress: () => router.replace('/today/my-foods'),
      enabled: true,
    },
    {
      icon: 'search-outline',
      label: 'Search foods',
      description: 'Search a food database by name',
      onPress: () => router.replace('/today/search-foods'),
      enabled: true,
    },
    {
      icon: 'barcode-outline',
      label: 'Scan barcode',
      description: 'Scan a packaged food barcode',
      onPress: () => router.replace('/today/barcode-scanner'),
      enabled: true,
    },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Add Food' }} />
      <Screen scrollable={false}>
        <View style={[styles.content, { padding: spacing.md, gap: spacing.sm }]}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              onPress={opt.onPress}
              disabled={!opt.enabled}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ disabled: !opt.enabled }}
              activeOpacity={0.7}
              style={[
                styles.optionRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  padding: spacing.md,
                  opacity: opt.enabled ? 1 : 0.4,
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.primary + '18', marginRight: spacing.md },
                ]}
              >
                <Ionicons name={opt.icon} size={22} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: typography.base,
                    fontWeight: typography.medium,
                  }}
                >
                  {opt.label}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.sm,
                    marginTop: 2,
                  }}
                >
                  {opt.description}
                </Text>
              </View>
              {opt.enabled && (
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
});
