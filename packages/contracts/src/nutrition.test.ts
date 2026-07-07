import { describe, it, expect } from "vitest";
import { sumEntries, macroPercent, dailyProgress } from "./nutrition";

describe("sumEntries", () => {
  it("returns zero totals for an empty array", () => {
    const totals = sumEntries([]);
    expect(totals).toEqual({
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
    });
  });

  it("sums a single entry correctly", () => {
    const totals = sumEntries([
      { calories: 300, proteinG: 10, carbsG: 54, fatG: 6, fiberG: 4 },
    ]);
    expect(totals).toEqual({
      calories: 300,
      proteinG: 10,
      carbsG: 54,
      fatG: 6,
      fiberG: 4,
    });
  });

  it("sums multiple entries correctly", () => {
    const totals = sumEntries([
      { calories: 300, proteinG: 10, carbsG: 54, fatG: 6, fiberG: 4 },
      { calories: 500, proteinG: 25, carbsG: 60, fatG: 15, fiberG: 2 },
    ]);
    expect(totals).toEqual({
      calories: 800,
      proteinG: 35,
      carbsG: 114,
      fatG: 21,
      fiberG: 6,
    });
  });

  it("treats null fiberG as 0", () => {
    const totals = sumEntries([
      { calories: 100, proteinG: 5, carbsG: 10, fatG: 2, fiberG: null },
      { calories: 200, proteinG: 10, carbsG: 20, fatG: 4, fiberG: 3 },
    ]);
    expect(totals.fiberG).toBe(3);
  });

  it("returns a fresh object each call (not a shared reference)", () => {
    const a = sumEntries([]);
    const b = sumEntries([]);
    a.calories = 999;
    expect(b.calories).toBe(0);
  });

  it("handles floating-point macro values without clamping", () => {
    const totals = sumEntries([
      { calories: 95.5, proteinG: 0.5, carbsG: 25.1, fatG: 0.3, fiberG: 4.4 },
      { calories: 4.5, proteinG: 0.5, carbsG: 0.9, fatG: 0.2, fiberG: null },
    ]);
    expect(totals.calories).toBeCloseTo(100);
    expect(totals.proteinG).toBeCloseTo(1);
    expect(totals.fiberG).toBeCloseTo(4.4);
  });
});

