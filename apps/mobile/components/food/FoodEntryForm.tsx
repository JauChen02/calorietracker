import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextInput } from '@/components/ui/TextInput';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Form schema — coerces string inputs to numbers for numeric fields
// ---------------------------------------------------------------------------

const optionalNumeric = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
  z.number().nonnegative('Cannot be negative').optional(),
);

export const foodEntryFormSchema = z.object({
  foodName: z.string().trim().min(1, 'Food name is required'),
  brand: z.string().trim().optional(),
  servingLabel: z.string().trim().optional(),
  quantity: z.coerce
    .number({ invalid_type_error: 'Enter a number' })
    .positive('Must be greater than 0'),
  grams: optionalNumeric,
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
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});

export type FoodEntryFormValues = z.infer<typeof foodEntryFormSchema>;

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

export const defaultFoodEntryValues: FoodEntryFormValues = {
  foodName: '',
  brand: '',
  servingLabel: '',
  quantity: 1,
  grams: undefined,
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: undefined,
  mealType: 'breakfast',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MEAL_TYPES: Array<{ value: FoodEntryFormValues['mealType']; label: string }> = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

type FoodEntryFormProps = {
  defaultValues?: Partial<FoodEntryFormValues>;
  onSubmit: (values: FoodEntryFormValues) => void;
  isSubmitting: boolean;
  submitLabel?: string;
  saveError?: string | null;
};

export function FoodEntryForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
  saveError,
}: FoodEntryFormProps) {
  const { colors, typography, spacing } = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FoodEntryFormValues>({
    resolver: zodResolver(foodEntryFormSchema),
    defaultValues: { ...defaultFoodEntryValues, ...defaultValues },
  });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { padding: spacing.md, gap: spacing.md }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Food name */}
      <Controller
        control={control}
        name="foodName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Food name *"
            placeholder="e.g. Chicken rice"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.foodName?.message}
            autoCapitalize="sentences"
            returnKeyType="next"
          />
        )}
      />

      {/* Brand */}
      <Controller
        control={control}
        name="brand"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Brand"
            placeholder="Optional"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.brand?.message}
            autoCapitalize="words"
            returnKeyType="next"
          />
        )}
      />

      {/* Serving label */}
      <Controller
        control={control}
        name="servingLabel"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Serving size"
            placeholder="e.g. 1 cup, 1 medium"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.servingLabel?.message}
            returnKeyType="next"
          />
        )}
      />

      {/* Quantity + Grams row */}
      <View style={styles.row}>
        <Controller
          control={control}
          name="quantity"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Quantity"
              placeholder="1"
              value={String(value ?? '')}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.quantity?.message}
              keyboardType="decimal-pad"
              returnKeyType="next"
              containerStyle={styles.halfField}
            />
          )}
        />
        <Controller
          control={control}
          name="grams"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Grams"
              placeholder="Optional"
              value={value !== undefined ? String(value) : ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.grams?.message}
              keyboardType="decimal-pad"
              returnKeyType="next"
              containerStyle={styles.halfField}
            />
          )}
        />
      </View>

      {/* Separator */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Calories */}
      <Controller
        control={control}
        name="calories"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="Calories *"
            placeholder="0"
            value={String(value ?? '')}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.calories?.message}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        )}
      />

      {/* Macro row 1: Protein + Carbs */}
      <View style={styles.row}>
        <Controller
          control={control}
          name="proteinG"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Protein (g)"
              placeholder="0"
              value={String(value ?? '')}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.proteinG?.message}
              keyboardType="decimal-pad"
              returnKeyType="next"
              containerStyle={styles.halfField}
            />
          )}
        />
        <Controller
          control={control}
          name="carbsG"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Carbs (g)"
              placeholder="0"
              value={String(value ?? '')}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.carbsG?.message}
              keyboardType="decimal-pad"
              returnKeyType="next"
              containerStyle={styles.halfField}
            />
          )}
        />
      </View>

      {/* Macro row 2: Fat + Fiber */}
      <View style={styles.row}>
        <Controller
          control={control}
          name="fatG"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Fat (g)"
              placeholder="0"
              value={String(value ?? '')}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.fatG?.message}
              keyboardType="decimal-pad"
              returnKeyType="next"
              containerStyle={styles.halfField}
            />
          )}
        />
        <Controller
          control={control}
          name="fiberG"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Fiber (g)"
              placeholder="Optional"
              value={value !== undefined ? String(value) : ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.fiberG?.message}
              keyboardType="decimal-pad"
              returnKeyType="done"
              containerStyle={styles.halfField}
            />
          )}
        />
      </View>

      {/* Separator */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Meal type */}
      <View>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.sm,
            fontWeight: typography.medium,
            marginBottom: 8,
          }}
        >
          Meal type *
        </Text>
        <Controller
          control={control}
          name="mealType"
          render={({ field: { onChange, value } }) => (
            <View style={styles.mealRow}>
              {MEAL_TYPES.map((mt) => {
                const isSelected = value === mt.value;
                return (
                  <TouchableOpacity
                    key={mt.value}
                    onPress={() => onChange(mt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={mt.label}
                    style={[
                      styles.mealChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected ? colors.primaryText : colors.textSecondary,
                        fontSize: typography.sm,
                        fontWeight: isSelected ? typography.semibold : typography.normal,
                      }}
                    >
                      {mt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
        {errors.mealType !== undefined && (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.error, fontSize: typography.xs, marginTop: spacing.xs }}
          >
            {errors.mealType.message}
          </Text>
        )}
      </View>

      {/* Save error */}
      {saveError !== null && saveError !== undefined && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: colors.error + '18', borderColor: colors.error + '40' },
          ]}
        >
          <Text style={{ color: colors.error, fontSize: typography.sm }}>{saveError}</Text>
        </View>
      )}

      {/* Submit */}
      <Button
        label={submitLabel}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        style={{ marginTop: spacing.sm }}
      />

      {/* Bottom padding so last field isn't hidden by keyboard */}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  mealRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
