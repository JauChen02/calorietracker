import React from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { CustomFoodForm, type CustomFoodFormValues } from '@/components/food/CustomFoodForm';
import { useCustomFoods } from '@/features/food/useCustomFoods';
import { useUpdateCustomFood } from '@/features/food/useUpdateCustomFood';

export default function EditCustomFoodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: customFoods, isLoading, isError, refetch } = useCustomFoods();
  const { mutate: updateFood, isPending, error } = useUpdateCustomFood();

  const food = customFoods?.find((f) => f.id === id);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Food' }} />
        <Screen scrollable={false}>
          <LoadingState message="Loading food…" />
        </Screen>
      </>
    );
  }

  if (isError || !food) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Food' }} />
        <Screen scrollable={false}>
          <ErrorState
            title="Food not found"
            message="This food could not be loaded."
            onRetry={isError ? refetch : undefined}
          />
        </Screen>
      </>
    );
  }

  const defaultValues: Partial<CustomFoodFormValues> = {
    name: food.name,
    brand: food.brand ?? '',
    servingLabel: food.servingLabel ?? '',
    defaultQuantity: food.defaultQuantity,
    defaultGrams: food.defaultGrams ?? undefined,
    calories: food.calories,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    fiberG: food.fiberG ?? undefined,
  };

  function handleSubmit(values: CustomFoodFormValues) {
    updateFood(
      {
        id,
        body: {
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
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Food' }} />
      <Screen scrollable={false}>
        <CustomFoodForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          submitLabel="Save changes"
          saveError={
            error instanceof Error
              ? `Update failed: ${error.message}`
              : null
          }
        />
      </Screen>
    </>
  );
}
