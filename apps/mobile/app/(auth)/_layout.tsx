import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '@/theme';

export default function AuthLayout() {
  const { colors, typography } = useTheme();
  const { isSignedIn, isLoaded } = useAuth();

  // Redirect signed-in users away from auth screens
  if (isLoaded && isSignedIn) return <Redirect href="/today" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: typography.bold,
          fontSize: typography.lg,
        },
        headerShadowVisible: false,
      }}
    />
  );
}
