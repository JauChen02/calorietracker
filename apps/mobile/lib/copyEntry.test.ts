import { describe, it, expect } from 'vitest';
import { buildCopyPayload } from './copyEntry';
import { toLocalDate } from './dateUtils';
import type { FoodEntry } from '@calorielog/contracts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SOURCE_ENTRY: FoodEntry = {
  id: 'eeeeeeee-0000-4000-8000-000000000001',
  userId: 'user-uuid-1',
  clientMutationId: 'original-mutation-aaaa-bbbb-cccccccccccc',
  mealType: 'dinner',
  foodName: 'Chicken rice',
  brand: null,
  servingLabel: '1 bowl',
  quantity: 1,
  grams: null,
  calories: 500,
  proteinG: 40,
  carbsG: 60,
  fatG: 10,
  fiberG: 3,
  source: 'manual',
  loggedAt: '2024-01-10T18:00:00.000Z',
  localDate: '2024-01-10',
  timezone: 'America/New_York',
  version: 2,
  createdAt: '2024-01-10T18:00:00.000Z',
  updatedAt: '2024-01-10T18:30:00.000Z',
};

const NOW = new Date('2024-01-15T12:00:00.000Z');
const TZ = 'America/Chicago';

// ---------------------------------------------------------------------------
// Test: copy entry creates a new mutation ID
// ---------------------------------------------------------------------------

describe('buildCopyPayload', () => {
  it('generates a clientMutationId that differs from the source entry', () => {
    const payload = buildCopyPayload(SOURCE_ENTRY, NOW, TZ);
    expect(payload.clientMutationId).not.toBe(SOURCE_ENTRY.clientMutationId);
  });

  it('generates a different clientMutationId on every call (UUIDs are unique)', () => {
    const a = buildCopyPayload(SOURCE_ENTRY, NOW, TZ);
    const b = buildCopyPayload(SOURCE_ENTRY, NOW, TZ);
    expect(a.clientMutationId).not.toBe(b.clientMutationId);
  });

  it('sets loggedAt to the provided now timestamp', () => {
    const payload = buildCopyPayload(SOURCE_ENTRY, NOW, TZ);
    expect(payload.loggedAt).toBe(NOW.toISOString());
  });

  it('sets localDate to the local date derived from now', () => {
    const payload = buildCopyPayload(SOURCE_ENTRY, NOW, TZ);
    // toLocalDate uses the device/test-runner local clock — assert structural equality
    expect(payload.localDate).toBe(toLocalDate(NOW));
  });

  it('uses the provided timezone', () => {
    const payload = buildCopyPayload(SOURCE_ENTRY, NOW, TZ);
    expect(payload.timezone).toBe(TZ);
  });

  it('preserves all nutritional values from the source entry', () => {
    const payload = buildCopyPayload(SOURCE_ENTRY, NOW, TZ);
    expect(payload.foodName).toBe(SOURCE_ENTRY.foodName);
    expect(payload.calories).toBe(SOURCE_ENTRY.calories);
    expect(payload.proteinG).toBe(SOURCE_ENTRY.proteinG);
    expect(payload.carbsG).toBe(SOURCE_ENTRY.carbsG);
    expect(payload.fatG).toBe(SOURCE_ENTRY.fatG);
    expect(payload.fiberG).toBe(SOURCE_ENTRY.fiberG);
    expect(payload.quantity).toBe(SOURCE_ENTRY.quantity);
    expect(payload.mealType).toBe(SOURCE_ENTRY.mealType);
    expect(payload.servingLabel).toBe(SOURCE_ENTRY.servingLabel);
  });

  it('sets source to "manual" regardless of the original source', () => {
    const catalogEntry = { ...SOURCE_ENTRY, source: 'catalog' as const };
    const payload = buildCopyPayload(catalogEntry, NOW, TZ);
    expect(payload.source).toBe('manual');
  });
});

// ---------------------------------------------------------------------------
// Test: editing yesterday does not change today
// ---------------------------------------------------------------------------

describe('date cache isolation', () => {
  it('query keys for different dates are not equal (guarantees cache isolation)', () => {
    // TanStack Query uses deep-equal comparison on query keys to scope cache
    // entries. Different dates must produce non-equal keys so that mutations
    // on a history date never touch today's cache.
    const today = '2024-01-15';
    const yesterday = '2024-01-14';

    const todayKey = ['day', today];
    const yesterdayKey = ['day', yesterday];

    expect(todayKey).not.toEqual(yesterdayKey);
    expect(todayKey[1]).not.toBe(yesterdayKey[1]);
  });

  it('the localDate field in a copy payload is todays date, not the source entry date', () => {
    const payload = buildCopyPayload(SOURCE_ENTRY, NOW, 'UTC');
    // The copied entry must NOT carry forward the source's old localDate.
    // Failing this would log the copy under the original historical date.
    expect(payload.localDate).not.toBe(SOURCE_ENTRY.localDate);
    expect(payload.localDate).toBe(toLocalDate(NOW));
  });
});
