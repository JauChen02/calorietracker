import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { createDb, foodEntries } from "@calorielog/db";
import { PatchFoodEntrySchema } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { toEntryResponse } from "@/lib/food-entries";

type RouteContext = { params: Promise<{ id: string }> };

// Drizzle represents numeric columns as strings; collect them in a typed partial.
type EntryFieldPatch = Partial<{
  mealType: string;
  foodName: string;
  brand: string | null;
  servingLabel: string | null;
  quantity: string;
  grams: string | null;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string | null;
  source: string;
  loggedAt: Date;
  localDate: string;
  timezone: string;
}>;

export async function PATCH(request: Request, { params }: RouteContext) {
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = PatchFoodEntrySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      parsed.error.errors[0]?.message ?? "Invalid request body",
      422,
    );
  }

  const data = parsed.data;
  const db = createDb(assertDatabaseUrl());

  const appUser = await getAppUser(db, clerkUserId);
  if (!appUser) {
    return apiError(
      "USER_NOT_FOUND",
      "User profile not found. Call GET /api/v1/me to initialise your profile.",
      404,
    );
  }

  // Collect optional field updates in a typed partial — only fields present in
  // the request body are included. Numeric values are stringified because
  // Drizzle's numeric() columns use string representation.
  const fieldUpdates: EntryFieldPatch = {};
  if (data.mealType !== undefined) fieldUpdates.mealType = data.mealType;
  if (data.foodName !== undefined) fieldUpdates.foodName = data.foodName.trim();
  if ("brand" in data) fieldUpdates.brand = data.brand?.trim() ?? null;
  if ("servingLabel" in data)
    fieldUpdates.servingLabel = data.servingLabel?.trim() ?? null;
  if (data.quantity !== undefined)
    fieldUpdates.quantity = String(data.quantity);
  if ("grams" in data)
    fieldUpdates.grams =
      data.grams != null ? String(data.grams) : null;
  if (data.calories !== undefined)
    fieldUpdates.calories = String(data.calories);
  if (data.proteinG !== undefined)
    fieldUpdates.proteinG = String(data.proteinG);
  if (data.carbsG !== undefined) fieldUpdates.carbsG = String(data.carbsG);
  if (data.fatG !== undefined) fieldUpdates.fatG = String(data.fatG);
  if ("fiberG" in data)
    fieldUpdates.fiberG =
      data.fiberG != null ? String(data.fiberG) : null;
  if (data.source !== undefined) fieldUpdates.source = data.source;
  if (data.loggedAt !== undefined)
    fieldUpdates.loggedAt = new Date(data.loggedAt);
  if (data.localDate !== undefined) fieldUpdates.localDate = data.localDate;
  if (data.timezone !== undefined) fieldUpdates.timezone = data.timezone;

  // When baseVersion is provided, enforce optimistic concurrency: only update
  // if the stored version matches what the client last saw.
  const whereBase = and(eq(foodEntries.id, id), eq(foodEntries.userId, appUser.id));
  const whereClause =
    data.baseVersion !== undefined
      ? and(whereBase, eq(foodEntries.version, data.baseVersion))
      : whereBase;

  const [updated] = await db
    .update(foodEntries)
    .set({
      ...fieldUpdates,
      version: sql`${foodEntries.version} + 1`,
      updatedAt: new Date(),
    })
    .where(whereClause)
    .returning();

  if (!updated) {
    if (data.baseVersion !== undefined) {
      // Distinguish version mismatch from entry-not-found.
      const [current] = await db
        .select()
        .from(foodEntries)
        .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, appUser.id)));
      if (current) {
        return NextResponse.json(
          {
            error: {
              code: "VERSION_CONFLICT",
              message: "Entry was modified since you last loaded it.",
            },
            current: toEntryResponse(current),
          },
          { status: 409 },
        );
      }
    }
    return apiError("NOT_FOUND", "Entry not found", 404);
  }

  return NextResponse.json(toEntryResponse(updated));
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const { id } = await params;

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
    .delete(foodEntries)
    .where(and(eq(foodEntries.id, id), eq(foodEntries.userId, appUser.id)))
    .returning();

  if (!deleted) {
    return apiError("NOT_FOUND", "Entry not found", 404);
  }

  return new Response(null, { status: 204 });
}
