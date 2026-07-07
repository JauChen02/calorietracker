import type { SavedMeal as DbSavedMeal, SavedMealItem as DbSavedMealItem } from "@calorielog/db";
import type { SavedMeal, SavedMealItem } from "@calorielog/contracts";

export function toSavedMealItemResponse(row: DbSavedMealItem): SavedMealItem {
  return {
    id: row.id,
    savedMealId: row.savedMealId,
    sortOrder: row.sortOrder,
    foodName: row.foodName,
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

export function toSavedMealResponse(
  meal: DbSavedMeal,
  items: DbSavedMealItem[],
): SavedMeal {
  return {
    id: meal.id,
    userId: meal.userId,
    name: meal.name,
    defaultMealType: (meal.defaultMealType as SavedMeal["defaultMealType"]) ?? null,
    items: items
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(toSavedMealItemResponse),
    createdAt: meal.createdAt.toISOString(),
    updatedAt: meal.updatedAt.toISOString(),
  };
}
