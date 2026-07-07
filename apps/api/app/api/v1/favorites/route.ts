import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { createDb, favorites } from "@calorielog/db";
import { CreateFavoriteSchema } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { toFavoriteResponse } from "@/lib/favorites";

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
    .from(favorites)
    .where(eq(favorites.userId, appUser.id))
    .orderBy(asc(favorites.createdAt));

  return NextResponse.json({ favorites: rows.map(toFavoriteResponse) });
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

  const parsed = CreateFavoriteSchema.safeParse(body);
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
    .insert(favorites)
    .values({
      userId: appUser.id,
      name: d.name,
      brand: d.brand ?? null,
      servingLabel: d.servingLabel ?? null,
      quantity: String(d.quantity),
      grams: d.grams != null ? String(d.grams) : null,
      calories: String(d.calories),
      proteinG: String(d.proteinG),
      carbsG: String(d.carbsG),
      fatG: String(d.fatG),
      fiberG: d.fiberG != null ? String(d.fiberG) : null,
      source: d.source,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json(toFavoriteResponse(row), { status: 201 });
}
