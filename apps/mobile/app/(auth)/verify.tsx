import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useSignUp, isClerkAPIResponseError } from '@clerk/clerk-expo';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme';

export default function VerifyScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { colors, typography, spacing } = useTheme();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (!isLoaded || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: unknown) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.message ?? 'Verification failed');
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
            Check your email
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary, fontSize: typography.base, marginTop: spacing.sm },
            ]}
          >
            Enter the 6-digit code we sent you
          </Text>

          <Card style={{ marginTop: spacing.xl }}>
            <TextInput
              label="Verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              editable={!loading}
              accessibilityLabel="6-digit verification code"
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
            label="Verify Email"
            onPress={handleVerify}
            loading={loading}
            disabled={code.length < 6}
            style={{ marginTop: spacing.lg }}
          />
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
});
