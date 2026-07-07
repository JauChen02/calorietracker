import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Schema — converts empty strings to undefined/null for optional fields
// ---------------------------------------------------------------------------

const optionalNumeric = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
  z.number().nonnegative('Cannot be negative').optional(),
);

export const customFoodFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  brand: z.string().trim().optional(),
  servingLabel: z.string().trim().optional(),
  defaultQuantity: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .positive('Must be greater than 0'),
  defaultGrams: optionalNumeric,
  calories: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .nonnegative('Cannot be negative'),
  proteinG: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .nonnegative('Cannot be negative'),
  carbsG: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .nonnegative('Cannot be negative'),
  fatG: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .nonnegative('Cannot be negative'),
  fiberG: optionalNumeric,
});

export type CustomFoodFormValues = z.infer<typeof customFoodFormSchema>;

export const defaultCustomFoodValues: CustomFoodFormValues = {
  name: '',
  brand: '',
  servingLabel: '',
  defaultQuantity: 1,
  defaultGrams: undefined,
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: undefined,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  defaultValues?: Partial<CustomFoodFormValues>;
  onSubmit: (values: CustomFoodFormValues) => void;
  isSubmitting: boolean;
  submitLabel?: string;
  saveError?: string | null;
};

export function CustomFoodForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
  saveError,
}: Props) {
  const { colors, typography, spacing } = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomFoodFormValues>({
    resolver: zodResolver(customFoodFormSchema),
    defaultValues: { ...defaultCustomFoodValues, ...defaultValues },
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      keyboardShouldPersistTaps="handled"
    >
      <SectionLabel label="Food details" />

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Name *"
            value={value}
            onChangeText={onChange}
            placeholder="e.g. Protein shake"
            error={errors.name?.message}
            autoFocus
          />
        )}
      />

      <Controller
        control={control}
        name="brand"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Brand"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="Optional"
          />
        )}
      />

      <Controller
        control={control}
        name="servingLabel"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Serving description"
            value={value ?? ''}
            onChangeText={onChange}
            placeholder="e.g. 1 scoop, 100 g"
          />
        )}
      />

      <View style={styles.row}>
        <Controller
          control={control}
          name="defaultQuantity"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Default quantity *"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              error={errors.defaultQuantity?.message}
              containerStyle={{ flex: 1 }}
            />
          )}
        />
        <Controller
          control={control}
          name="defaultGrams"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Grams (optional)"
              value={value !== undefined ? String(value) : ''}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              placeholder="—"
              containerStyle={{ flex: 1 }}
            />
          )}
        />
      </View>

      <SectionLabel label="Nutrition (per default quantity)" />

      <Controller
        control={control}
        name="calories"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Calories *"
            value={String(value ?? '')}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            error={errors.calories?.message}
          />
        )}
      />

      <View style={styles.row}>
        <Controller
          control={control}
          name="proteinG"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Protein (g) *"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              error={errors.proteinG?.message}
              containerStyle={{ flex: 1 }}
            />
          )}
        />
        <Controller
          control={control}
          name="carbsG"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Carbs (g) *"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              error={errors.carbsG?.message}
              containerStyle={{ flex: 1 }}
            />
          )}
        />
        <Controller
          control={control}
          name="fatG"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Fat (g) *"
              value={String(value ?? '')}
              onChangeText={onChange}
              keyboardType="decimal-pad"
              error={errors.fatG?.message}
              containerStyle={{ flex: 1 }}
            />
          )}
        />
      </View>

      <Controller
        control={control}
        name="fiberG"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Fiber (g)"
            value={value !== undefined ? String(value) : ''}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            placeholder="Optional"
          />
        )}
      />

      {saveError && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.error, fontSize: typography.sm, textAlign: 'center' }}
        >
          {saveError}
        </Text>
      )}

      <Button
        label={submitLabel}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        style={{ marginTop: spacing.xs }}
      />

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
});
