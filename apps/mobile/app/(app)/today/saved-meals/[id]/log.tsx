import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useSavedMeals } from '@/features/food/useSavedMeals';
import { useLogSavedMeal } from '@/features/food/useLogSavedMeal';
import { toLocalDate, localTimezone } from '@/lib/dateUtils';
import { generateUUID } from '@/lib/uuid';
import type { MealType } from '@calorielog/contracts';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export default function LogSavedMealScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const date = toLocalDate();
  const { data: savedMeals, isLoading, isError } = useSavedMeals();
  const { mutate: logMeal, isPending } = useLogSavedMeal(date);

  const meal = savedMeals?.find((m) => m.id === id) ?? null;

  const [mealType, setMealType] = useState<MealType>(
    meal?.defaultMealType ?? 'breakfast',
  );

  const [mealTypeInitialised, setMealTypeInitialised] = useState(false);
  if (meal && !mealTypeInitialised) {
    if (meal.defaultMealType) setMealType(meal.defaultMealType);
    setMealTypeInitialised(true);
  }

  const totalCalories = meal?.items.reduce((s, i) => s + i.calories, 0) ?? 0;

  const handleAdd = useCallback(() => {
    if (!meal) return;

    const clientMutationIds = meal.items.map(() => generateUUID());

    logMeal(
      {
        id: meal.id,
        body: {
          mealType,
          loggedAt: new Date().toISOString(),
          localDate: date,
          timezone: localTimezone(),
          clientMutationIds,
        },
      },
      {
        onSuccess: () => router.navigate('/today'),
        onError: (err) => {
          Alert.alert(
            'Could not add meal',
            err instanceof Error ? err.message : 'Something went wrong.',
          );
        },
      },
    );
  }, [meal, mealType, date, logMeal, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Add Saved Meal' }} />
        <LoadingState message="Loading saved meal…" />
      </>
    );
  }

  if (isError || !meal) {
    return (
      <>
        <Stack.Screen options={{ title: 'Add Saved Meal' }} />
        <ErrorState title="Meal not found" message="This saved meal could not be loaded." />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: meal.name }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.md }}
      >
        {/* Meal type */}
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.sm,
            fontWeight: typography.medium,
            marginBottom: spacing.xs,
          }}
        >
          Meal
        </Text>
        <View style={[styles.chipRow, { marginBottom: spacing.md }]}>
          {MEAL_TYPES.map((m) => {
            const selected = mealType === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                onPress={() => setMealType(m.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? colors.primaryText : colors.text,
                    fontSize: typography.sm,
                    fontWeight: selected ? typography.semibold : typography.normal,
                  }}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Items list */}
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.sm,
            fontWeight: typography.medium,
            marginBottom: spacing.xs,
          }}
        >
          Items ({meal.items.length})
        </Text>
        <View
          style={[
            styles.itemsCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              marginBottom: spacing.md,
            },
          ]}
        >
          {meal.items.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                { paddingVertical: spacing.sm },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: colors.text, fontSize: typography.sm, fontWeight: typography.medium }}
                  numberOfLines={1}
                >
                  {item.foodName}
                </Text>
                {item.servingLabel && (
                  <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>
                    {item.quantity} × {item.servingLabel}
                  </Text>
                )}
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
                {item.calories} kcal
              </Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View
          style={[
            styles.totalRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              padding: spacing.md,
              marginBottom: spacing.lg,
            },
          ]}
        >
          <Text style={{ color: colors.text, fontSize: typography.base, fontWeight: typography.semibold }}>
            Total
          </Text>
          <Text style={{ color: colors.text, fontSize: typography.base, fontWeight: typography.bold }}>
            {Math.round(totalCalories)} kcal
          </Text>
        </View>

        <Button
          label="Add to today"
          onPress={handleAdd}
          loading={isPending}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, borderWidth: 1 },
  itemsCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
});
