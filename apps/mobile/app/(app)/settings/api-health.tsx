import { Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useTheme } from '@/theme';
import { useApiHealth } from '@/hooks/useApiHealth';

export default function ApiHealthScreen() {
  const { colors, typography, spacing } = useTheme();
  const { data, loading, error, refetch } = useApiHealth();

  return (
    <>
      <Stack.Screen options={{ title: 'API Health' }} />
      <Screen scrollable={false}>
        {loading && <LoadingState message="Checking API…" />}

        {!loading && error !== null && (
          <ErrorState title="Could not reach API" message={error} onRetry={refetch} />
        )}

        {!loading && data !== null && (
          <View style={[styles.content, { padding: spacing.md, gap: spacing.md }]}>
            <Card>
              <HealthRow
                label="Status"
                value={data.status}
                valueColor={data.status === 'ok' ? colors.success : colors.warning}
              />
              <Divider />
              <HealthRow label="Environment" value={data.environment} />
              <Divider />
              <HealthRow label="Version" value={data.version} />
              <Divider />
              <HealthRow
                label="Timestamp"
                value={new Date(data.timestamp).toLocaleTimeString()}
              />
            </Card>

            <Card>
              <HealthRow
                label="DB Connected"
                value={data.database.connected ? 'Yes' : 'No'}
                valueColor={data.database.connected ? colors.success : colors.error}
              />
              {data.database.latencyMs !== undefined && (
                <>
                  <Divider />
                  <HealthRow label="DB Latency" value={`${data.database.latencyMs} ms`} />
                </>
              )}
              {data.database.error !== undefined && (
                <>
                  <Divider />
                  <HealthRow label="DB Error" value={data.database.error} valueColor={colors.error} />
                </>
              )}
            </Card>

            <Text
              style={[
                styles.apiUrl,
                { color: colors.textTertiary, fontSize: typography.xs },
              ]}
            >
              {process.env.EXPO_PUBLIC_API_BASE_URL ?? 'EXPO_PUBLIC_API_BASE_URL not set'}
            </Text>
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

function HealthRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  const { colors, typography } = useTheme();

  return (
    <View style={styles.row}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>{label}</Text>
      <Text
        style={{
          color: valueColor ?? colors.text,
          fontSize: typography.sm,
          fontWeight: typography.medium,
        }}
        numberOfLines={1}
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
  apiUrl: { textAlign: 'center', marginTop: 4 },
});
