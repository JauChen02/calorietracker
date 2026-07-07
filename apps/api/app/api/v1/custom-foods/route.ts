import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { createDb, customFoods } from "@calorielog/db";
import { CreateCustomFoodSchema } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { toCustomFoodResponse } from "@/lib/custom-foods";

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

  const rows = await db
    .select()
    .from(customFoods)
    .where(eq(customFoods.userId, appUser.id))
    .orderBy(asc(customFoods.name));

  return NextResponse.json({ customFoods: rows.map(toCustomFoodResponse) });
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

  const parsed = CreateCustomFoodSchema.safeParse(body);
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
  const now = new Date();

  const [row] = await db
    .insert(customFoods)
    .values({
      userId: appUser.id,
      name: d.name,
      brand: d.brand ?? null,
      servingLabel: d.servingLabel ?? null,
      defaultQuantity: String(d.defaultQuantity),
      defaultGrams: d.defaultGrams != null ? String(d.defaultGrams) : null,
      calories: String(d.calories),
      proteinG: String(d.proteinG),
      carbsG: String(d.carbsG),
      fatG: String(d.fatG),
      fiberG: d.fiberG != null ? String(d.fiberG) : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(toCustomFoodResponse(row), { status: 201 });
}
