import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useSavedMeals } from '@/features/food/useSavedMeals';
import { useDeleteSavedMeal } from '@/features/food/useDeleteSavedMeal';
import { useUpdateSavedMeal } from '@/features/food/useUpdateSavedMeal';
import type { SavedMeal } from '@calorielog/contracts';

function mealTotals(meal: SavedMeal) {
  const calories = meal.items.reduce((s, i) => s + i.calories, 0);
  return { calories: Math.round(calories) };
}

export default function SavedMealsScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { data: savedMeals, isLoading, isError } = useSavedMeals();
  const { mutate: deleteMeal } = useDeleteSavedMeal();
  const { mutate: renameMeal } = useUpdateSavedMeal();

  const handleLog = useCallback(
    (meal: SavedMeal) => {
      router.push(`/today/saved-meals/${encodeURIComponent(meal.id)}/log`);
    },
    [router],
  );

  const handleLongPress = useCallback(
    (meal: SavedMeal) => {
      Alert.alert(meal.name, undefined, [
        {
          text: 'Rename',
          onPress: () => {
            Alert.prompt(
              'Rename meal',
              undefined,
              (newName) => {
                if (newName && newName.trim()) {
                  renameMeal({ id: meal.id, body: { name: newName.trim() } });
                }
              },
              'plain-text',
              meal.name,
            );
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete meal?',
              `Delete "${meal.name}"? Previously logged entries will not be affected.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteMeal(meal.id),
                },
              ],
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [deleteMeal, renameMeal],
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Saved Meals' }} />
        <LoadingState message="Loading saved meals…" />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Stack.Screen options={{ title: 'Saved Meals' }} />
        <ErrorState title="Could not load saved meals" message="Please try again." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Saved Meals',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/today/saved-meals/new')}
              accessibilityLabel="Create saved meal"
              style={{ marginRight: 4 }}
            >
              <Ionicons name="add" size={26} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={savedMeals ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          { padding: spacing.md, gap: spacing.sm },
          (savedMeals ?? []).length === 0 && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.base,
                marginTop: spacing.sm,
                textAlign: 'center',
              }}
            >
              No saved meals yet.{'\n'}Tap + to create one from today's entries.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { calories } = mealTotals(item);
          return (
            <TouchableOpacity
              onPress={() => handleLog(item)}
              onLongPress={() => handleLongPress(item)}
              accessibilityRole="button"
              activeOpacity={0.7}
              style={[
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  padding: spacing.md,
                },
              ]}
            >
              <View style={styles.rowContent}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: typography.base,
                    fontWeight: typography.medium,
                  }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}
                >
                  {item.items.length} {item.items.length === 1 ? 'item' : 'items'} · {calories} kcal
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        }}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowContent: { flex: 1 },
});
