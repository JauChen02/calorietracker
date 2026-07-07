import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSignIn, isClerkAPIResponseError } from '@clerk/clerk-expo';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme';

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!isLoaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Sign-in could not be completed. Please try again.');
      }
    } catch (err: unknown) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.message ?? 'Sign-in failed');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen scrollable={false}>
        <View style={[styles.container, { paddingHorizontal: spacing.lg }]}>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontSize: typography.xxxl, fontWeight: typography.bold },
            ]}
          >
            CalorieLog
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary, fontSize: typography.base, marginTop: spacing.sm },
            ]}
          >
            Sign in to continue
          </Text>

          <Card style={{ marginTop: spacing.xl }}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!loading}
              accessibilityLabel="Email address"
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
              editable={!loading}
              containerStyle={{ marginTop: spacing.md }}
              accessibilityLabel="Password"
            />
          </Card>

          {error !== null && (
            <Text
              accessibilityRole="alert"
              style={[
                styles.error,
                { color: colors.error, fontSize: typography.sm, marginTop: spacing.md },
              ]}
            >
              {error}
            </Text>
          )}

          <Button
            label="Sign In"
            onPress={handleSignIn}
            loading={loading}
            disabled={!email || !password}
            style={{ marginTop: spacing.lg }}
          />

          <TouchableOpacity
            onPress={() => router.push('/sign-up')}
            accessibilityRole="link"
            accessibilityLabel="Create a new account"
            style={[styles.link, { marginTop: spacing.lg }]}
          >
            <Text style={{ color: colors.primary, fontSize: typography.sm }}>
              Don't have an account?{' '}
              <Text style={{ fontWeight: typography.semibold }}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  error: { textAlign: 'center' },
  link: { alignItems: 'center' },
});
