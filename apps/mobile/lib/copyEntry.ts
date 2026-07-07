import type { FoodEntry, CreateFoodEntry } from '@calorielog/contracts';
import { generateUUID } from './uuid';
import { toLocalDate } from './dateUtils';

/**
 * Builds a CreateFoodEntry payload that copies nutritional data from an
 * existing entry into a new record. Always assigns a fresh clientMutationId
 * so the server treats this as a distinct entry.
 *
 * @param entry   The source entry to copy from.
 * @param now     The current timestamp (injected for testability).
 * @param timezone The device's IANA timezone string.
 */
export function buildCopyPayload(
  entry: FoodEntry,
  now: Date,
  timezone: string,
): CreateFoodEntry {
  return {
    clientMutationId: generateUUID(),
    mealType: entry.mealType,
    foodName: entry.foodName,
    brand: entry.brand,
    servingLabel: entry.servingLabel,
    quantity: entry.quantity,
    grams: entry.grams,
    calories: entry.calories,
    proteinG: entry.proteinG,
    carbsG: entry.carbsG,
    fatG: entry.fatG,
    fiberG: entry.fiberG,
    source: 'manual',
    loggedAt: now.toISOString(),
    localDate: toLocalDate(now),
    timezone,
  };
}
