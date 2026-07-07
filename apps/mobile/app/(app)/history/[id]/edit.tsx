import React from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { FoodEntryForm, type FoodEntryFormValues } from '@/components/food/FoodEntryForm';
import { useDayEntries } from '@/features/food/useDayEntries';
import { useUpdateEntry } from '@/features/food/useUpdateEntry';
import { toLocalDate } from '@/lib/dateUtils';

export default function HistoryEditEntryScreen() {
  const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
  const router = useRouter();

  // Fall back to today if the param is missing (shouldn't happen in normal navigation).
  const date = dateParam ?? toLocalDate();

  const { data, isLoading, isError, refetch } = useDayEntries(date);
  const { mutate: updateEntry, isPending, error } = useUpdateEntry(date);

  const entry = data?.entries.find((e) => e.id === id);

  function handleSubmit(values: FoodEntryFormValues) {
    if (entry === undefined) return;

    updateEntry(
      {
        id: entry.id,
        currentVersion: entry.version,
        body: {
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
        },
      },
      {
        onSuccess: () => router.back(),
      },
    );
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Entry' }} />
        <Screen scrollable={false}>
          <LoadingState message="Loading entry…" />
        </Screen>
      </>
    );
  }

  if (isError || entry === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Entry' }} />
        <Screen scrollable={false}>
          <ErrorState
            title="Entry not found"
            message="This entry could not be loaded."
            onRetry={isError ? refetch : undefined}
          />
        </Screen>
      </>
    );
  }

  const defaultValues: Partial<FoodEntryFormValues> = {
    foodName: entry.foodName,
    brand: entry.brand ?? '',
    servingLabel: entry.servingLabel ?? '',
    quantity: entry.quantity,
    grams: entry.grams ?? undefined,
    calories: entry.calories,
    proteinG: entry.proteinG,
    carbsG: entry.carbsG,
    fatG: entry.fatG,
    fiberG: entry.fiberG ?? undefined,
    mealType: entry.mealType,
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Entry' }} />
      <Screen scrollable={false}>
        <FoodEntryForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          submitLabel="Save changes"
          saveError={
            error instanceof Error
              ? `Update failed: ${error.message}. Your original entry is still saved.`
              : null
          }
        />
      </Screen>
    </>
  );
}
