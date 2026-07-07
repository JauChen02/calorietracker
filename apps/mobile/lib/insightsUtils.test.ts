import { describe, it, expect } from 'vitest';
import { buildWindowDates, computeWeeklyInsights } from './insightsUtils';
import type { FoodEntry } from '@calorielog/contracts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WINDOW: string[] = [
  '2024-01-08',
  '2024-01-09',
  '2024-01-10',
  '2024-01-11',
  '2024-01-12',
  '2024-01-13',
  '2024-01-14',
];

let _seq = 0;
function makeEntry(
  overrides: Pick<FoodEntry, 'localDate' | 'calories' | 'proteinG' | 'carbsG' | 'fatG'> &
    Partial<FoodEntry>,
): FoodEntry {
  _seq += 1;
  const seq = String(_seq).padStart(12, '0');
  return {
    id: `eeeeeeee-0000-4000-8000-${seq}`,
    userId: 'user-uuid-0001-0000-0000-000000000001',
    clientMutationId: `cccccccc-0000-4000-8000-${seq}`,
    mealType: 'lunch',
    foodName: 'Test Food',
    brand: null,
    servingLabel: null,
    quantity: 1,
    grams: null,
    fiberG: null,
    source: 'manual',
    loggedAt: `${overrides.localDate}T12:00:00.000Z`,
    timezone: 'America/New_York',
    version: 1,
    createdAt: `${overrides.localDate}T12:00:00.000Z`,
    updatedAt: `${overrides.localDate}T12:00:00.000Z`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildWindowDates
// ---------------------------------------------------------------------------

describe('buildWindowDates', () => {
  it('returns exactly n dates', () => {
    expect(buildWindowDates('2024-01-14', 7)).toHaveLength(7);
  });

  it('ends on the given date', () => {
    const dates = buildWindowDates('2024-01-14', 7);
    expect(dates[dates.length - 1]).toBe('2024-01-14');
  });

  it('starts n-1 days before the end date', () => {
    const dates = buildWindowDates('2024-01-14', 7);
    expect(dates[0]).toBe('2024-01-08');
  });

  it('returns dates in oldest-first order', () => {
    const dates = buildWindowDates('2024-01-14', 7);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i] > dates[i - 1]).toBe(true);
    }
  });

  it('handles month boundaries correctly', () => {
    const dates = buildWindowDates('2024-02-02', 5);
    expect(dates[0]).toBe('2024-01-29');
    expect(dates[4]).toBe('2024-02-02');
  });

  it('handles year boundaries correctly', () => {
    const dates = buildWindowDates('2024-01-03', 5);
    expect(dates[0]).toBe('2023-12-30');
    expect(dates[4]).toBe('2024-01-03');
  });
});

// ---------------------------------------------------------------------------
// computeWeeklyInsights
// ---------------------------------------------------------------------------

describe('computeWeeklyInsights — empty entries', () => {
  it('returns loggedDays=0 and null averages', () => {
    const result = computeWeeklyInsights([], WINDOW);
    expect(result.loggedDays).toBe(0);
    expect(result.avgCalories).toBeNull();
    expect(result.avgProteinG).toBeNull();
    expect(result.avgCarbsG).toBeNull();
    expect(result.avgFatG).toBeNull();
    expect(result.calorieMin).toBeNull();
    expect(result.calorieMax).toBeNull();
  });

  it('dailyStats has one entry per windowDate in the same order, all unlogged', () => {
    const result = computeWeeklyInsights([], WINDOW);
    expect(result.dailyStats).toHaveLength(WINDOW.length);
    result.dailyStats.forEach((s, i) => {
      expect(s.date).toBe(WINDOW[i]);
      expect(s.logged).toBe(false);
      expect(s.calories).toBe(0);
    });
  });
});

describe('computeWeeklyInsights — single logged day', () => {
  const entry = makeEntry({
    localDate: '2024-01-10',
    calories: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 70,
  });
  const result = computeWeeklyInsights([entry], WINDOW);

  it('counts one logged day', () => {
    expect(result.loggedDays).toBe(1);
  });

  it('averages equal the single day values', () => {
    expect(result.avgCalories).toBe(2000);
    expect(result.avgProteinG).toBe(150);
    expect(result.avgCarbsG).toBe(200);
    expect(result.avgFatG).toBe(70);
  });

  it('calorieMin equals calorieMax when only one day is logged', () => {
    expect(result.calorieMin).toBe(2000);
    expect(result.calorieMax).toBe(2000);
  });

  it('marks the logged day correctly in dailyStats', () => {
    const day = result.dailyStats.find((d) => d.date === '2024-01-10');
    expect(day?.logged).toBe(true);
    expect(day?.calories).toBe(2000);
  });

  it('marks all other days as unlogged', () => {
    const unlogged = result.dailyStats.filter((d) => d.date !== '2024-01-10');
    expect(unlogged.every((d) => !d.logged && d.calories === 0)).toBe(true);
  });
});

describe('computeWeeklyInsights — multiple entries on the same day', () => {
  it('sums entries before computing averages', () => {
    const e1 = makeEntry({ localDate: '2024-01-10', calories: 500, proteinG: 30, carbsG: 60, fatG: 15 });
    const e2 = makeEntry({ localDate: '2024-01-10', calories: 700, proteinG: 50, carbsG: 80, fatG: 25 });
    const result = computeWeeklyInsights([e1, e2], WINDOW);
    expect(result.loggedDays).toBe(1);
    expect(result.avgCalories).toBe(1200);
    expect(result.avgProteinG).toBe(80);
    expect(result.avgCarbsG).toBe(140);
    expect(result.avgFatG).toBe(40);
  });
});

describe('computeWeeklyInsights — three logged days', () => {
  const entries = [
    makeEntry({ localDate: '2024-01-08', calories: 1800, proteinG: 120, carbsG: 180, fatG: 60 }),
    makeEntry({ localDate: '2024-01-10', calories: 2200, proteinG: 140, carbsG: 220, fatG: 80 }),
    makeEntry({ localDate: '2024-01-13', calories: 1600, proteinG: 100, carbsG: 160, fatG: 50 }),
  ];
  const result = computeWeeklyInsights(entries, WINDOW);

  it('counts three logged days', () => {
    expect(result.loggedDays).toBe(3);
  });

  it('averages calories from logged days only (not all 7)', () => {
    expect(result.avgCalories).toBe(Math.round((1800 + 2200 + 1600) / 3));
  });

  it('averages protein from logged days only', () => {
    expect(result.avgProteinG).toBe(Math.round((120 + 140 + 100) / 3));
  });

  it('calorieMin is the smallest logged-day total', () => {
    expect(result.calorieMin).toBe(1600);
  });

  it('calorieMax is the largest logged-day total', () => {
    expect(result.calorieMax).toBe(2200);
  });
});

describe('computeWeeklyInsights — out-of-window entries', () => {
  it('excludes entries with localDate outside the window', () => {
    const inWindow = makeEntry({ localDate: '2024-01-10', calories: 2000, proteinG: 100, carbsG: 200, fatG: 60 });
    const outOfWindow = makeEntry({ localDate: '2024-01-01', calories: 9999, proteinG: 999, carbsG: 999, fatG: 999 });
    const result = computeWeeklyInsights([inWindow, outOfWindow], WINDOW);
    expect(result.loggedDays).toBe(1);
    expect(result.avgCalories).toBe(2000);
  });
});

describe('computeWeeklyInsights — windowDates passthrough', () => {
  it('returns the same windowDates that were passed in', () => {
    const result = computeWeeklyInsights([], WINDOW);
    expect(result.windowDates).toBe(WINDOW);
  });
});
