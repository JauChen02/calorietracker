import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { createDb, foodEntries, savedMealItems, savedMeals } from "@calorielog/db";
import { CreateSavedMealSchema } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { toSavedMealResponse } from "@/lib/saved-meals";

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

  const meals = await db
    .select()
    .from(savedMeals)
    .where(eq(savedMeals.userId, appUser.id))
    .orderBy(asc(savedMeals.createdAt));

  if (meals.length === 0) {
    return NextResponse.json({ savedMeals: [] });
  }

  const mealIds = meals.map((m) => m.id);
  const items = await db
    .select()
    .from(savedMealItems)
    .where(inArray(savedMealItems.savedMealId, mealIds))
    .orderBy(asc(savedMealItems.sortOrder));

  const itemsByMealId = new Map<string, typeof items>();
  for (const item of items) {
    const existing = itemsByMealId.get(item.savedMealId) ?? [];
    existing.push(item);
    itemsByMealId.set(item.savedMealId, existing);
  }

  return NextResponse.json({
    savedMeals: meals.map((meal) =>
      toSavedMealResponse(meal, itemsByMealId.get(meal.id) ?? []),
    ),
  });
}

export async function POST(request: Request) {
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = CreateSavedMealSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.errors.map((e) => e.message).join(", "),
      400,
    );
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

  const d = parsed.data;

  // Load the source food entries, verifying ownership via WHERE user_id
  const sourceEntries = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, appUser.id),
        inArray(foodEntries.id, d.entryIds),
      ),
    )
    .orderBy(desc(foodEntries.loggedAt));

  if (sourceEntries.length === 0) {
    return apiError("NOT_FOUND", "No matching food entries found", 404);
  }

  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [meal] = await tx
      .insert(savedMeals)
      .values({
        userId: appUser.id,
        name: d.name,
        defaultMealType: d.defaultMealType ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const itemValues = sourceEntries.map((entry, idx) => ({
      savedMealId: meal.id,
      sortOrder: idx,
      foodName: entry.foodName,
      brand: entry.brand ?? null,
      servingLabel: entry.servingLabel ?? null,
      quantity: entry.quantity,
      grams: entry.grams ?? null,
      calories: entry.calories,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      fiberG: entry.fiberG ?? null,
      source: entry.source,
      createdAt: now,
      updatedAt: now,
    }));

    const items = await tx.insert(savedMealItems).values(itemValues).returning();

    return { meal, items };
  });

  return NextResponse.json(
    toSavedMealResponse(result.meal, result.items),
    { status: 201 },
  );
}
