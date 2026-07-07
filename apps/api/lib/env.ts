/**
 * Server-only environment validation.
 * Never import this file from apps/mobile or any Next.js Client Component.
 */

export type ApiEnv = "development" | "staging" | "production";

export const VALID_FOOD_DATA_PROVIDERS = ["disabled", "open_food_facts"] as const;
export type FoodDataProvider = (typeof VALID_FOOD_DATA_PROVIDERS)[number];

export const serverEnv = {
  /**
   * Neon pooled connection URL — used by the API at runtime.
   * Returns undefined when the variable is absent so callers can degrade
   * gracefully rather than crashing the process.
   */
  get databaseUrl(): string | undefined {
    return process.env.DATABASE_URL || undefined;
  },

  /**
   * Runtime environment label. Defaults to "development" when absent.
   */
  get apiEnv(): ApiEnv {
    const raw = process.env.API_ENV;
    if (raw === "staging" || raw === "production") return raw;
    return "development";
  },

  /**
   * Active food-data provider. Defaults to "disabled" when absent.
   * Valid values: disabled | open_food_facts
   */
  get foodDataProvider(): FoodDataProvider {
    const raw = process.env.FOOD_DATA_PROVIDER ?? "disabled";
    if (VALID_FOOD_DATA_PROVIDERS.includes(raw as FoodDataProvider)) {
      return raw as FoodDataProvider;
    }
    return "disabled";
  },
} as const;

/**
 * Asserts CLERK_SECRET_KEY is set.
 * Clerk's SDK reads it directly from process.env, but calling this at the top
 * of protected routes gives a clear error instead of a Clerk SDK panic.
 */
export function assertClerkSecretKey(): void {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error(
      "CLERK_SECRET_KEY is not set.\n" +
        "  Local development: add CLERK_SECRET_KEY to apps/api/.env.local\n" +
        "  Production: set CLERK_SECRET_KEY in Vercel → Project → Settings → Environment Variables\n" +
        "  Value: the Secret key from Clerk dashboard → API Keys",
    );
  }
}

/**
 * Asserts DATABASE_URL is set and returns it.
 * Throws a human-readable error pointing to the correct fix.
 */
export function assertDatabaseUrl(): string {
  const url = serverEnv.databaseUrl;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set.\n" +
        "  Local development: add DATABASE_URL to apps/api/.env.local\n" +
        "  Production: set DATABASE_URL in Vercel → Project → Settings → Environment Variables\n" +
        "  Value: the pooled connection string from Neon console → Project → Connection Details",
    );
  }
  return url;
}
