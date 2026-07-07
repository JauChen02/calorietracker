/**
 * Quick Add modal — lets the user log a custom or recent food with
 * meal-type selection and portion adjustment.
 *
 * Query params:
 *   source  'custom' | 'recent'
 *   id      UUID of the custom_food or food_entry to prefill from
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { useCustomFoods } from '@/features/food/useCustomFoods';
import { useRecentFoods } from '@/features/food/useRecentFoods';
import { useFavorites } from '@/features/food/useFavorites';
import { useCreateEntry } from '@/features/food/useCreateEntry';
import { toLocalDate, localTimezone } from '@/lib/dateUtils';
import { generateUUID } from '@/lib/uuid';
import type { MealType } from '@calorielog/contracts';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

// Nutrition data normalised to one unit so we can scale by any quantity.
type FoodBase = {
  foodName: string;
  brand: string | null;
  servingLabel: string | null;
  defaultQuantity: number;
  defaultMealType: MealType;
  // Nutrition is stored for defaultQuantity; we derive per-unit by dividing.
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  grams: number | null;
  source: 'custom_food' | 'manual' | 'favorite';
};

function scale(perDefault: number, quantity: number, defaultQuantity: number): number {
  if (defaultQuantity === 0) return 0;
  return Math.round((perDefault * quantity / defaultQuantity) * 10) / 10;
}

export default function QuickAddScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { source, id } = useLocalSearchParams<{ source: string; id: string }>();

  const date = toLocalDate();
  const { mutate: createEntry, isPending } = useCreateEntry(date);

  const { data: customFoods, isLoading: cfLoading, isError: cfError } = useCustomFoods();
  const { data: recentFoods, isLoading: rfLoading, isError: rfError } = useRecentFoods();
  const { data: favoriteFoods, isLoading: favLoading, isError: favError } = useFavorites();

  const isLoading =
    source === 'custom' ? cfLoading :
    source === 'favorite' ? favLoading :
    rfLoading;
  const isError =
    source === 'custom' ? cfError :
    source === 'favorite' ? favError :
    rfError;

  const food = useMemo<FoodBase | null>(() => {
    if (source === 'custom' && customFoods) {
      const cf = customFoods.find((f) => f.id === id);
      if (!cf) return null;
      return {
        foodName: cf.name,
        brand: cf.brand,
        servingLabel: cf.servingLabel,
        defaultQuantity: cf.defaultQuantity,
        defaultMealType: 'breakfast',
        calories: cf.calories,
        proteinG: cf.proteinG,
        carbsG: cf.carbsG,
        fatG: cf.fatG,
        fiberG: cf.fiberG,
        grams: cf.defaultGrams,
        source: 'custom_food',
      };
    }
    if (source === 'recent' && recentFoods) {
      const rf = recentFoods.find((f) => f.foodEntryId === id);
      if (!rf) return null;
      return {
        foodName: rf.foodName,
        brand: rf.brand,
        servingLabel: rf.servingLabel,
        defaultQuantity: rf.quantity,
        defaultMealType: rf.lastMealType,
        calories: rf.calories,
        proteinG: rf.proteinG,
        carbsG: rf.carbsG,
        fatG: rf.fatG,
        fiberG: rf.fiberG,
        grams: rf.grams,
        source: 'manual',
      };
    }
    if (source === 'favorite' && favoriteFoods) {
      const fav = favoriteFoods.find((f) => f.id === id);
      if (!fav) return null;
      return {
        foodName: fav.name,
        brand: fav.brand,
        servingLabel: fav.servingLabel,
        defaultQuantity: fav.quantity,
        defaultMealType: 'breakfast',
        calories: fav.calories,
        proteinG: fav.proteinG,
        carbsG: fav.carbsG,
        fatG: fav.fatG,
        fiberG: fav.fiberG,
        grams: fav.grams,
        source: 'favorite',
      };
    }
    return null;
  }, [source, id, customFoods, recentFoods, favoriteFoods]);

  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [quantityStr, setQuantityStr] = useState('');

  // Set defaults from food once loaded
  const [initialised, setInitialised] = useState(false);
  if (food && !initialised) {
    setMealType(food.defaultMealType);
    setQuantityStr(String(food.defaultQuantity));
    setInitialised(true);
  }

  const quantity = parseFloat(quantityStr) || 0;

  const preview = useMemo(() => {
    if (!food || quantity <= 0) return null;
    return {
      calories: scale(food.calories, quantity, food.defaultQuantity),
      proteinG: scale(food.proteinG, quantity, food.defaultQuantity),
      carbsG: scale(food.carbsG, quantity, food.defaultQuantity),
      fatG: scale(food.fatG, quantity, food.defaultQuantity),
      fiberG: food.fiberG !== null ? scale(food.fiberG, quantity, food.defaultQuantity) : null,
    };
  }, [food, quantity]);

  const handleAdd = useCallback(() => {
    if (!food || !preview || quantity <= 0) return;

    createEntry(
      {
        clientMutationId: generateUUID(),
        mealType,
        foodName: food.foodName,
        brand: food.brand ?? null,
        servingLabel: food.servingLabel ?? null,
        quantity,
        grams: food.grams != null ? scale(food.grams, quantity, food.defaultQuantity) : null,
        calories: preview.calories,
        proteinG: preview.proteinG,
        carbsG: preview.carbsG,
        fatG: preview.fatG,
        fiberG: preview.fiberG ?? null,
        source: food.source,
        loggedAt: new Date().toISOString(),
        localDate: date,
        timezone: localTimezone(),
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          Alert.alert(
            'Could not add food',
            err instanceof Error ? err.message : 'Something went wrong.',
          );
        },
      },
    );
  }, [food, preview, quantity, mealType, createEntry, date, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Quick Add' }} />
        <LoadingState message="Loading food…" />
      </>
    );
  }

  if (isError || !food) {
    return (
      <>
        <Stack.Screen options={{ title: 'Quick Add' }} />
        <ErrorState
          title="Food not found"
          message="This food could not be loaded. Go back and try again."
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: food.foodName }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Food name / brand header */}
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: typography.xl, fontWeight: typography.bold }}>
            {food.foodName}
          </Text>
          {food.brand && (
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}>
              {food.brand}
            </Text>
          )}
          {food.servingLabel && (
            <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
              {food.servingLabel}
            </Text>
          )}
        </View>

        {/* Meal type selector */}
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
        <View style={[styles.mealRow, { marginBottom: spacing.md }]}>
          {MEAL_TYPES.map((m) => {
            const selected = mealType === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                onPress={() => setMealType(m.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.mealChip,
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

        {/* Quantity */}
        <TextInput
          label="Quantity"
          value={quantityStr}
          onChangeText={setQuantityStr}
          keyboardType="decimal-pad"
          containerStyle={{ marginBottom: spacing.md }}
        />

        {/* Nutrition preview */}
        {preview && (
          <View
            style={[
              styles.preview,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                padding: spacing.md,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <NutritionRow label="Calories" value={preview.calories} unit="kcal" prominent />
            <NutritionRow label="Protein" value={preview.proteinG} unit="g" />
            <NutritionRow label="Carbs" value={preview.carbsG} unit="g" />
            <NutritionRow label="Fat" value={preview.fatG} unit="g" />
            {preview.fiberG !== null && (
              <NutritionRow label="Fiber" value={preview.fiberG} unit="g" />
            )}
          </View>
        )}

        <Button
          label="Add to today"
          onPress={handleAdd}
          loading={isPending}
          disabled={quantity <= 0}
        />
      </ScrollView>
    </>
  );
}

function NutritionRow({
  label,
  value,
  unit,
  prominent = false,
}: {
  label: string;
  value: number;
  unit: string;
  prominent?: boolean;
}) {
  const { colors, typography } = useTheme();
  const displayed = value % 1 === 0 ? String(value) : value.toFixed(1);
  return (
    <View style={styles.nutritionRow}>
      <Text
        style={{
          color: prominent ? colors.text : colors.textSecondary,
          fontSize: prominent ? typography.base : typography.sm,
          fontWeight: prominent ? typography.semibold : typography.normal,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: prominent ? colors.text : colors.textSecondary,
          fontSize: prominent ? typography.base : typography.sm,
          fontWeight: prominent ? typography.bold : typography.normal,
        }}
      >
        {displayed} {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mealRow: { flexDirection: 'row', gap: 8 },
  mealChip: { borderRadius: 20, borderWidth: 1 },
  preview: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 6 },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
