/**
 * Food Review modal — lets the user inspect a catalog food result, pick a
 * serving option, adjust quantity and meal type, then log it as a snapshot entry.
 *
 * Route params:
 *   provider        FoodProviderName (e.g. "open_food_facts")
 *   providerFoodId  Provider-specific food identifier
 *
 * The search screen pre-populates the TanStack cache before navigating here,
 * so the common path has zero additional network requests.
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
import { useCatalogFood } from '@/features/food/useCatalogFood';
import { useCreateEntry } from '@/features/food/useCreateEntry';
import { useFavorites } from '@/features/food/useFavorites';
import { useCreateFavorite } from '@/features/food/useCreateFavorite';
import { useDeleteFavorite } from '@/features/food/useDeleteFavorite';
import { toLocalDate, localTimezone } from '@/lib/dateUtils';
import { generateUUID } from '@/lib/uuid';
import type { FoodServingOption, MealType } from '@calorielog/contracts';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export default function FoodReviewScreen() {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { provider, providerFoodId, source } = useLocalSearchParams<{
    provider: string;
    providerFoodId: string;
    source?: string;
  }>();

  const { data: food, isLoading, isError } = useCatalogFood(provider ?? '', providerFoodId ?? '');

  const date = toLocalDate();
  const { mutate: createEntry, isPending } = useCreateEntry(date);
  const { data: favorites } = useFavorites();
  const { mutate: addFavorite } = useCreateFavorite();
  const { mutate: removeFavorite } = useDeleteFavorite();

  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [quantityStr, setQuantityStr] = useState('1');
  const [mealType, setMealType] = useState<MealType>('breakfast');

  const selectedOption: FoodServingOption | null =
    food?.servingOptions?.[selectedOptionIndex] ?? null;

  const quantity = parseFloat(quantityStr) || 0;

  const preview = useMemo(() => {
    if (!selectedOption || quantity <= 0) return null;
    return {
      calories: round1(selectedOption.calories * quantity),
      proteinG: round1(selectedOption.proteinG * quantity),
      carbsG: round1(selectedOption.carbsG * quantity),
      fatG: round1(selectedOption.fatG * quantity),
      fiberG: selectedOption.fiberG != null ? round1(selectedOption.fiberG * quantity) : null,
      grams: selectedOption.grams != null ? round1(selectedOption.grams * quantity) : null,
    };
  }, [selectedOption, quantity]);

  const matchedFavorite = useMemo(() => {
    if (!food || !favorites || !selectedOption) return null;
    return favorites.find(
      (f) =>
        f.name === food.name &&
        (f.brand ?? null) === (food.brand ?? null) &&
        f.servingLabel === selectedOption.label,
    ) ?? null;
  }, [food, favorites, selectedOption]);

  const handleToggleFavorite = useCallback(() => {
    if (!food || !selectedOption) return;

    if (matchedFavorite) {
      removeFavorite(matchedFavorite.id);
    } else {
      addFavorite({
        name: food.name,
        brand: food.brand ?? null,
        servingLabel: selectedOption.label,
        quantity: 1,
        grams: selectedOption.grams ?? null,
        calories: selectedOption.calories,
        proteinG: selectedOption.proteinG,
        carbsG: selectedOption.carbsG,
        fatG: selectedOption.fatG,
        fiberG: selectedOption.fiberG ?? null,
        source: source === 'barcode' ? 'barcode' : 'catalog',
      });
    }
  }, [food, selectedOption, matchedFavorite, addFavorite, removeFavorite, source]);

  const handleAdd = useCallback(() => {
    if (!food || !selectedOption || !preview || quantity <= 0) return;

    createEntry(
      {
        clientMutationId: generateUUID(),
        mealType,
        foodName: food.name,
        brand: food.brand ?? null,
        servingLabel: selectedOption.label,
        quantity,
        grams: preview.grams,
        calories: preview.calories,
        proteinG: preview.proteinG,
        carbsG: preview.carbsG,
        fatG: preview.fatG,
        fiberG: preview.fiberG ?? null,
        source: source === 'barcode' ? 'barcode' : 'catalog',
        loggedAt: new Date().toISOString(),
        localDate: date,
        timezone: localTimezone(),
      },
      {
        onSuccess: () => {
          if (source === 'barcode') {
            router.navigate('/today');
          } else {
            router.back();
          }
        },
        onError: (err) => {
          Alert.alert(
            'Could not add food',
            err instanceof Error ? err.message : 'Something went wrong.',
          );
        },
      },
    );
  }, [food, selectedOption, preview, quantity, mealType, source, createEntry, date, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Review Food' }} />
        <LoadingState message="Loading food details…" />
      </>
    );
  }

  if (isError || !food) {
    return (
      <>
        <Stack.Screen options={{ title: 'Review Food' }} />
        <ErrorState
          title="Food not found"
          message="This food could not be loaded. Go back and try again."
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: food.name,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleToggleFavorite}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={matchedFavorite ? 'Remove from favorites' : 'Add to favorites'}
              style={{ marginRight: 4 }}
            >
              <Ionicons
                name={matchedFavorite ? 'heart' : 'heart-outline'}
                size={24}
                color={matchedFavorite ? '#E53E3E' : colors.textTertiary}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ marginBottom: spacing.md }}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.xl,
              fontWeight: typography.bold,
            }}
          >
            {food.name}
          </Text>
          {food.brand && (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sm,
                marginTop: 2,
              }}
            >
              {food.brand}
            </Text>
          )}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: spacing.xs,
            }}
          >
            <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.xs,
                marginLeft: 4,
              }}
            >
              {food.sourceLabel}
            </Text>
          </View>
        </View>

        {/* Serving option selector */}
        {food.servingOptions.length > 1 && (
          <>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sm,
                fontWeight: typography.medium,
                marginBottom: spacing.xs,
              }}
            >
              Serving size
            </Text>
            <View style={[styles.chipRow, { marginBottom: spacing.md }]}>
              {food.servingOptions.map((option, idx) => {
                const selected = selectedOptionIndex === idx;
                return (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => setSelectedOptionIndex(idx)}
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
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

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

        {/* Quantity */}
        <TextInput
          label={`Quantity${selectedOption ? ` (${selectedOption.label})` : ''}`}
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
            {preview.grams != null && (
              <NutritionRow label="Amount" value={preview.grams} unit="g" />
            )}
            <NutritionRow label="Calories" value={preview.calories} unit="kcal" prominent />
            <NutritionRow label="Protein" value={preview.proteinG} unit="g" />
            <NutritionRow label="Carbs" value={preview.carbsG} unit="g" />
            <NutritionRow label="Fat" value={preview.fatG} unit="g" />
            {preview.fiberG != null && (
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, borderWidth: 1 },
  preview: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
