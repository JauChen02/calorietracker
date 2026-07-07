import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createDb, foodEntries } from "@calorielog/db";
import { sumEntries } from "@calorielog/contracts";
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
  const date = searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return apiError(
      "INVALID_DATE",
      "Query parameter 'date' must be a valid YYYY-MM-DD date",
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

  const rows = await db
    .select()
    .from(foodEntries)
    .where(
      and(eq(foodEntries.userId, appUser.id), eq(foodEntries.localDate, date)),
    )
    .orderBy(foodEntries.loggedAt);

  const entries = rows.map(toEntryResponse);

  return NextResponse.json({
    date,
    entries,
    totals: sumEntries(entries),
  });
}
