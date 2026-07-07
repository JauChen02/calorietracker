import React, { useRef, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { FoodEntryForm, type FoodEntryFormValues } from '@/components/food/FoodEntryForm';
import { useCreateEntry } from '@/features/food/useCreateEntry';
import { useCreateCustomFood } from '@/features/food/useCreateCustomFood';
import { toLocalDate, localTimezone } from '@/lib/dateUtils';
import { generateUUID } from '@/lib/uuid';
import { useTheme } from '@/theme';

export default function ManualEntryScreen() {
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const date = toLocalDate();

  const { mutate: createEntry, isPending, error } = useCreateEntry(date);
  const { mutate: createCustomFood } = useCreateCustomFood();

  const [saveToMyFoods, setSaveToMyFoods] = useState(false);

  // Fresh UUID per mount; rotated after a successful save.
  const clientMutationId = useRef(generateUUID());

  function handleSubmit(values: FoodEntryFormValues) {
    createEntry(
      {
        clientMutationId: clientMutationId.current,
        mealType: values.mealType,
        foodName: values.foodName.trim(),
        brand: values.brand?.trim() || null,
        servingLabel: values.servingLabel?.trim() || null,
        quantity: values.quantity,
        grams: values.grams ?? null,
        calories: values.calories,
        proteinG: values.proteinG,
        carbsG: values.carbsG,
        fatG: values.fatG,
        fiberG: values.fiberG ?? null,
        source: 'manual',
        loggedAt: new Date().toISOString(),
        localDate: date,
        timezone: localTimezone(),
      },
      {
        onSuccess: () => {
          // If the user opted in, save the food definition independently.
          // A failure here is non-fatal — the food entry is already saved.
          if (saveToMyFoods) {
            createCustomFood({
              name: values.foodName.trim(),
              brand: values.brand?.trim() || null,
              servingLabel: values.servingLabel?.trim() || null,
              defaultQuantity: values.quantity,
              defaultGrams: values.grams ?? null,
              calories: values.calories,
              proteinG: values.proteinG,
              carbsG: values.carbsG,
              fatG: values.fatG,
              fiberG: values.fiberG ?? null,
            });
          }
          clientMutationId.current = generateUUID();
          router.back();
        },
      },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Manual Entry' }} />
      <Screen scrollable={false}>
        {/* Save to My Foods toggle */}
        <View
          style={[
            styles.toggle,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            },
          ]}
        >
          <Text style={{ color: colors.text, fontSize: typography.sm, flex: 1 }}>
            Save to My Foods
          </Text>
          <Switch
            value={saveToMyFoods}
            onValueChange={setSaveToMyFoods}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
            accessibilityLabel="Save to My Foods"
            accessibilityRole="switch"
          />
        </View>

        <FoodEntryForm
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          submitLabel="Save entry"
          saveError={
            error instanceof Error
              ? `Save failed: ${error.message}. Your entry was not lost — tap Save to retry.`
              : null
          }
        />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
