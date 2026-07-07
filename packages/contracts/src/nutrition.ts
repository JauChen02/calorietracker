/**
 * Pure nutrition utilities — no Zod runtime, no side effects.
 * Safe to import in both the API and the mobile app.
 */

export type MacroTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

type EntryMacros = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
};

type TargetInputs = {
  calorieTarget: number | null;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
};

export type DailyProgress = {
  /** Raw totals for all entries passed in. */
  consumed: MacroTotals;
  /** Calorie target, or null if not set. */
  calorieTarget: number | null;
  /** calorieTarget − consumed.calories, or null if no target. Can be negative when over target. */
  caloriesRemaining: number | null;
  /** Raw macro targets, each null if not set. */
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
  /** consumed / target, can exceed 1.0. Null when target is absent or zero. */
  proteinFraction: number | null;
  carbsFraction: number | null;
  fatFraction: number | null;
};

const ZERO_TOTALS: MacroTotals = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
};

/**
 * Sums macro totals across an array of food entries.
 * Returns zero totals for an empty array.
 * fiberG null values are treated as 0.
 */
export function sumEntries(entries: EntryMacros[]): MacroTotals {
  if (entries.length === 0) return { ...ZERO_TOTALS };
  return entries.reduce<MacroTotals>(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + e.carbsG,
      fatG: acc.fatG + e.fatG,
      fiberG: acc.fiberG + (e.fiberG ?? 0),
    }),
    { ...ZERO_TOTALS },
  );
}

/**
 * Returns the percentage of a macro against a target.
 * Returns null when the target is null, zero, or negative.
 */
export function macroPercent(
  value: number,
  target: number | null,
): number | null {
  if (target === null || target <= 0) return null;
  return Math.round((value / target) * 100);
}

/**
 * Computes daily calorie and macro progress against optional targets.
 * When targets is null (not yet set), progress fractions are null.
 * This is the single source of truth for dashboard calculations.
 */
export function dailyProgress(
  entries: EntryMacros[],
  targets: TargetInputs | null,
): DailyProgress {
  const consumed = sumEntries(entries);

  if (targets === null) {
    return {
      consumed,
      calorieTarget: null,
      caloriesRemaining: null,
      proteinTargetG: null,
      carbsTargetG: null,
      fatTargetG: null,
      proteinFraction: null,
      carbsFraction: null,
      fatFraction: null,
    };
  }

  const { calorieTarget, proteinTargetG, carbsTargetG, fatTargetG } = targets;

  return {
    consumed,
    calorieTarget,
    caloriesRemaining: calorieTarget !== null ? calorieTarget - consumed.calories : null,
    proteinTargetG,
    carbsTargetG,
    fatTargetG,
    proteinFraction:
      proteinTargetG !== null && proteinTargetG > 0
        ? consumed.proteinG / proteinTargetG
        : null,
    carbsFraction:
      carbsTargetG !== null && carbsTargetG > 0
        ? consumed.carbsG / carbsTargetG
        : null,
    fatFraction:
      fatTargetG !== null && fatTargetG > 0
        ? consumed.fatG / fatTargetG
        : null,
  };
}
