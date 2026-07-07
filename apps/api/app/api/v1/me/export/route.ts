import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import {
  createDb,
  foodEntries,
  nutritionTargets,
  customFoods,
  favorites,
  savedMeals,
  savedMealItems,
} from "@calorielog/db";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { toEntryResponse } from "@/lib/food-entries";

/**
 * Converts a DB custom_foods row to the export shape (numeric strings → numbers).
 */
function toCustomFoodExport(row: typeof customFoods.$inferSelect) {
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

function toFavoriteExport(row: typeof favorites.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    brand: row.brand ?? null,
    servingLabel: row.servingLabel ?? null,
    quantity: Number(row.quantity),
    grams: row.grams !== null ? Number(row.grams) : null,
    calories: Number(row.calories),
    proteinG: Number(row.proteinG),
    carbsG: Number(row.carbsG),
    fatG: Number(row.fatG),
    fiberG: row.fiberG !== null ? Number(row.fiberG) : null,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSavedMealItemExport(row: typeof savedMealItems.$inferSelect) {
  return {
    id: row.id,
    savedMealId: row.savedMealId,
    sortOrder: row.sortOrder,
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
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * GET /api/v1/me/export
 *
 * Returns a JSON file containing all user-owned data. The response includes a
 * Content-Disposition header so browsers and share-sheets treat it as a
 * downloadable file.
 *
 * Intentionally excludes: internal UUIDs used only for DB joins, Clerk tokens,
 * and any server credentials. The export contains only nutrition and food data
 * the user explicitly logged.
 */
export async function GET() {
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const db = createDb(assertDatabaseUrl());
  const appUser = await getAppUser(db, clerkUserId);
  if (!appUser) {
    return apiError(
      "USER_NOT_FOUND",
      "User profile not found. Call GET /api/v1/me to initialise your profile.",
      404,
    );
  }

  const uid = appUser.id;

  const [
    entriesList,
    targetsList,
    customFoodsList,
    favoritesList,
    savedMealsList,
  ] = await Promise.all([
    db
      .select()
      .from(foodEntries)
      .where(eq(foodEntries.userId, uid))
      .orderBy(foodEntries.loggedAt),
    db
      .select()
      .from(nutritionTargets)
      .where(eq(nutritionTargets.userId, uid)),
    db.select().from(customFoods).where(eq(customFoods.userId, uid)),
    db.select().from(favorites).where(eq(favorites.userId, uid)),
    db.select().from(savedMeals).where(eq(savedMeals.userId, uid)),
  ]);

  const mealIds = savedMealsList.map((m) => m.id);
  const allMealItems =
    mealIds.length > 0
      ? await db
          .select()
          .from(savedMealItems)
          .where(inArray(savedMealItems.savedMealId, mealIds))
      : [];

  const exportData = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    foodEntries: entriesList.map(toEntryResponse),
    nutritionTargets: targetsList[0]
      ? {
          calorieTarget: targetsList[0].calorieTarget ?? null,
          proteinTargetG:
            targetsList[0].proteinTargetG !== null
              ? Number(targetsList[0].proteinTargetG)
              : null,
          carbsTargetG:
            targetsList[0].carbsTargetG !== null
              ? Number(targetsList[0].carbsTargetG)
              : null,
          fatTargetG:
            targetsList[0].fatTargetG !== null
              ? Number(targetsList[0].fatTargetG)
              : null,
          updatedAt: targetsList[0].updatedAt.toISOString(),
        }
      : null,
    customFoods: customFoodsList.map(toCustomFoodExport),
    favorites: favoritesList.map(toFavoriteExport),
    savedMeals: savedMealsList.map((meal) => ({
      id: meal.id,
      name: meal.name,
      defaultMealType: meal.defaultMealType ?? null,
      createdAt: meal.createdAt.toISOString(),
      updatedAt: meal.updatedAt.toISOString(),
      items: allMealItems
        .filter((item) => item.savedMealId === meal.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(toSavedMealItemExport),
    })),
  };

  const date = new Date().toISOString().slice(0, 10);
  const filename = `calorielog-export-${date}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
