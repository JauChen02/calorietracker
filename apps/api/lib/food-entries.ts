import type { FoodEntry } from "@calorielog/contracts";
import type { FoodEntry as DbFoodEntry } from "@calorielog/db";

/**
 * Converts a Drizzle food_entries row to the API response shape.
 *
 * Drizzle returns numeric(10,2) columns as strings from Postgres to preserve
 * precision. This function parses them to numbers before sending JSON so the
 * API contract always delivers numeric values as numbers.
 */
export function toEntryResponse(row: DbFoodEntry): FoodEntry {
  return {
    id: row.id,
    userId: row.userId,
    clientMutationId: row.clientMutationId,
    mealType: row.mealType as FoodEntry["mealType"],
    foodName: row.foodName,
    brand: row.brand ?? null,
    servingLabel: row.servingLabel ?? null,
    quantity: Number(row.quantity),
    grams: row.grams !== null ? Number(row.grams) : null,
    calories: Number(row.calories),
    proteinG: Number(row.proteinG),
    carbsG: Number(row.carbsG),
    fatG: Number(row.fatG),
    fiberG: row.fiberG !== null ? Number(row.fiberG) : null,
    source: row.source as FoodEntry["source"],
    loggedAt: row.loggedAt.toISOString(),
    localDate: row.localDate,
    timezone: row.timezone,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
