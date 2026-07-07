import type { CustomFood as CustomFoodContract } from "@calorielog/contracts";
import type { CustomFood as DbCustomFood } from "@calorielog/db";

/**
 * Converts a Drizzle custom_foods row to the API response shape.
 * numeric(10,2) columns come back as strings from Postgres; parse them to numbers.
 */
export function toCustomFoodResponse(row: DbCustomFood): CustomFoodContract {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    brand: row.brand ?? null,
    servingLabel: row.servingLabel ?? null,
    defaultQuantity: Number(row.defaultQuantity),
    defaultGrams: row.defaultGrams !== null ? Number(row.defaultGrams) : null,
    calories: Number(row.calories),
    proteinG: Number(row.proteinG),
    carbsG: Number(row.carbsG),
    fatG: Number(row.fatG),
    fiberG: row.fiberG !== null ? Number(row.fiberG) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
