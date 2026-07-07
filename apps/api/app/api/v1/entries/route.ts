import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { createDb, foodEntries } from "@calorielog/db";
import { CreateFoodEntrySchema } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { toEntryResponse } from "@/lib/food-entries";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !DATE_RE.test(from) || !to || !DATE_RE.test(to)) {
    return apiError(
      "INVALID_DATE_RANGE",
      "Query parameters 'from' and 'to' must be valid YYYY-MM-DD dates",
      400,
    );
  }

  if (from > to) {
    return apiError("INVALID_DATE_RANGE", "'from' must not be after 'to'", 400);
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

  const rows = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, appUser.id),
        gte(foodEntries.localDate, from),
        lte(foodEntries.localDate, to),
      ),
    )
    .orderBy(foodEntries.loggedAt);

  return NextResponse.json({
    from,
    to,
    entries: rows.map(toEntryResponse),
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

  const parsed = CreateFoodEntrySchema.safeParse(body);
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

  const now = new Date();

  // Attempt idempotent insert — ignore conflict on (user_id, client_mutation_id)
  const [inserted] = await db
    .insert(foodEntries)
    .values({
      userId: appUser.id,
      clientMutationId: data.clientMutationId,
      mealType: data.mealType,
      foodName: data.foodName.trim(),
      brand: data.brand?.trim() ?? null,
      servingLabel: data.servingLabel?.trim() ?? null,
      quantity: String(data.quantity),
      grams: data.grams !== null && data.grams !== undefined ? String(data.grams) : null,
      calories: String(data.calories),
      proteinG: String(data.proteinG),
      carbsG: String(data.carbsG),
      fatG: String(data.fatG),
      fiberG: data.fiberG !== null && data.fiberG !== undefined ? String(data.fiberG) : null,
      source: data.source,
      loggedAt: new Date(data.loggedAt),
      localDate: data.localDate,
      timezone: data.timezone,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [foodEntries.userId, foodEntries.clientMutationId],
    })
    .returning();

  if (inserted) {
    return NextResponse.json(toEntryResponse(inserted), { status: 201 });
  }

  // Conflict — return the original entry (idempotent behaviour)
  const [existing] = await db
    .select()
    .from(foodEntries)
    .where(
      and(
        eq(foodEntries.userId, appUser.id),
        eq(foodEntries.clientMutationId, data.clientMutationId),
      ),
    );

  if (!existing) {
    return apiError("INTERNAL_ERROR", "Failed to retrieve entry after conflict", 500);
  }

  return NextResponse.json(toEntryResponse(existing), { status: 200 });
}
