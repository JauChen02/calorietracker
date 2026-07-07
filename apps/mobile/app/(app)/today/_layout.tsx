import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function TodayLayout() {
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
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="add-food"
        options={{ presentation: 'modal', title: 'Add Food' }}
      />
      <Stack.Screen
        name="manual-entry"
        options={{ presentation: 'modal', title: 'Manual Entry' }}
      />
      <Stack.Screen
        name="recent-foods"
        options={{ presentation: 'modal', title: 'Recent Foods' }}
      />
      <Stack.Screen
        name="my-foods"
        options={{ title: 'My Foods' }}
      />
      <Stack.Screen
        name="my-foods/new"
        options={{ presentation: 'modal', title: 'New Food' }}
      />
      <Stack.Screen
        name="my-foods/[id]/edit"
        options={{ presentation: 'modal', title: 'Edit Food' }}
      />
      <Stack.Screen
        name="search-foods"
        options={{ presentation: 'modal', title: 'Search Foods' }}
      />
      <Stack.Screen
        name="barcode-scanner"
        options={{ presentation: 'modal', title: 'Scan Barcode', headerShown: false }}
      />
      <Stack.Screen
        name="food-review"
        options={{ title: 'Review Food' }}
      />
      <Stack.Screen
        name="quick-add"
        options={{ presentation: 'modal', title: 'Quick Add' }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{ presentation: 'modal', title: 'Edit Entry' }}
      />
      <Stack.Screen
        name="favorites"
        options={{ presentation: 'modal', title: 'Favorites' }}
      />
      <Stack.Screen
        name="saved-meals/index"
        options={{ title: 'Saved Meals' }}
      />
      <Stack.Screen
        name="saved-meals/new"
        options={{ presentation: 'modal', title: 'New Saved Meal' }}
      />
      <Stack.Screen
        name="saved-meals/[id]/log"
        options={{ presentation: 'modal', title: 'Add Saved Meal' }}
      />
    </Stack>
  );
}
