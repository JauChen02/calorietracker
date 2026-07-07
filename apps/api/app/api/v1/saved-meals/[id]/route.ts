import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { createDb, savedMealItems, savedMeals } from "@calorielog/db";
import { UpdateSavedMealSchema } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { toSavedMealResponse } from "@/lib/saved-meals";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
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

  const parsed = UpdateSavedMealSchema.safeParse(body);
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
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (d.name !== undefined) updates.name = d.name;
  if ("defaultMealType" in d) updates.defaultMealType = d.defaultMealType ?? null;

  const [meal] = await db
    .update(savedMeals)
    .set(updates)
    .where(and(eq(savedMeals.id, id), eq(savedMeals.userId, appUser.id)))
    .returning();

  if (!meal) {
    return apiError("NOT_FOUND", "Saved meal not found", 404);
  }

  const items = await db
    .select()
    .from(savedMealItems)
    .where(eq(savedMealItems.savedMealId, meal.id))
    .orderBy(asc(savedMealItems.sortOrder));

  return NextResponse.json(toSavedMealResponse(meal, items));
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

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

  const [deleted] = await db
    .delete(savedMeals)
    .where(and(eq(savedMeals.id, id), eq(savedMeals.userId, appUser.id)))
    .returning({ id: savedMeals.id });

  if (!deleted) {
    return apiError("NOT_FOUND", "Saved meal not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
