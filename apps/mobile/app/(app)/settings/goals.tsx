import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { NutritionTargets } from '@calorielog/contracts';
import { useTargets } from '@/features/food/useTargets';
import { useUpsertTargets } from '@/features/food/useUpsertTargets';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Form schema — empty string → null for optional numeric fields
// ---------------------------------------------------------------------------

function nullableInt() {
  return z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number({ invalid_type_error: 'Enter a whole number' })
      .int('Must be a whole number')
      .positive('Must be greater than 0')
      .nullable(),
  );
}

function nullableNonneg() {
  return z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number({ invalid_type_error: 'Enter a number' })
      .nonnegative('Cannot be negative')
      .nullable(),
  );
}

const goalsSchema = z.object({
  calorieTarget: nullableInt(),
  proteinTargetG: nullableNonneg(),
  carbsTargetG: nullableNonneg(),
  fatTargetG: nullableNonneg(),
});

type GoalsFormValues = {
  calorieTarget: string;
  proteinTargetG: string;
  carbsTargetG: string;
  fatTargetG: string;
};

function toField(v: number | null | undefined): string {
  return v != null ? String(v) : '';
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function GoalsScreen() {
  const { data: existing, isLoading, isError, error, refetch } = useTargets();

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Nutrition Goals' }} />
        <LoadingState message="Loading goals…" />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Stack.Screen options={{ title: 'Nutrition Goals' }} />
        <ErrorState
          title="Could not load goals"
          message={error instanceof Error ? error.message : 'Something went wrong'}
          onRetry={refetch}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Nutrition Goals' }} />
      <GoalsForm existing={existing ?? null} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Inner form — rendered only after targets are loaded
// ---------------------------------------------------------------------------

function GoalsForm({ existing }: { existing: NutritionTargets | null }) {
  const { colors, typography, spacing } = useTheme();
  const router = useRouter();
  const { mutate: save, isPending } = useUpsertTargets();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalsFormValues>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      calorieTarget: toField(existing?.calorieTarget),
      proteinTargetG: toField(existing?.proteinTargetG),
      carbsTargetG: toField(existing?.carbsTargetG),
      fatTargetG: toField(existing?.fatTargetG),
    },
  });

  const onSubmit = handleSubmit((raw) => {
    const parsed = goalsSchema.parse(raw);
    save(parsed, { onSuccess: () => router.back() });
  });

  return (
    <Screen scrollable>
      <View style={[styles.content, { padding: spacing.md, gap: spacing.lg }]}>
        {/* Calorie target */}
        <View style={{ gap: spacing.sm }}>
          <SectionLabel>Calorie target</SectionLabel>
          <Controller
            control={control}
            name="calorieTarget"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                label="Daily calories (kcal)"
                placeholder="e.g. 2000  —  leave blank for no target"
                keyboardType="number-pad"
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.calorieTarget?.message}
              />
            )}
          />
        </View>

        {/* Macro targets */}
        <View style={{ gap: spacing.sm }}>
          <SectionLabel>Macro targets (optional)</SectionLabel>
          <Controller
            control={control}
            name="proteinTargetG"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                label="Protein (g)"
                placeholder="e.g. 150  —  leave blank for no target"
                keyboardType="decimal-pad"
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.proteinTargetG?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="carbsTargetG"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                label="Carbs (g)"
                placeholder="e.g. 250  —  leave blank for no target"
                keyboardType="decimal-pad"
                returnKeyType="next"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.carbsTargetG?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="fatTargetG"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                label="Fat (g)"
                placeholder="e.g. 65  —  leave blank for no target"
                keyboardType="decimal-pad"
                returnKeyType="done"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.fatTargetG?.message}
              />
            )}
          />
        </View>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.xs,
            lineHeight: 18,
          }}
        >
          Leave any field blank to remove that target. Targets are personal
          and only visible to you.
        </Text>

        <Button label="Save goals" onPress={onSubmit} loading={isPending} />
      </View>
    </Screen>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text
      style={{
        color: colors.textTertiary,
        fontSize: typography.xs,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
