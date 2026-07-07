import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function SettingsLayout() {
  const { colors, typography } = useTheme();

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
