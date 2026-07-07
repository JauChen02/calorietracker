import { NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { createDb, appUsers } from "@calorielog/db";
import { assertDatabaseUrl } from "@/lib/env";
import { apiError } from "@/lib/api";
import { getClerkUserId, getAppUser } from "@/lib/auth";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;

  const db = createDb(assertDatabaseUrl());

  const [user] = await db
    .insert(appUsers)
    .values({ clerkUserId: userId, email })
    .onConflictDoUpdate({
      target: appUsers.clerkUserId,
      set: { email, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json({
    userId: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email ?? null,
    createdAt: user.createdAt.toISOString(),
  });
}

/**
 * DELETE /api/v1/me
 *
 * Permanently deletes the caller's data from Neon (cascade removes all child
 * rows) and then deletes the Clerk account.
 *
 * Order of operations: Neon first, Clerk second. If the Clerk call fails the
 * data is already gone (satisfying the user's deletion request); the Clerk
 * account will be orphaned but contains no app data.
 */
export async function DELETE() {
  const clerkUserId = await getClerkUserId();
  if (!clerkUserId) {
    return apiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const db = createDb(assertDatabaseUrl());
  const appUser = await getAppUser(db, clerkUserId);

  // Delete Neon data if the app_users row still exists.
  // ON DELETE CASCADE propagates to all child tables automatically.
  if (appUser) {
    await db.delete(appUsers).where(eq(appUsers.id, appUser.id));
  }

  // Always attempt Clerk account deletion. Swallow "user not found" errors so
  // retries after a partial success still return 204.
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkUserId);
  } catch {
    // Clerk user may already be deleted or the call may be a transient failure.
    // Data is erased from Neon regardless; continue to return success.
  }

  return new NextResponse(null, { status: 204 });
}