describe("dailyProgress", () => {
  const targets2000 = {
    calorieTarget: 2000,
    proteinTargetG: 150,
    carbsTargetG: 200,
    fatTargetG: 65,
  };

  const entryA = { calories: 400, proteinG: 30, carbsG: 50, fatG: 10, fiberG: 5 };
  const entryB = { calories: 600, proteinG: 40, carbsG: 80, fatG: 20, fiberG: 3 };

  it("returns correct daily calorie total", () => {
    const p = dailyProgress([entryA, entryB], targets2000);
    expect(p.consumed.calories).toBe(1000);
  });

  it("returns correct macro totals", () => {
    const p = dailyProgress([entryA, entryB], targets2000);
    expect(p.consumed.proteinG).toBe(70);
    expect(p.consumed.carbsG).toBe(130);
    expect(p.consumed.fatG).toBe(30);
  });

  it("returns caloriesRemaining when calorie target is set", () => {
    const p = dailyProgress([entryA], targets2000);
    expect(p.caloriesRemaining).toBe(1600);
  });

  it("returns null caloriesRemaining when calorie target is null", () => {
    const p = dailyProgress([entryA], {
      calorieTarget: null,
      proteinTargetG: 150,
      carbsTargetG: 200,
      fatTargetG: 65,
    });
    expect(p.caloriesRemaining).toBeNull();
  });

  it("returns all nulls when targets is null (no goals configured)", () => {
    const p = dailyProgress([entryA, entryB], null);
    expect(p.calorieTarget).toBeNull();
    expect(p.caloriesRemaining).toBeNull();
    expect(p.proteinTargetG).toBeNull();
    expect(p.carbsTargetG).toBeNull();
    expect(p.fatTargetG).toBeNull();
    expect(p.proteinFraction).toBeNull();
    expect(p.carbsFraction).toBeNull();
    expect(p.fatFraction).toBeNull();
  });

  it("still returns consumed totals when targets is null", () => {
    const p = dailyProgress([entryA, entryB], null);
    expect(p.consumed.calories).toBe(1000);
    expect(p.consumed.proteinG).toBe(70);
  });

  it("returns null fractions when individual macro targets are null", () => {
    const p = dailyProgress([entryA], {
      calorieTarget: 2000,
      proteinTargetG: null,
      carbsTargetG: null,
      fatTargetG: null,
    });
    expect(p.proteinFraction).toBeNull();
    expect(p.carbsFraction).toBeNull();
    expect(p.fatFraction).toBeNull();
  });

  it("totals entries across all meal groups (breakfast, lunch, dinner, snack)", () => {
    const breakfast = { calories: 400, proteinG: 30, carbsG: 50, fatG: 10, fiberG: 5 };
    const lunch     = { calories: 600, proteinG: 40, carbsG: 80, fatG: 20, fiberG: 3 };
    const dinner    = { calories: 700, proteinG: 50, carbsG: 90, fatG: 25, fiberG: 8 };
    const snack     = { calories: 150, proteinG:  5, carbsG: 20, fatG:  5, fiberG: 1 };
    const p = dailyProgress([breakfast, lunch, dinner, snack], null);
    expect(p.consumed.calories).toBe(1850);
    expect(p.consumed.proteinG).toBe(125);
    expect(p.consumed.carbsG).toBe(240);
    expect(p.consumed.fatG).toBe(60);
  });

  it("sums entries regardless of loggedAt timestamp (local_date is the boundary)", () => {
    // The API filters by local_date server-side; whatever comes back is summed in full.
    // This simulates two entries logged near midnight that both carry the same local_date.
    const earlyNight = { calories: 200, proteinG: 10, carbsG: 30, fatG: 5, fiberG: 2 };
    const lateNight  = { calories: 300, proteinG: 20, carbsG: 40, fatG: 8, fiberG: 3 };
    const p = dailyProgress([earlyNight, lateNight], null);
    expect(p.consumed.calories).toBe(500);
    expect(p.consumed.proteinG).toBe(30);
  });

  it("returns caloriesRemaining < 0 when consumed exceeds target (not clamped)", () => {
    const bigEntry = { calories: 2500, proteinG: 200, carbsG: 0, fatG: 0, fiberG: 0 };
    const p = dailyProgress([bigEntry], targets2000);
    expect(p.caloriesRemaining).toBe(-500);
  });

  it("returns proteinFraction > 1 when consumed exceeds protein target", () => {
    const highProtein = { calories: 500, proteinG: 200, carbsG: 0, fatG: 0, fiberG: 0 };
    const p = dailyProgress([highProtein], targets2000);
    expect(p.proteinFraction).toBeCloseTo(200 / 150);
  });

  it("returns zero totals and full remaining when no entries", () => {
    const p = dailyProgress([], targets2000);
    expect(p.consumed.calories).toBe(0);
    expect(p.caloriesRemaining).toBe(2000);
    expect(p.proteinFraction).toBe(0);
    expect(p.carbsFraction).toBe(0);
    expect(p.fatFraction).toBe(0);
  });
});

describe("macroPercent", () => {
  it("returns the rounded percentage when target is positive", () => {
    expect(macroPercent(150, 200)).toBe(75);
  });

  it("rounds to the nearest integer", () => {
    expect(macroPercent(1, 3)).toBe(33);
  });

  it("returns null when target is null", () => {
    expect(macroPercent(100, null)).toBeNull();
  });

  it("returns null when target is zero", () => {
    expect(macroPercent(100, 0)).toBeNull();
  });

  it("returns null when target is negative", () => {
    expect(macroPercent(100, -1)).toBeNull();
  });

  it("returns 100 when value equals target", () => {
    expect(macroPercent(2000, 2000)).toBe(100);
  });

  it("can return more than 100 when value exceeds target", () => {
    expect(macroPercent(2500, 2000)).toBe(125);
  });
});
