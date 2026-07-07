import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { CustomFoodForm, type CustomFoodFormValues } from '@/components/food/CustomFoodForm';
import { useCreateCustomFood } from '@/features/food/useCreateCustomFood';

export default function NewCustomFoodScreen() {
  const router = useRouter();
  const { mutate: createFood, isPending, error } = useCreateCustomFood();

  function handleSubmit(values: CustomFoodFormValues) {
    createFood(
      {
        name: values.name,
        brand: values.brand?.trim() || null,
        servingLabel: values.servingLabel?.trim() || null,
        defaultQuantity: values.defaultQuantity,
        defaultGrams: values.defaultGrams ?? null,
        calories: values.calories,
        proteinG: values.proteinG,
        carbsG: values.carbsG,
        fatG: values.fatG,
        fiberG: values.fiberG ?? null,
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'New Food' }} />
      <Screen scrollable={false}>
        <CustomFoodForm
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          submitLabel="Save food"
          saveError={
            error instanceof Error
              ? `Save failed: ${error.message}`
              : null
          }
        />
      </Screen>
    </>
  );
}
