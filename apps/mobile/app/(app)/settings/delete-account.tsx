import React from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/states/LoadingState';
import { useTheme } from '@/theme';
import { useDeleteAccount } from '@/features/account/useDeleteAccount';

const DELETED_ITEMS = [
  'All food log entries',
  'Nutrition targets',
  'Custom foods',
  'Favorites',
  'Saved meals',
];

export default function DeleteAccountScreen() {
  const { colors, typography, spacing } = useTheme();
  const { mutate: deleteAccount, isPending, isError, error } = useDeleteAccount();

  function handleDeletePress() {
    Alert.alert(
      'Delete account permanently?',
      'This removes all your data from CalorieLog and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => deleteAccount(),
        },
      ],
    );
  }

  if (isPending) {
    return (
      <>
        <Stack.Screen options={{ title: 'Delete Account' }} />
        <LoadingState message="Deleting your account…" />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Delete Account' }} />
      <Screen scrollable={false}>
        <View style={[styles.content, { padding: spacing.md, gap: spacing.lg }]}>
          {/* What will be deleted */}
          <Card padding="md">
            <Text
              style={{
                color: colors.text,
                fontSize: typography.base,
                fontWeight: typography.semibold,
                marginBottom: spacing.sm,
              }}
            >
              This will permanently delete:
            </Text>
            {DELETED_ITEMS.map((item) => (
              <Text
                key={item}
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sm,
                  lineHeight: typography.lineHeightBase,
                }}
              >
                {'• '}
                {item}
              </Text>
            ))}
          </Card>

          {/* Permanence warning */}
          <Card padding="md">
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sm,
                lineHeight: typography.lineHeightBase,
              }}
              accessibilityRole="text"
            >
              Deletion is permanent. There is no way to recover your data after
              you confirm. If you want a copy first, export your data from
              Settings before continuing.
            </Text>
          </Card>

          {/* Error state */}
          {isError && (
            <Card padding="md">
              <Text
                style={{ color: colors.error, fontSize: typography.sm }}
                accessibilityRole="alert"
              >
                {error instanceof Error
                  ? error.message
                  : 'Deletion failed. Check your connection and try again.'}
              </Text>
            </Card>
          )}

          <View style={styles.actions}>
            <Button
              label="Delete my account"
              onPress={handleDeletePress}
              variant="secondary"
              labelStyle={{ color: colors.error }}
              style={{ borderColor: colors.error }}
            />
          </View>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  actions: { marginTop: 'auto' },
});
