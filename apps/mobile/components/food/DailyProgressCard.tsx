import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DailyProgress } from '@calorielog/contracts';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTheme } from '@/theme';

type DailyProgressCardProps = {
  progress: DailyProgress;
};

function fmt(n: number): string {
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}

export function DailyProgressCard({ progress }: DailyProgressCardProps) {
  const { colors, typography, spacing } = useTheme();
  const { consumed, calorieTarget, caloriesRemaining } = progress;

  const hasCalorieTarget = calorieTarget !== null;
  const hasAnyMacroTarget =
    progress.proteinFraction !== null ||
    progress.carbsFraction !== null ||
    progress.fatFraction !== null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          marginHorizontal: spacing.md,
          marginTop: spacing.md,
          padding: spacing.md,
        },
      ]}
    >
      {/* ── Calorie section ───────────────────────────────────── */}
      <View style={[styles.calorieRow, { marginBottom: spacing.xs }]}>
        <View style={styles.calorieNumbers}>
          <Text
            style={{
              color: colors.text,
              fontSize: typography.xxxl,
              fontWeight: typography.bold,
              lineHeight: typography.xxxl + 4,
            }}
            accessibilityRole="text"
            accessibilityLabel={`${Math.round(consumed.calories)} kilocalories consumed`}
          >
            {Math.round(consumed.calories)}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sm,
              marginLeft: 4,
              alignSelf: 'flex-end',
              paddingBottom: 4,
            }}
          >
            kcal
            {hasCalorieTarget && ` of ${Math.round(calorieTarget!)}`}
          </Text>
        </View>

        {hasCalorieTarget && caloriesRemaining !== null && (
          <View style={styles.remainingBlock}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.xs,
                textAlign: 'right',
              }}
            >
              remaining
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.lg,
                fontWeight: typography.semibold,
                textAlign: 'right',
              }}
              accessibilityLabel={`${Math.round(caloriesRemaining)} kilocalories remaining`}
            >
              {Math.round(caloriesRemaining)}
            </Text>
          </View>
        )}
      </View>

      {/* Calorie progress bar (only when target is set) */}
      {hasCalorieTarget && calorieTarget !== null && (
        <ProgressBar
          progress={consumed.calories / calorieTarget}
          color={colors.primary}
          height={6}
          style={{ marginBottom: spacing.md }}
          accessibilityLabel={`Calorie progress: ${Math.round((consumed.calories / calorieTarget) * 100)}%`}
        />
      )}

      {/* ── Macro rows ────────────────────────────────────────── */}
      {hasAnyMacroTarget ? (
        <View style={[styles.macroStack, { gap: spacing.sm }]}>
          <MacroRow
            label="Protein"
            consumed={consumed.proteinG}
            targetG={progress.proteinTargetG}
            fraction={progress.proteinFraction}
            color={colors.primary}
          />
          <MacroRow
            label="Carbs"
            consumed={consumed.carbsG}
            targetG={progress.carbsTargetG}
            fraction={progress.carbsFraction}
            color={colors.warning}
          />
          <MacroRow
            label="Fat"
            consumed={consumed.fatG}
            targetG={progress.fatTargetG}
            fraction={progress.fatFraction}
            color={colors.success}
          />
        </View>
      ) : (
        /* Compact macro strip when no macro targets */
        <View style={styles.macroStrip}>
          <MacroChip label="P" value={consumed.proteinG} color={colors.primary} />
          <MacroChip label="C" value={consumed.carbsG} color={colors.warning} />
          <MacroChip label="F" value={consumed.fatG} color={colors.success} />
        </View>
      )}
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MacroRow({
  label,
  consumed,
  targetG,
  fraction,
  color,
}: {
  label: string;
  consumed: number;
  targetG: number | null;
  fraction: number | null;
  color: string;
}) {
  const { colors, typography } = useTheme();

  return (
    <View>
      <View style={[styles.macroLabelRow, { marginBottom: 4 }]}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: '500' }}>
          {label}
        </Text>
        <Text style={{ color: colors.text, fontSize: typography.xs }}>
          {fmt(consumed)}g{targetG !== null ? ` / ${fmt(targetG)}g` : ''}
        </Text>
      </View>
      {fraction !== null && (
        <ProgressBar
          progress={fraction}
          color={color}
          height={5}
          accessibilityLabel={`${label} progress: ${Math.round(fraction * 100)}%`}
        />
      )}
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.macroChip}>
      <Text style={{ color, fontSize: typography.sm, fontWeight: typography.semibold }}>
        {label}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
        {' '}{fmt(value)}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  calorieNumbers: { flexDirection: 'row', alignItems: 'baseline' },
  remainingBlock: { alignItems: 'flex-end' },
  macroStack: {},
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroStrip: {
    flexDirection: 'row',
    gap: 16,
  },
  macroChip: { flexDirection: 'row', alignItems: 'center' },
});
