import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type AppDb = NeonHttpDatabase<typeof schema>;

/**
 * Creates a Drizzle ORM client backed by the Neon HTTP driver.
 * The caller is responsible for supplying a valid DATABASE_URL.
 * This function does not throw on missing URL — validate before calling.
 */
export function createDb(databaseUrl: string): AppDb {
  return drizzle(neon(databaseUrl), { schema });
}

/**
 * Runs a minimal SELECT 1 to confirm database reachability.
 * Throws if the database is unreachable or credentials are invalid.
 */
export async function pingDb(databaseUrl: string): Promise<void> {
  const sql = neon(databaseUrl);
  await sql`SELECT 1`;
}
