import type { Favorite as DbFavorite } from "@calorielog/db";
import type { Favorite } from "@calorielog/contracts";

export function toFavoriteResponse(row: DbFavorite): Favorite {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    brand: row.brand ?? null,
    servingLabel: row.servingLabel ?? null,
    quantity: Number(row.quantity),
    grams: row.grams != null ? Number(row.grams) : null,
    calories: Number(row.calories),
    proteinG: Number(row.proteinG),
    carbsG: Number(row.carbsG),
    fatG: Number(row.fatG),
    fiberG: row.fiberG != null ? Number(row.fiberG) : null,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
