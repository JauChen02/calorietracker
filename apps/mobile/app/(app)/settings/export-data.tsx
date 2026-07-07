import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme';
import { useExportData } from '@/features/account/useExportData';

export default function ExportDataScreen() {
  const { colors, typography, spacing } = useTheme();
  const { mutate: doExport, isPending, isError, error, isSuccess } = useExportData();

  return (
    <>
      <Stack.Screen options={{ title: 'Export Your Data' }} />
      <Screen scrollable={false}>
        <View style={[styles.content, { padding: spacing.md, gap: spacing.lg }]}>
          <Card padding="md">
            <Text
              style={{
                color: colors.text,
                fontSize: typography.base,
                lineHeight: typography.lineHeightRelaxed,
              }}
            >
              Export a copy of all your CalorieLog data as a JSON file.
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sm,
                lineHeight: typography.lineHeightBase,
                marginTop: spacing.sm,
              }}
            >
              The export includes your food log entries, nutrition targets, custom
              foods, favorites, and saved meals. No account credentials or server
              keys are included.
            </Text>
          </Card>

          {isError && (
            <Card padding="md">
              <Text
                style={{ color: colors.error, fontSize: typography.sm }}
                accessibilityRole="alert"
              >
                {error instanceof Error
                  ? error.message
                  : 'Export failed. Check your connection and try again.'}
              </Text>
            </Card>
          )}

          {isSuccess && (
            <Card padding="md">
              <Text
                style={{ color: colors.success, fontSize: typography.sm }}
                accessibilityRole="status"
              >
                Data ready to share. Use the share sheet to save or send your
                export file.
              </Text>
            </Card>
          )}

          <Button
            label={isPending ? 'Preparing export…' : 'Export my data'}
            onPress={() => doExport()}
            loading={isPending}
          />

          <Text
            style={{
              color: colors.textTertiary,
              fontSize: typography.xs,
              lineHeight: typography.lineHeightBase,
              textAlign: 'center',
            }}
          >
            Your data is shared via the system share sheet. CalorieLog does not
            send it to any third party.
          </Text>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
});
