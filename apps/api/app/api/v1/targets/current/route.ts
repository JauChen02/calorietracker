import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createDb, nutritionTargets } from "@calorielog/db";
import { UpdateNutritionTargetsSchema } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";

function toTargetsResponse(row: typeof nutritionTargets.$inferSelect) {
  return {
    userId: row.userId,
    calorieTarget: row.calorieTarget ?? null,
    proteinTargetG: row.proteinTargetG !== null ? Number(row.proteinTargetG) : null,
    carbsTargetG: row.carbsTargetG !== null ? Number(row.carbsTargetG) : null,
    fatTargetG: row.fatTargetG !== null ? Number(row.fatTargetG) : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

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

  const [targets] = await db
    .select()
    .from(nutritionTargets)
    .where(eq(nutritionTargets.userId, appUser.id));

  return NextResponse.json({ targets: targets ? toTargetsResponse(targets) : null });
}

export async function PUT(request: Request) {
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

  const parsed = UpdateNutritionTargetsSchema.safeParse(body);
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

  const [row] = await db
    .insert(nutritionTargets)
    .values({
      userId: appUser.id,
      calorieTarget: data.calorieTarget ?? null,
      proteinTargetG:
        data.proteinTargetG !== null && data.proteinTargetG !== undefined
          ? String(data.proteinTargetG)
          : null,
      carbsTargetG:
        data.carbsTargetG !== null && data.carbsTargetG !== undefined
          ? String(data.carbsTargetG)
          : null,
      fatTargetG:
        data.fatTargetG !== null && data.fatTargetG !== undefined
          ? String(data.fatTargetG)
          : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: nutritionTargets.userId,
      set: {
        calorieTarget: data.calorieTarget ?? null,
        proteinTargetG:
          data.proteinTargetG !== null && data.proteinTargetG !== undefined
            ? String(data.proteinTargetG)
            : null,
        carbsTargetG:
          data.carbsTargetG !== null && data.carbsTargetG !== undefined
            ? String(data.carbsTargetG)
            : null,
        fatTargetG:
          data.fatTargetG !== null && data.fatTargetG !== undefined
            ? String(data.fatTargetG)
            : null,
        updatedAt: now,
      },
    })
    .returning();

  return NextResponse.json({ targets: toTargetsResponse(row) });
}
