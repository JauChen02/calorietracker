import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { createDb, foodEntries, savedMealItems, savedMeals } from "@calorielog/db";
import { LogSavedMealSchema } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { toEntryResponse } from "@/lib/food-entries";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

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

  const parsed = LogSavedMealSchema.safeParse(body);
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

  // Verify ownership
  const [meal] = await db
    .select()
    .from(savedMeals)
    .where(and(eq(savedMeals.id, id), eq(savedMeals.userId, appUser.id)));

  if (!meal) {
    return apiError("NOT_FOUND", "Saved meal not found", 404);
  }

  const items = await db
    .select()
    .from(savedMealItems)
    .where(eq(savedMealItems.savedMealId, meal.id))
    .orderBy(asc(savedMealItems.sortOrder));

  const d = parsed.data;

  if (d.clientMutationIds.length !== items.length) {
    return apiError(
      "VALIDATION_ERROR",
      `clientMutationIds must have exactly ${items.length} entries (one per meal item)`,
      400,
    );
  }

  const loggedAt = new Date(d.loggedAt);
  const now = new Date();

  const createdEntries = await db.transaction(async (tx) => {
    const inserted: (typeof foodEntries.$inferSelect)[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const clientMutationId = d.clientMutationIds[i];

      const [entry] = await tx
        .insert(foodEntries)
        .values({
          userId: appUser.id,
          clientMutationId,
          mealType: d.mealType,
          foodName: item.foodName,
          brand: item.brand ?? null,
          servingLabel: item.servingLabel ?? null,
          quantity: item.quantity,
          grams: item.grams ?? null,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          fiberG: item.fiberG ?? null,
          source: "saved_meal",
          loggedAt,
          localDate: d.localDate,
          timezone: d.timezone,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({
          target: [foodEntries.userId, foodEntries.clientMutationId],
        })
        .returning();

      if (entry) {
        inserted.push(entry);
      } else {
        // Idempotent: return existing entry
        const [existing] = await tx
          .select()
          .from(foodEntries)
          .where(
            and(
              eq(foodEntries.userId, appUser.id),
              eq(foodEntries.clientMutationId, clientMutationId),
            ),
          );
        if (existing) inserted.push(existing);
      }
    }

    return inserted;
  });

  return NextResponse.json(
    { entries: createdEntries.map(toEntryResponse) },
    { status: 201 },
  );
}
