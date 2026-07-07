import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createDb, favorites } from "@calorielog/db";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

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
    .delete(favorites)
    .where(and(eq(favorites.id, id), eq(favorites.userId, appUser.id)))
    .returning({ id: favorites.id });

  if (!deleted) {
    return apiError("NOT_FOUND", "Favorite not found", 404);
  }

  return new NextResponse(null, { status: 204 });
}
