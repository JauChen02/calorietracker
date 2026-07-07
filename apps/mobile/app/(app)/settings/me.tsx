import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useTheme } from '@/theme';
import { useMe } from '@/features/auth/useMe';

export default function MeScreen() {
  const { colors, typography, spacing } = useTheme();
  const { data, loading, error, refetch } = useMe();

  return (
    <>
      <Stack.Screen options={{ title: 'User Identity' }} />
      <Screen scrollable={false}>
        {loading && <LoadingState message="Calling /api/v1/me…" />}

        {!loading && error !== null && (
          <ErrorState title="Could not reach /me" message={error} onRetry={refetch} />
        )}

        {!loading && data !== null && (
          <View style={[styles.content, { padding: spacing.md, gap: spacing.md }]}>
            <Card>
              <MeRow label="User ID" value={data.userId} />
              <Divider />
              <MeRow label="Clerk ID" value={data.clerkUserId} />
              <Divider />
              <MeRow label="Email" value={data.email ?? '—'} />
              <Divider />
              <MeRow
                label="Created"
                value={new Date(data.createdAt).toLocaleString()}
              />
            </Card>
            <Button label="Refresh" onPress={refetch} variant="secondary" />
          </View>
        )}
      </Screen>
    </>
  );
}

function Divider() {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.divider, { backgroundColor: colors.border }]}
      accessibilityElementsHidden
    />
  );
}

function MeRow({ label, value }: { label: string; value: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>{label}</Text>
      <Text
        style={{ color: colors.text, fontSize: typography.sm, fontWeight: typography.medium }}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
});
