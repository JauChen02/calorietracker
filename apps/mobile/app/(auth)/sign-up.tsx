import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSignUp, isClerkAPIResponseError } from '@clerk/clerk-expo';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme';

export default function SignUpScreen() {
  const { signUp, isLoaded } = useSignUp();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    if (!isLoaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      router.push('/verify');
    } catch (err: unknown) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.message ?? 'Sign-up failed');
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
              { color: colors.text, fontSize: typography.xxl, fontWeight: typography.bold },
            ]}
          >
            Create Account
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary, fontSize: typography.base, marginTop: spacing.sm },
            ]}
          >
            Start tracking your nutrition
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
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
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
            label="Create Account"
            onPress={handleSignUp}
            loading={loading}
            disabled={!email || !password}
            style={{ marginTop: spacing.lg }}
          />

          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="link"
            accessibilityLabel="Back to sign in"
            style={[styles.link, { marginTop: spacing.lg }]}
          >
            <Text style={{ color: colors.primary, fontSize: typography.sm }}>
              Already have an account?{' '}
              <Text style={{ fontWeight: typography.semibold }}>Sign in</Text>
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
