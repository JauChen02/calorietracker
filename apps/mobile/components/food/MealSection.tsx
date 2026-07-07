import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { FoodEntry, MealType } from '@calorielog/contracts';
import { EntryCard } from './EntryCard';
import { useTheme } from '@/theme';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

type MealSectionProps = {
  mealType: MealType;
  entries: FoodEntry[];
  deletingIds: Set<string>;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
  onCopy?: (entry: FoodEntry) => void;
  copyingId?: string | null;
};

export function MealSection({
  mealType,
  entries,
  deletingIds,
  onEdit,
  onDelete,
  onCopy,
  copyingId,
}: MealSectionProps) {
  const { colors, typography, spacing } = useTheme();

  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <View style={[styles.section, { marginBottom: spacing.md }]}>
      <View style={[styles.header, { marginBottom: spacing.sm }]}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.base,
            fontWeight: typography.semibold,
          }}
        >
          {MEAL_LABELS[mealType]}
        </Text>
        {entries.length > 0 && (
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
            {Math.round(totalCalories)} kcal
          </Text>
        )}
      </View>

      {entries.length === 0 ? (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: typography.sm,
            fontStyle: 'italic',
            paddingLeft: 2,
          }}
        >
          Nothing logged
        </Text>
      ) : (
        entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onEdit={onEdit}
            onDelete={onDelete}
            onCopy={onCopy}
            isDeleting={deletingIds.has(entry.id)}
            isCopying={copyingId === entry.id}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
