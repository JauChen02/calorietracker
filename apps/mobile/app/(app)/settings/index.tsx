import { Stack, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const { colors, typography, spacing } = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Screen scrollable>
        <View style={[styles.content, { padding: spacing.md, gap: spacing.md }]}>
          <Card>
            <Text
              style={[styles.versionLabel, { color: colors.textSecondary, fontSize: typography.sm }]}
            >
              CalorieLog
            </Text>
            <Text
              style={{ color: colors.text, fontSize: typography.base, fontWeight: typography.medium }}
            >
              Version 0.0.1
            </Text>
          </Card>

          {/* Nutrition goals */}
          <Card>
            <TouchableOpacity
              onPress={() => router.push('/settings/goals')}
              accessibilityRole="button"
              accessibilityLabel="Open nutrition goals screen"
              style={styles.navRow}
            >
              <Text style={{ color: colors.text, fontSize: typography.base }}>
                Nutrition goals
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: typography.base }}>›</Text>
            </TouchableOpacity>
          </Card>

          {/* Data management */}
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.textTertiary, fontSize: typography.xs, fontWeight: typography.semibold },
            ]}
          >
            YOUR DATA
          </Text>
          <Card>
            <TouchableOpacity
              onPress={() => router.push('/settings/export-data')}
              accessibilityRole="button"
              accessibilityLabel="Export your data"
              style={styles.navRow}
            >
              <Text style={{ color: colors.text, fontSize: typography.base }}>
                Export your data
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: typography.base }}>›</Text>
            </TouchableOpacity>
          </Card>

          {/* Account */}
          <Card>
            <Button
              label="Sign Out"
              onPress={() => signOut()}
              variant="secondary"
            />
          </Card>

          {/* Danger zone */}
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.textTertiary, fontSize: typography.xs, fontWeight: typography.semibold },
            ]}
          >
            DANGER ZONE
          </Text>
          <Card>
            <TouchableOpacity
              onPress={() => router.push('/settings/delete-account')}
              accessibilityRole="button"
              accessibilityLabel="Delete your account"
              style={styles.navRow}
            >
              <Text style={{ color: colors.error, fontSize: typography.base }}>
                Delete account
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: typography.base }}>›</Text>
            </TouchableOpacity>
          </Card>

          {/* Developer tools */}
          {__DEV__ && (
            <Card>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textTertiary, fontSize: typography.xs, fontWeight: typography.semibold },
                ]}
              >
                DEVELOPER
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/settings/api-health')}
                accessibilityRole="button"
                accessibilityLabel="Open API Health Check screen"
                style={styles.devRow}
              >
                <Text style={{ color: colors.primary, fontSize: typography.base }}>
                  API Health Check
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.base }}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/settings/me')}
                accessibilityRole="button"
                accessibilityLabel="Open user identity screen"
                style={[styles.devRow, { marginTop: spacing.sm }]}
              >
                <Text style={{ color: colors.primary, fontSize: typography.base }}>
                  User Identity (/me)
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.base }}>›</Text>
              </TouchableOpacity>
            </Card>
          )}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  versionLabel: { marginBottom: 2 },
  sectionLabel: { marginBottom: 4, letterSpacing: 0.5 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  devRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
});
