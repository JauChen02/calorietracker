import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createDb, customFoods } from "@calorielog/db";
import { UpdateCustomFoodSchema } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { toCustomFoodResponse } from "@/lib/custom-foods";

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

  const parsed = UpdateCustomFoodSchema.safeParse(body);
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
  if ("brand" in d) updates.brand = d.brand ?? null;
  if ("servingLabel" in d) updates.servingLabel = d.servingLabel ?? null;
  if (d.defaultQuantity !== undefined)
    updates.defaultQuantity = String(d.defaultQuantity);
  if ("defaultGrams" in d)
    updates.defaultGrams = d.defaultGrams != null ? String(d.defaultGrams) : null;
  if (d.calories !== undefined) updates.calories = String(d.calories);
  if (d.proteinG !== undefined) updates.proteinG = String(d.proteinG);
  if (d.carbsG !== undefined) updates.carbsG = String(d.carbsG);
  if (d.fatG !== undefined) updates.fatG = String(d.fatG);
  if ("fiberG" in d) updates.fiberG = d.fiberG != null ? String(d.fiberG) : null;

  const [row] = await db
    .update(customFoods)
    .set(updates)
    .where(and(eq(customFoods.id, id), eq(customFoods.userId, appUser.id)))
    .returning();

  if (!row) {
    return apiError("NOT_FOUND", "Custom food not found", 404);
  }

  return NextResponse.json(toCustomFoodResponse(row));
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
    .delete(customFoods)
    .where(and(eq(customFoods.id, id), eq(customFoods.userId, appUser.id)))
    .returning({ id: customFoods.id });

  if (!deleted) {
    return apiError("NOT_FOUND", "Custom food not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
