import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "drizzle-kit";

// Load DATABASE_URL_UNPOOLED from the API env file.
// Next.js loads apps/api/.env.local automatically; we load it explicitly here
// so that `pnpm db:migrate` works without requiring shell-level variable exports.
// __dirname is packages/db/, so ../../apps/api/.env.local resolves correctly
// whether the command is run via `pnpm db:migrate` (repo root) or directly.
config({ path: resolve(__dirname, "../../apps/api/.env.local") });

const migrationUrl = process.env.DATABASE_URL_UNPOOLED;

if (!migrationUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED is not set.\n" +
      "  Local: add DATABASE_URL_UNPOOLED to apps/api/.env.local\n" +
      "  Get the direct (unpooled) connection string from Neon console → Project → Connection Details\n" +
      "  (uncheck 'Connection pooling' before copying the URL)",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: migrationUrl,
  },
});
