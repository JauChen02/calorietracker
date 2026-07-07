import type { FoodEntry } from '@calorielog/contracts';

export interface DailyStats {
  date: string;
  logged: boolean;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface WeeklyInsights {
  windowDates: string[];
  loggedDays: number;
  avgCalories: number | null;
  avgProteinG: number | null;
  avgCarbsG: number | null;
  avgFatG: number | null;
  calorieMin: number | null;
  calorieMax: number | null;
  dailyStats: DailyStats[];
}

/**
 * Returns n consecutive YYYY-MM-DD strings ending on endDate (inclusive), oldest-first.
 */
export function buildWindowDates(endDate: string, n: number): string[] {
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endDate + 'T12:00:00');
    d.setDate(d.getDate() - i);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }
  return result;
}

export function computeWeeklyInsights(
  entries: FoodEntry[],
  windowDates: string[],
): WeeklyInsights {
  const windowSet = new Set(windowDates);
  const dayMap = new Map<
    string,
    { calories: number; proteinG: number; carbsG: number; fatG: number }
  >();

  for (const entry of entries) {
    if (!windowSet.has(entry.localDate)) continue;
    const existing = dayMap.get(entry.localDate) ?? {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    };
    dayMap.set(entry.localDate, {
      calories: existing.calories + entry.calories,
      proteinG: existing.proteinG + entry.proteinG,
      carbsG: existing.carbsG + entry.carbsG,
      fatG: existing.fatG + entry.fatG,
    });
  }

  const dailyStats: DailyStats[] = windowDates.map((date) => {
    const totals = dayMap.get(date);
    if (totals === undefined) {
      return { date, logged: false, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    }
    return { date, logged: true, ...totals };
  });

  const loggedStats = dailyStats.filter((d) => d.logged);
  const loggedDays = loggedStats.length;

  if (loggedDays === 0) {
    return {
      windowDates,
      loggedDays: 0,
      avgCalories: null,
      avgProteinG: null,
      avgCarbsG: null,
      avgFatG: null,
      calorieMin: null,
      calorieMax: null,
      dailyStats,
    };
  }

  const totalCalories = loggedStats.reduce((s, d) => s + d.calories, 0);
  const totalProtein = loggedStats.reduce((s, d) => s + d.proteinG, 0);
  const totalCarbs = loggedStats.reduce((s, d) => s + d.carbsG, 0);
  const totalFat = loggedStats.reduce((s, d) => s + d.fatG, 0);
  const calorieValues = loggedStats.map((d) => d.calories);

  return {
    windowDates,
    loggedDays,
    avgCalories: Math.round(totalCalories / loggedDays),
    avgProteinG: Math.round(totalProtein / loggedDays),
    avgCarbsG: Math.round(totalCarbs / loggedDays),
    avgFatG: Math.round(totalFat / loggedDays),
    calorieMin: Math.min(...calorieValues),
    calorieMax: Math.max(...calorieValues),
    dailyStats,
  };
}
