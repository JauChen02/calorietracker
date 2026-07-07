import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @/ to apps/api so that API route handler tests can use the
      // same path alias that Next.js uses when compiling the app.
      "@": path.resolve(__dirname, "apps/api"),
    },
  },
  test: {
    globals: true,
    include: [
      "packages/*/src/**/*.test.ts",
      "packages/*/src/**/*.test.tsx",
      "apps/api/__tests__/**/*.test.ts",
      // Mobile lib tests — pure functions only (no React Native, no @/ alias)
      "apps/mobile/lib/**/*.test.ts",
      // Mobile feature tests — sync service with mocked deps (no React Native, no @/ alias)
      "apps/mobile/features/food/__tests__/**/*.test.ts",
    ],
  },
});
