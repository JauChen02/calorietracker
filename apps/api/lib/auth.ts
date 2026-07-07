import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { appUsers } from "@calorielog/db";
import type { AppDb, AppUser } from "@calorielog/db";

/**
 * Returns the Clerk userId from the current request context, or null when the
 * request is unauthenticated.
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/**
 * Looks up the app_users record for a given Clerk userId.
 * Returns null when no row exists (user has not called /api/v1/me yet).
 */
export async function getAppUser(
  db: AppDb,
  clerkUserId: string,
): Promise<AppUser | null> {
  const [user] = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.clerkUserId, clerkUserId));
  return user ?? null;
}
