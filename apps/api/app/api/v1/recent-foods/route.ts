import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { createDb } from "@calorielog/db";
import type { RecentFood } from "@calorielog/contracts";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";

const LIMIT = 30;

type RecentFoodRow = {
  food_entry_id: string;
  food_name: string;
  brand: string | null;
  serving_label: string | null;
  quantity: string;
  grams: string | null;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  fiber_g: string | null;
  last_meal_type: string;
  last_logged_at: Date;
};

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

  // DISTINCT ON picks the most recent occurrence of each (food_name, brand) pair.
  // The outer query sorts by recency so the most recently used food appears first.
  const rows = await db.execute<RecentFoodRow>(sql`
    SELECT * FROM (
      SELECT DISTINCT ON (food_name, COALESCE(brand, ''))
        id           AS food_entry_id,
        food_name,
        brand,
        serving_label,
        quantity,
        grams,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        meal_type    AS last_meal_type,
        logged_at    AS last_logged_at
      FROM food_entries
      WHERE user_id = ${appUser.id}
      ORDER BY food_name, COALESCE(brand, ''), logged_at DESC
    ) sub
    ORDER BY last_logged_at DESC
    LIMIT ${LIMIT}
  `);

  const recentFoods: RecentFood[] = (rows.rows ?? rows as unknown as RecentFoodRow[]).map((r) => ({
    foodEntryId: r.food_entry_id,
    foodName: r.food_name,
    brand: r.brand ?? null,
    servingLabel: r.serving_label ?? null,
    quantity: Number(r.quantity),
    grams: r.grams !== null ? Number(r.grams) : null,
    calories: Number(r.calories),
    proteinG: Number(r.protein_g),
    carbsG: Number(r.carbs_g),
    fatG: Number(r.fat_g),
    fiberG: r.fiber_g !== null ? Number(r.fiber_g) : null,
    lastMealType: r.last_meal_type as RecentFood["lastMealType"],
    lastLoggedAt: r.last_logged_at instanceof Date
      ? r.last_logged_at.toISOString()
      : String(r.last_logged_at),
  }));

  return NextResponse.json({ recentFoods });
}
