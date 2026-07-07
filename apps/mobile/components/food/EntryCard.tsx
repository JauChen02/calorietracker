import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FoodEntry } from '@calorielog/contracts';
import { useTheme } from '@/theme';

type EntryCardProps = {
  entry: FoodEntry;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
  onCopy?: (entry: FoodEntry) => void;
  isDeleting?: boolean;
  isCopying?: boolean;
};

export function EntryCard({ entry, onEdit, onDelete, onCopy, isDeleting = false, isCopying = false }: EntryCardProps) {
  const { colors, typography, spacing } = useTheme();

  function handleDeletePress() {
    Alert.alert(
      'Remove entry',
      `Remove "${entry.foodName}" from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDelete(entry.id),
        },
      ],
    );
  }

  const servingText = [
    entry.quantity !== 1 ? `×${entry.quantity}` : null,
    entry.servingLabel,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          opacity: isDeleting || isCopying ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.mainRow}>
        <View style={styles.nameBlock}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.base,
              fontWeight: typography.medium,
            }}
            numberOfLines={1}
          >
            {entry.foodName}
          </Text>
          {(entry.brand !== null || servingText.length > 0) && (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.xs,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {[entry.brand, servingText].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>

        <View style={styles.calorieBlock}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.base,
              fontWeight: typography.semibold,
            }}
          >
            {Math.round(entry.calories)}
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>kcal</Text>
        </View>
      </View>

      {/* Macro strip */}
      <View style={[styles.macroRow, { marginTop: spacing.xs }]}>
        <MacroChip label="P" value={entry.proteinG} color={colors.primary} />
        <MacroChip label="C" value={entry.carbsG} color={colors.warning} />
        <MacroChip label="F" value={entry.fatG} color={colors.error} />
        {entry.fiberG !== null && <MacroChip label="Fi" value={entry.fiberG} color={colors.success} />}

        <View style={styles.actions}>
          {onCopy !== undefined && (
            <TouchableOpacity
              onPress={() => onCopy(entry)}
              disabled={isCopying}
              accessibilityRole="button"
              accessibilityLabel={`Copy ${entry.foodName} to today`}
              style={[styles.iconBtn, { marginRight: spacing.xs }]}
            >
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => onEdit(entry)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${entry.foodName}`}
            style={[styles.iconBtn, { marginRight: spacing.xs }]}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeletePress}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${entry.foodName}`}
            style={styles.iconBtn}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.macroChip}>
      <Text style={{ color, fontSize: typography.xs, fontWeight: typography.semibold }}>
        {label}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
        {' '}{value % 1 === 0 ? value : value.toFixed(1)}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  nameBlock: { flex: 1, paddingRight: 8 },
  calorieBlock: { alignItems: 'flex-end' },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroChip: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', marginLeft: 'auto' },
  iconBtn: { padding: 4 },
});
