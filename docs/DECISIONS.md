# Architecture Decisions — CalorieLog

Decisions are added here whenever a non-obvious architectural choice is made. Each entry records the date, the context, the decision, and the reason.

---

## 2026-06-26 — Monorepo with pnpm workspaces (no Turborepo)

**Context:** The project has two apps and two shared packages that need to share code and tooling.

**Decision:** Use pnpm workspaces with a flat `apps/` + `packages/` layout. No Turborepo.

**Reason:** Turborepo adds caching and build orchestration value once CI build times become a problem. At this stage, running lint, typecheck, and tests serially is fast enough. Adding Turborepo introduces a layer of configuration that should be earned by a real pain point.

---

## 2026-06-26 — Next.js App Router for the API

**Context:** The API needs to be deployed to Vercel with low operational overhead.

**Decision:** Use Next.js 15 App Router route handlers (`app/api/**/route.ts`) rather than a standalone Express or Fastify server.

**Reason:** Next.js deploys as Vercel serverless functions with zero configuration. Route handlers support streaming and middleware natively. A separate Node.js server would require a separate Vercel project and more infrastructure.

---

## 2026-06-26 — Expo Router for mobile navigation

**Context:** The mobile app needs file-based routing consistent with the web developer experience.

**Decision:** Use Expo Router 4 (file-based routing on top of React Navigation).

**Reason:** Expo Router provides typed routes, deep linking, and a familiar layout-file model. It reduces boilerplate compared to manually wiring React Navigation stacks.

---

## 2026-06-26 — Drizzle ORM over Prisma

**Context:** The project needs a TypeScript-native ORM for Neon Postgres.

**Decision:** Use Drizzle ORM with `drizzle-kit` for migrations.

**Reason:** Drizzle generates plain SQL migrations that are easy to inspect and version control. Its query builder is a thin TypeScript layer with no hidden magic. Prisma's Rust-based query engine adds bundle size and startup cost that matters for serverless cold starts on Vercel.

---

## 2026-06-26 — DATABASE_URL vs DATABASE_URL_UNPOOLED

**Context:** Neon provides two connection strings: a pooled URL (via PgBouncer) and a direct URL.

**Decision:** Runtime API uses `DATABASE_URL` (pooled). Drizzle migrations use `DATABASE_URL_UNPOOLED` (direct).

**Reason:** PgBouncer in transaction mode does not support `SET` statements and certain session-level features required by DDL migration scripts. The direct URL bypasses the pooler and avoids these constraints during schema migrations.

---

## 2026-06-26 — Expo SQLite deferred until online flow works

**Context:** Offline logging is in the launch scope.

**Decision:** Do not add Expo SQLite until the online logging flow (API → Neon) is working end-to-end.

**Reason:** Offline sync is meaningfully more complex than online-only logging. Building it on top of a broken online flow would compound debugging difficulty. The product works without offline support; offline is an enhancement.

---

## 2026-06-26 — Zod contracts in a shared package

**Context:** Both the API (validation) and the mobile app (type inference) need the same schema shapes.

**Decision:** All Zod schemas and inferred types live in `packages/contracts` and are imported by both apps.

**Reason:** A single source of truth prevents the mobile app from silently drifting out of sync with the API. If the schema changes, TypeScript will surface the mismatch at compile time in both apps.

---

## 2026-06-27 — Neon HTTP driver over WebSocket driver for API routes

**Context:** The API needs to connect to Neon Postgres from Vercel serverless functions. Neon offers two drivers: HTTP (`neon-http`) and WebSocket (`neon-serverless`).

**Decision:** Use `@neondatabase/serverless` with `drizzle-orm/neon-http` for all runtime queries.

**Reason:** Neon's HTTP driver works in every runtime (Node.js, Vercel Edge, browsers) without WebSocket setup. Cold-start overhead is lower because there is no persistent connection to establish. The WebSocket driver will be evaluated if query latency or transaction requirements become a bottleneck.

---

## 2026-06-27 — Graceful degradation in /api/health when DATABASE_URL is absent

**Context:** The health route needs to report database connectivity, but the app should also start cleanly for developers who have not yet configured Neon credentials.

**Decision:** `GET /api/health` never throws a 500 for missing credentials. It returns `{ "status": "degraded", "database": { "connected": false, "error": "DATABASE_URL is not configured" } }` instead.

**Reason:** A 500 error on the health endpoint is indistinguishable from a real crash. Returning a structured degraded response lets monitoring tools distinguish "not configured" from "configured but broken," and lets new developers run the API locally before they have Neon credentials.

---

## 2026-06-27 — Migrations never run automatically on Vercel deploy

**Context:** Vercel deploys can run arbitrary commands in the build phase. It is tempting to run `drizzle-kit migrate` there.

**Decision:** Migrations are applied manually via `pnpm db:migrate` before or after deployment, never as part of the Vercel build step.

**Reason:** Automatic migration during a deploy risks applying a partially-written migration against a live database, racing with in-flight requests, or rolling back a Vercel deploy without rolling back the schema. Manual application keeps schema changes and code deploys as two distinct, sequenced operations.

---

## 2026-06-27 — Vercel root directory set to apps/api

**Context:** The monorepo root is not a Next.js project; Vercel needs to be pointed at `apps/api`.

**Decision:** `apps/api/vercel.json` sets `installCommand` to `cd ../.. && pnpm install` so the full workspace is installed. Vercel project settings in the dashboard must set Root Directory to `apps/api`.

**Reason:** Running `pnpm install` from `apps/api` would only install that package's direct dependencies and would miss the pnpm workspace symlinks that `@calorielog/db` and `@calorielog/contracts` depend on. Going up to the monorepo root installs everything correctly.

---

## 2026-06-27 — Custom theme system over a UI component library

**Context:** The mobile app needs a consistent visual language (colors, spacing, typography) with light/dark mode support.

**Decision:** Implement a minimal theme system in `apps/mobile/theme/` (colors, spacing, typography tokens + `ThemeProvider` / `useTheme` hook) rather than adopting a third-party UI library such as NativeBase, Tamagui, or Gluestack.

**Reason:** A UI library ships abstractions that fight with custom designs and add significant bundle weight. The token set needed for a calorie tracker is small — one accent color, a handful of neutrals, four spacing values, five font sizes. Building it from scratch costs ~200 lines and gives complete control over the component surface. Adding a library can always happen later; removing one cannot.

---

## 2026-06-27 — Metro config required for pnpm monorepo workspace resolution

**Context:** Metro bundler (used by Expo) resolves modules relative to the project root by default. In a pnpm monorepo, workspace packages are symlinked under the repo root's `node_modules`, not inside `apps/mobile/node_modules`.

**Decision:** Add `apps/mobile/metro.config.js` that sets `config.watchFolders = [workspaceRoot]` and adds the workspace root's `node_modules` to `config.resolver.nodeModulesPaths`.

**Reason:** Without this config, Metro cannot find `@calorielog/contracts` or any other workspace package and throws a "module not found" error at bundle time. The two additions tell Metro where to watch for file changes and where to search for modules, replicating the behavior of a single-project setup.

---

## 2026-06-27 — Expo Router group structure: (app) and (auth)

**Context:** The app has two distinct navigation contexts — authenticated screens (tabs) and unauthenticated screens (login flow). Expo Router uses filesystem layout to define navigation hierarchies.

**Decision:** Use two route groups: `(app)` for the main tab navigator (Today, History, Settings) and `(auth)` for the future login flow. The root `index.tsx` immediately redirects to `/today` (no auth yet).

**Reason:** Route groups (parenthetical folder names) are transparent in URL paths. They let the two navigation stacks have separate layouts and header configs without polluting the URL structure. When Clerk auth is added, the redirect logic in `index.tsx` becomes the single guard that separates the two groups.

---

## 2026-06-27 — `__DEV__` guard for developer-only features

**Context:** The API health check screen is useful during development but should never appear in production builds. Several approaches exist: feature flags, separate build variants, or the React Native `__DEV__` global.

**Decision:** Use the `__DEV__` global boolean to conditionally render developer UI (e.g., the API Health Check entry in Settings). No feature flag system, no separate screen file for production.

**Reason:** `__DEV__` is set to `true` automatically by Metro in development builds and `false` in production builds. It requires no configuration, no extra dependencies, and is stripped at build time by Metro's dead-code elimination. It is the idiomatic React Native approach for this exact use case.

---

## 2026-06-27 — `import type` for contracts package in mobile

**Context:** `packages/contracts` exports Zod schemas and their inferred types. The mobile app needs the TypeScript types for type-checking API responses but should not bundle the Zod runtime library.

**Decision:** Mobile files use `import type { HealthResponse } from '@calorielog/contracts'` for type-only imports. The Zod runtime is never imported into mobile files.

**Reason:** `import type` is erased entirely by the TypeScript compiler and Metro bundler — no runtime module resolution occurs. This means Zod (a ~60 KB library) is excluded from the mobile bundle while still providing compile-time type safety. The API imports Zod normally for runtime validation; the mobile app only needs the shape.

---

## 2026-07-01 — Clerk for authentication (no custom auth)

**Context:** The app needs user identity and session management.

**Decision:** Use Clerk (`@clerk/clerk-expo` on mobile, `@clerk/nextjs` on API) rather than implementing custom JWT signing, password hashing, refresh-token storage, or account recovery.

**Reason:** Custom auth is a high-risk surface area. Clerk handles token rotation, brute-force protection, email verification, and future MFA/SSO expansion. The product differentiator is calorie tracking, not auth infrastructure. Clerk's generous free tier fits the launch phase.

---

## 2026-07-01 — expo-secure-store for Clerk token cache (not AsyncStorage)

**Context:** Clerk Expo SDK requires a `tokenCache` implementation to persist sessions across app restarts.

**Decision:** Implement `tokenCache` using `expo-secure-store`, which stores values in the Android Keystore / iOS Keychain rather than plain SQLite.

**Reason:** AsyncStorage writes to unencrypted SQLite. Auth tokens in unencrypted storage are accessible to other apps on rooted Android devices and are a common vector for token theft. The OS keychain/keystore uses hardware-backed encryption on supported devices. `expo-secure-store` is the Clerk-recommended approach for Expo.

---

## 2026-07-01 — Email + password auth with email verification (not OTP-only or social)

**Context:** Clerk supports many auth strategies. The task scopes to email-based auth only.

**Decision:** Implement email + password sign-up with email verification (6-digit code) and email + password sign-in. Social login, passkeys, and Apple/Google login are deferred.

**Reason:** Email + password is the lowest-friction implementation path and works without any OAuth app registration. Email verification prevents disposable-email abuse. Social login and passkeys will be added after the core product is stable.

---

## 2026-07-01 — /api/v1/me upserts app_users on first authenticated call

**Context:** Clerk manages identity, but the app needs its own `app_users` row for future foreign-key references (food logs, targets, etc.).

**Decision:** `GET /api/v1/me` upserts an `app_users` record keyed on `clerk_user_id` using Drizzle's `onConflictDoUpdate`. The email is refreshed on each call via Clerk's `currentUser()`.

**Reason:** The upsert pattern means the caller never needs to distinguish "create vs. update" — the endpoint is idempotent. Calling it on first sign-in guarantees a row exists before any downstream inserts. Using Clerk's `clerk_user_id` as the unique key decouples our schema from Clerk's internal UUID, which can never be changed from our side.

---

## 2026-07-01 — Clerk middleware does not auto-protect routes; handlers verify manually

**Context:** Clerk's Next.js middleware can be configured to protect routes automatically (redirecting to sign-in for unauthenticated requests). For a pure API, redirects are the wrong behavior.

**Decision:** `middleware.ts` calls `clerkMiddleware()` with no route protection logic. Each route handler that requires auth calls `auth()` directly and returns a structured `401` error response.

**Reason:** Automatic route protection redirects to a Clerk-hosted sign-in page, which is meaningless for a mobile API consumer. Returning `{ "error": { "code": "UNAUTHORIZED", ... } }` with status 401 matches the standard error envelope every route already uses and lets the mobile client handle the response programmatically.

---

## 2026-07-01 — food_entries uses client_mutation_id for idempotent creates

**Context:** Mobile apps operate on unreliable networks. A successful POST may time out before the response is received, causing the client to retry and risk duplicating an entry.

**Decision:** `food_entries` has a `(user_id, client_mutation_id)` unique constraint. `POST /api/v1/entries` uses `onConflictDoNothing()` and, if nothing was inserted (conflict), selects and returns the original entry. The response status is 201 for new entries and 200 for returned originals.

**Reason:** Idempotent creates mean the client can safely retry any POST with the same `client_mutation_id` without data duplication. The constraint is at the database level, so no race condition is possible. Using a client-generated UUID means the server never needs a lookup table or in-memory dedup cache.

---

## 2026-07-01 — numeric columns stored and queried as strings in Drizzle

**Context:** PostgreSQL `numeric(10,2)` preserves exact decimal precision. Drizzle ORM returns numeric columns as JavaScript strings to avoid floating-point precision loss. The API contract requires numeric values to be sent as numbers.

**Decision:** The database schema uses `numeric(10,2)` for all macro and calorie values. Route handlers store values by stringifying (`String(value)`). The `toEntryResponse()` helper in `apps/api/lib/food-entries.ts` parses all numeric strings with `Number()` before constructing the JSON response.

**Reason:** Keeping values as `numeric` in Postgres preserves precision and ordering semantics. Converting at the API boundary (in `toEntryResponse`) is a single, tested conversion point. Mobile clients receive standard JavaScript numbers, not strings.

---

## 2026-07-01 — Ownership enforced by WHERE clause, not a separate access check

**Context:** API endpoints for `food_entries` and `nutrition_targets` must prevent users from accessing each other's records.

**Decision:** Every query that reads or mutates a record includes `WHERE user_id = ?` alongside the record's primary key. No separate `SELECT … to check ownership` step precedes the mutating query.

**Reason:** A separate ownership-check query followed by a mutate query creates a TOCTOU race and doubles latency. Combining the ownership predicate with the primary key filter in a single query is atomic and returns an empty result set (treated as 404) when the user does not own the record.

---

## 2026-07-01 — GET /api/v1/me is required before food entry endpoints

**Context:** Food entries and targets store a `user_id` FK to `app_users`. If a user authenticates with Clerk but has not yet called `GET /api/v1/me` (which creates the `app_users` row), food entry endpoints would fail a FK constraint.

**Decision:** Food entry and targets endpoints return `404 USER_NOT_FOUND` if no `app_users` record exists for the Clerk user, rather than auto-creating one as a side effect.

**Reason:** Auto-creating the user record from a food entry endpoint couples concerns and makes the user-creation logic implicit and harder to test. The mobile app always calls `/api/v1/me` on sign-in, so the gap is only possible in edge cases (e.g., direct API calls during development). The 404 with a clear message (`"Call GET /api/v1/me to initialise your profile"`) guides the caller to the correct sequence.

---

## 2026-07-01 — PATCH increments version atomically with a SQL expression

**Context:** `food_entries.version` tracks the mutation count for a record. It must increment by exactly 1 on every PATCH, even under concurrent writes.

**Decision:** `PATCH /api/v1/entries/:id` passes `sql\`${foodEntries.version} + 1\`` directly in Drizzle's `.set()` call, letting Postgres compute the increment in the same statement that applies the other field changes.

**Reason:** Reading `version`, incrementing in JS, and writing back creates a lost-update race condition under concurrent PATCHes. A single `UPDATE … SET version = version + 1` is atomic within the database transaction.

---

## 2026-07-01 — food_entries indexes for day view and sync queries

**Context:** The primary query patterns are: fetch entries by exact local date, fetch entries ordered by logged_at (timeline), and fetch entries ordered by updated_at (sync delta).

**Decision:** Three composite indexes: `(user_id, local_date)`, `(user_id, logged_at DESC)`, `(user_id, updated_at DESC)`. The `user_id` prefix makes each index effective for per-user queries with the PG planner choosing the scan direction.

**Reason:** Each index covers one of the three common access patterns. The `user_id` leading column avoids full-index scans when every query already filters to a single user. DESC ordering on `logged_at` and `updated_at` matches the expected sort direction of timeline and sync queries, avoiding backward index scans.

---

## 2026-07-01 — TanStack Query for server state in the mobile app

**Context:** The mobile app needs to fetch, cache, and mutate food entry data with loading/error states and optimistic UI.

**Decision:** Use TanStack Query v5 (`@tanstack/react-query`) for all server-state management in the mobile app. A single `QueryClient` instance is created at module scope in `app/_layout.tsx` and provided via `QueryClientProvider`.

**Reason:** TanStack Query's `useQuery` + `useMutation` hooks provide caching, background refetch, stale-time control, and a clean `onMutate`/`onError`/`onSuccess` lifecycle for optimistic updates. Implementing the same with `useState`/`useEffect` would require significantly more boilerplate and is harder to keep consistent across multiple mutations.

---

## 2026-07-01 — React Hook Form + Zod resolver for the food entry form

**Context:** The manual entry form has 11 fields with mixed required/optional rules, numeric coercion from string TextInput values, and an enum meal-type selector.

**Decision:** Use `react-hook-form` with `@hookform/resolvers/zod` and a form-local Zod schema that uses `z.coerce.number()` and `z.preprocess` to convert string inputs to numbers. The form schema (`foodEntryFormSchema`) lives in `FoodEntryForm.tsx`, not in `packages/contracts`.

**Reason:** `react-hook-form` avoids re-rendering the whole form on every keystroke and integrates cleanly with the Zod resolver. A separate form schema (vs. the API contract schema) is needed because TextInput values are always strings but the contract expects numbers. Keeping the form schema co-located with the component avoids a contract dependency on coerce/preprocess behaviour.

---

## 2026-07-01 — Repository layer separates fetch logic from hook logic

**Context:** Screens must not contain raw fetch code per AGENTS.md rule 9. TanStack Query hooks need a clean `queryFn` / `mutationFn`.

**Decision:** `apps/mobile/lib/foodEntriesApi.ts` exports pure async functions (`fetchDay`, `createFoodEntry`, `updateFoodEntry`, `deleteFoodEntry`) that accept a Clerk token and throw on non-ok responses. The hooks in `features/food/` call these functions and own the cache key logic.

**Reason:** Keeping fetch logic in a repository file makes it independently testable and keeps hooks focused on cache management. Screens only import hooks.

---

## 2026-07-01 — Optimistic updates via TanStack Query onMutate/onError

**Context:** Create, update, and delete operations must feel instant (no network lag visible to the user) while still rolling back cleanly on failure.

**Decision:** All three mutation hooks (`useCreateEntry`, `useUpdateEntry`, `useDeleteEntry`) implement optimistic cache updates in `onMutate`, snapshot + restore in `onError`, and `invalidateQueries` in `onSuccess` to reconcile the optimistic state with the server response.

**Reason:** This is the idiomatic TanStack Query pattern for optimistic UI. `cancelQueries` prevents stale server responses from overwriting the optimistic state mid-flight. On error, the snapshot restore ensures the user sees the original data and can retry.

---

## 2026-07-01 — client_mutation_id rotated after each successful create

**Context:** The API uses `(user_id, client_mutation_id)` to deduplicate POST requests. If the same UUID is reused after a successful save, the server returns the original entry instead of creating a new one.

**Decision:** `manual-entry.tsx` generates a UUID on mount via `useRef`. On successful save the ref is rotated to a fresh UUID before navigating back. This means retries before success reuse the same UUID (safe — idempotent), while a second use of the form creates a distinct entry.

**Reason:** The idempotency contract is: same UUID = same entry. Rotating after success ensures a second tap of "Add Food → Manual Entry" doesn't silently return the previous entry.

---

## 2026-07-01 — Nutrition utility lives in packages/contracts, not apps/api

**Context:** Computing macro totals (`sumEntries`) is pure arithmetic with no side effects. Both the API (for `/api/v1/day` totals) and the mobile app (for offline or in-memory aggregation) need it.

**Decision:** `packages/contracts/src/nutrition.ts` exports `sumEntries` and `macroPercent`. The API and mobile both import from `@calorielog/contracts`.

**Reason:** Keeping pure computation in the contracts package avoids duplicating the function. The mobile can tree-shake the Zod runtime by using `import type` for schema types, while still importing the pure JS utility functions normally.

---

## 2026-07-01 — dailyProgress as the single shared dashboard calculation utility

**Context:** The Today dashboard needs to compute calorie totals, calorie remaining, and macro fractions from a list of entries and optional targets. Both the mobile dashboard and any future API endpoint for daily summary need the same logic.

**Decision:** `packages/contracts/src/nutrition.ts` exports `dailyProgress(entries, targets)` which returns a `DailyProgress` object. The Today screen imports this from `@calorielog/contracts` and calls it inside `useMemo`. No screen or hook performs inline arithmetic.

**Reason:** A single utility function is the only way to guarantee the dashboard and any future widget, notification, or widget extension see identical numbers. Duplicating the logic — even trivially — creates a class of bugs where two places produce different totals from the same data.

---

## 2026-07-01 — targets === null means no goals configured (distinct from zero)

**Context:** Users may have targets set to a non-zero value, may have cleared all targets (so no row exists), or may have never opened the goals screen. These are semantically different states.

**Decision:** `useTargets()` returns `NutritionTargets | null` — null meaning the user has no targets row in the database. `dailyProgress` accepts `TargetInputs | null` and returns all-null progress fields when passed null. The Today screen shows a non-blocking goals banner when targets are null, not an error.

**Reason:** Treating null as "not configured" (rather than "zero for everything") preserves the ability to distinguish no-target from a user who explicitly set every macro to 0. The banner is non-blocking: a user without goals can still log food and see their totals — they just won't see a progress bar.

---

## 2026-07-01 — Over-target behavior: no red states, values not clamped

**Context:** A user who eats more than their calorie target has `caloriesRemaining < 0` and macro fractions > 1.0. Many diet apps show red error states or "over by X" language in this scenario.

**Decision:** `caloriesRemaining` is returned as-is (can be negative). Macro fractions are returned as-is (can exceed 1.0). `ProgressBar` already clamps its visual fill at 100%. No color changes occur when any target is exceeded — bars stay in their assigned macro color.

**Reason:** The product rules explicitly prohibit "red failure states for going over target" and shame language. A full bar with no color change communicates "you've hit your goal" without judgment. A user who eats 2 100-calorie snacks over their target shouldn't see a red screen.

---

## 2026-07-01 — Goals form pre-populated from useTargets cache, rendered after load

**Context:** The goals form needs to show existing targets as default values so users can edit rather than re-enter everything.

**Decision:** The `GoalsScreen` renders `LoadingState` while `useTargets()` is loading, then passes the loaded `NutritionTargets | null` into a child `GoalsForm` component as a prop. `GoalsForm` sets `defaultValues` from the prop — no `useEffect` reset needed.

**Reason:** Rendering the form before targets load would show empty fields that then fill in, causing a jarring visual flash and potential form reset while the user is typing. Waiting for the load is instant in practice (targets have a 5-minute stale time and are usually cached). The split into two components (outer state machine, inner form) is cleaner than `useEffect(reset)` inside a single component.

---

## 2026-07-01 — History uses ISO week (Mon–Sun) strip for date navigation

**Context:** The History tab needs date navigation so users can review previous days. Options include: infinite scroll, calendar picker, or a week strip with prev/next navigation.

**Decision:** A horizontal 7-day strip showing Mon–Sun of the ISO week containing the selected date. Prev/Next week arrows shift the selected date by ±7 days. Future dates are shown grayed out and non-tappable. The strip defaults to showing yesterday on first open.

**Reason:** A week strip is a familiar pattern for fitness and diet apps. It shows at a glance which days of the week have been viewed, and the Mon–Sun frame matches most users's mental model of a week. Infinite scroll (like a date picker) is harder to implement correctly with timezone edge cases.

---

## 2026-07-01 — Copying an entry always targets today (never a custom date)

**Context:** The History screen allows copying a previous meal entry to today's log. The spec requires: new client_mutation_id, current loggedAt, current localDate, current timezone.

**Decision:** `useCopyEntry` always targets the current date. `buildCopyPayload` accepts `now: Date` and `timezone: string` as injected parameters (instead of calling `new Date()` internally) so the function is pure and unit-testable.

**Reason:** Allowing copy to an arbitrary past date would add UI complexity and is not in scope. Accepting `now` as a parameter follows dependency-injection principles for testability without requiring mocks.

---

## 2026-07-01 — History edit uses a separate route file but shared hooks/form

**Context:** Editing a historical entry requires a screen in the history stack (so router.back() returns to the History tab, not Today). The edit logic is identical to Today's edit.

**Decision:** `/history/[id]/edit.tsx` is a separate route file with the same structure as `/today/[id]/edit.tsx`. Both use `useDayEntries(date)`, `useUpdateEntry(date)`, and `FoodEntryForm`. The date param scopes each to their respective cache key.

**Reason:** Expo Router's file-based routing requires separate files for separate route paths. Extracting the shared logic into a third component would introduce a new abstraction for a 60-line file. The shared logic already lives in the hooks (`useUpdateEntry`) and the form component (`FoodEntryForm`); the route file is just glue.

---

## 2026-07-01 — Copy button hidden when viewing today in history

**Context:** If the user navigates to today's date in the History screen, offering "Copy to Today" would create a duplicate entry.

**Decision:** The `onCopy` prop is only passed to `MealSection` (and thus `EntryCard`) when `selectedDate < today`. On today's date, the copy button is absent.

**Reason:** Copying today's entry to today would be confusing and create a duplicate. The guard is a single comparison at the screen level with no additional complexity.

---

## 2026-07-01 — Mobile lib pure-function tests added to vitest config

**Context:** Tests for `buildCopyPayload` (a pure function in `apps/mobile/lib/copyEntry.ts`) need a test runner. The existing vitest config only covered `packages/` and `apps/api/`.

**Decision:** Added `"apps/mobile/lib/**/*.test.ts"` to the vitest `include` list. Tests in this path must import only relative files or workspace packages — no `@/` path aliases and no React Native APIs.

**Reason:** Pure utility functions in `apps/mobile/lib/` have no React Native runtime dependencies, so they run cleanly in Node.js under vitest. Keeping them separate from React/RN component tests avoids the need for a React Native test environment just to test arithmetic and UUID generation.

---

## 2026-07-01 — Offline create-only flow: SQLite outbox + cache

**Context:** Mobile devices may lose connectivity mid-logging session. Losing entries during a network outage is unacceptable UX.

**Decision:** Expo SQLite (`expo-sqlite ~15.0.0`) stores two tables: `cached_entries` (server-synced day view cache) and `outbox` (pending creates). `useCreateEntry` checks network state before calling the API; when offline it writes to the outbox and returns an optimistic entry. `useDayEntries` writes successful fetches to the cache and falls back to the cache when offline. A sync service (`syncService.ts`) flushes the outbox on reconnect; 409 Conflict is treated as success (idempotency via `client_mutation_id`). Only create is supported offline; updates and deletes require connectivity.

**Reason:** Create is the highest-frequency operation and the one most likely to race with connectivity loss. Update and delete are lower-frequency and require a pre-existing server record. The outbox pattern is standard for mobile offline-first architectures; implementing it just for create keeps scope small while delivering meaningful resilience.

---

## 2026-07-01 — SQLite DB is self-initializing on first call (no explicit init step)

**Context:** `localDb.ts` is called from multiple entry points: `useSyncService` (Today screen mount) and `useCreateEntry` (any screen that creates an entry). An explicit `initLocalDb()` call from a single mount point would fail if `useCreateEntry` is called before that mount.

**Decision:** The `db()` function in `localDb.ts` lazily opens the SQLite database and runs `CREATE TABLE IF NOT EXISTS` the first time any export is called. `initLocalDb()` exists as a no-op for documentation purposes only.

**Reason:** Any localDb function can be called first; the lazy initializer ensures tables always exist. An explicit init requirement would create a hidden ordering dependency between hooks/components that is easy to violate and hard to debug.

---

## 2026-07-01 — syncService.ts uses relative imports (not @/ alias)

**Context:** `syncService.ts` contains pure async business logic that should be testable under vitest without Expo's Metro bundler. The vitest config maps `@/` to `apps/api`, not `apps/mobile`.

**Decision:** `syncService.ts` uses relative imports (`../../lib/api`, `../../db/localDb`) instead of `@/` aliases. Test mocks use the same relative paths. All other mobile feature files continue to use `@/` aliases normally.

**Reason:** vitest cannot resolve `@/lib/api` to `apps/mobile/lib/api` because the tsconfig path alias is not in scope in the vitest environment. Relative imports are always unambiguous and don't require alias resolution. This is acceptable because `syncService.ts` is an internal module (not a screen) and its import paths are stable.

---

## 2026-07-01 — custom_foods is an independent table, not derived from food_entries

**Context:** Users want to save food definitions for re-use (e.g., "protein shake: 120 kcal, 25g protein"). These definitions can then be quick-added to create new food_entries snapshots.

**Decision:** `custom_foods` is a standalone table with its own schema (name, brand, serving_label, default_quantity, default_grams, macros). `food_entries` is always a snapshot — quick-adding a custom food creates a new `food_entries` row with the nutrition values at that moment. Editing a custom food never touches historical `food_entries` rows.

**Reason:** If custom_foods were a FK in food_entries, editing a custom food definition would retroactively change historical log data. A snapshot model means historical data is immutable. This also simplifies deletion: removing a custom food leaves all historical entries intact.

---

## 2026-07-01 — recent_foods derived from food_entries via DISTINCT ON (no table)

**Context:** Users need quick re-logging shortcuts for foods they've logged recently. This requires a distinct set of recent foods without showing duplicate entries for the same food.

**Decision:** `GET /api/v1/recent-foods` uses a PostgreSQL `DISTINCT ON (food_name, COALESCE(brand, ''))` subquery to pick the most recent occurrence of each food name+brand combination, sorted by `logged_at DESC`. The outer query orders by `last_logged_at DESC LIMIT 30`. No separate `recent_foods` table exists.

**Reason:** A separate table would require a trigger or application-level update on every food entry insert/delete, adding write complexity and a consistency surface. DISTINCT ON in Postgres is efficient over a small per-user range scan on the `(user_id, logged_at DESC)` index. The 30-item limit bounds the cost.

---

## 2026-07-01 — Save to My Foods toggle defaults off (one-off entries must not clutter custom foods)

**Context:** The manual entry form can optionally also create a custom_foods record. The user logging a one-time airport sandwich should not see that food in their permanent My Foods list.

**Decision:** The "Save to My Foods" Switch on the manual entry form defaults to `false`. The custom food record is only created after a successful food_entry creation if the toggle is on. A failure to create the custom food record is non-fatal — the food entry is already saved and logged.

**Reason:** My Foods is a curated list of foods the user repeats. Defaulting to off ensures it stays curated without requiring the user to remember to uncheck a box. Making the custom food creation non-fatal prevents a secondary failure from blocking the primary logging action.

---

## 2026-07-01 — Quick-add scales nutrition proportionally to entered quantity

**Context:** Custom foods and recent foods store nutrition values for a "default quantity." The quick-add modal allows the user to enter a different quantity for today's log.

**Decision:** Quick-add scales all macros proportionally: `scaled = Math.round(base * newQty / defaultQty * 10) / 10`. The scaled values are displayed in a live nutrition preview before the user confirms. The nutrition preview updates on every quantity change.

**Reason:** Proportional scaling is the universally expected behavior for nutrition data. Rounding to one decimal place (`* 10 / 10`) avoids floating-point noise in the display without materially affecting accuracy for typical serving sizes.

---

## 2026-07-02 — Provider-neutral FoodProvider interface in apps/api/lib/food-providers/

**Context:** Food search and barcode lookup require calling external data sources. Hardcoding Open Food Facts into route handlers would make provider migration expensive.

**Decision:** All food-data access goes through a `FoodProvider` interface (`types.ts`) with three methods: `searchFoods`, `lookupBarcode`, `getFoodById`. Adapters (`open-food-facts.ts`, `disabled.ts`) implement this interface. The registry (`registry.ts`) maps provider names to instances and exposes `getConfiguredProvider()` (reads `FOOD_DATA_PROVIDER` env var) and `getProviderByName(name)` (for explicit lookup by name). Route handlers only import from the registry; they never import from adapter files directly.

**Reason:** Adding a second provider (e.g. USDA, Nutritionix) requires writing one new adapter file and registering it — zero changes to route handlers, tests, or contracts. The interface contract makes that promise enforced by TypeScript.

---

## 2026-07-02 — DisabledFoodProvider is the default when FOOD_DATA_PROVIDER is absent

**Context:** The app must function fully without food search configured. Manual entry, custom foods, and recent foods are independent of the food-data provider.

**Decision:** When `FOOD_DATA_PROVIDER` is absent or unrecognised, `getConfiguredProvider()` returns `DisabledFoodProvider`, which throws `FoodProviderError("PROVIDER_UNAVAILABLE", ..., 503)` on every method. Route handlers surface this as a 503 with code `PROVIDER_UNAVAILABLE`. Other endpoints are unaffected.

**Reason:** Safe-by-default: a missing env var does not cause unexpected 500 errors or misleading 404s. The 503 + clear message tells operators exactly what to configure. Manual entry continues to work regardless of provider state.

---

## 2026-07-02 — Food search routes do not require a database call (no appUser check)

**Context:** All existing API routes verify Clerk auth AND query app_users from the database. Food search routes proxy a public API and never read or write user-owned rows.

**Decision:** Food search (`/food-search`, `/food-lookup`, `/barcode`) verify Clerk auth (getClerkUserId) but do NOT call `createDb` or `getAppUser`. A valid Clerk session is sufficient.

**Reason:** Adding an unnecessary DB roundtrip would increase latency and create a failure mode (DB unavailable → food search broken) that doesn't reflect reality. Because no user-owned data is touched, the ownership model is irrelevant. Future per-user rate-limiting can be added without adding a DB call.

---

## 2026-07-02 — FoodSearchResult normalises all nutrition to per-100g as servingOptions[0]

**Context:** Open Food Facts reports nutrition per 100 g. Providers may also supply per-serving data. The mobile app needs to display nutrition for the selected serving size.

**Decision:** Every `FoodSearchResult` includes `servingOptions: FoodServingOption[]` (always at least one element) where index 0 is always "Per 100 g." When the provider supplies serving weight in grams, a second option is added with the scaled nutrition. The top-level `calories`, `proteinG`, etc. on the result always mirror `servingOptions[0]` (per 100 g).

**Reason:** Guaranteeing at least one option simplifies client code (no null check). Per-100g as the canonical baseline is standard for nutrition labelling. Serving options allow the quick-add UI to let users pick a serving without further API calls.

---

## 2026-07-02 — Open Food Facts: community data, ODbL licence, no caching in v1

**Context:** Open Food Facts is community-contributed and licensed under ODbL (Open Database Licence), which permits redistribution and caching.

**Decision:** Results carry `verificationStatus: "community"` and `sourceLabel: "Open Food Facts"` to be transparent that data is not clinically verified. No response-level caching is implemented in v1 (can be added later). User queries and barcodes are never logged. The User-Agent header is set as required by OFF API terms.

**Reason:** Transparency about data provenance is a product principle. Caching is permitted by ODbL but omitted in v1 for simplicity; the 10-second fetch timeout bounds worst-case request latency. No logging of queries/barcodes prevents inadvertent tracking of user food preferences or purchasing behaviour.

---

## 2026-07-02 — food-lookup/:provider/:providerFoodId uses the named provider, not the configured one

**Context:** A user might search foods (via `FOOD_DATA_PROVIDER=open_food_facts`) and save a `{ provider, providerFoodId }` pair. Later they want to re-fetch the full details. The configured provider may have changed since.

**Decision:** `GET /api/v1/food-lookup/:provider/:providerFoodId` looks up the provider by the name in the URL path via `getProviderByName(name)`, bypassing `FOOD_DATA_PROVIDER`. "disabled" is excluded from valid targets via `KNOWN_PROVIDER_NAMES`.

**Reason:** Stored references to a specific provider should remain fetchable regardless of which provider is currently the global default. Blocking "disabled" prevents callers from triggering a `PROVIDER_UNAVAILABLE` error via an explicit name that looks like a legitimate provider.

---

## 2026-07-02 — FOOD_DATA_PROVIDER=disabled is the default in .env.example

**Context:** New developers cloning the repo should not accidentally send requests to Open Food Facts before they've read the provider terms.

**Decision:** `.env.example` sets `FOOD_DATA_PROVIDER=disabled` (not commented out). To enable OFF, the developer explicitly changes this value.

**Reason:** Opt-in is safer than opt-out for external API usage. The comment in the file explains the terms and link to OFF's ToS. The 503 response on first run gives a clear, actionable error that points to the env var.

---

## 2026-07-02 — Mobile food search shows local sources (recent + my foods) instantly; catalog is optional

**Context:** The food search screen has three content sources: Recent Foods, My Foods (both already in TanStack Query cache from the Today screen), and catalog results from the API.

**Decision:** Local sources are filtered client-side immediately on every keystroke. Catalog results use a 400 ms debounce before querying the API. If the catalog provider is unavailable (503 PROVIDER_UNAVAILABLE), a soft banner is shown but Recent and My Foods remain fully usable. Manual entry is always reachable from the search screen.

**Reason:** Local filter is instantaneous and needs no debounce. Debouncing catalog avoids hammering the API on every character. Treating PROVIDER_UNAVAILABLE as a soft failure—not an error screen—ensures the screen degrades gracefully when the API is in disabled mode. The "Enter manually" CTA is surfaced in both zero-result and has-results states so the user is never trapped.

---

## 2026-07-02 — Catalog food data is snapshotted into food_entries at save time (source: 'catalog')

**Context:** Catalog results come from a third-party provider (e.g., Open Food Facts). Nutrition data may change over time. The food_entries table stores historical calorie logs.

**Decision:** When a user adds a catalog food, all nutrition fields are copied from the FoodSearchResult into the food_entry row at the moment of save. The `source` column is set to `'catalog'`. No reference to the provider or providerFoodId is stored in the entry.

**Reason:** Snapshotting ensures the historical record reflects what was true when the food was logged. If the provider updates or removes a food later, past entries are unaffected. Omitting the providerFoodId from the entry avoids creating long-lived linkage to provider data that may be mutated or deleted, and avoids inadvertent tracking of a user's food sourcing behaviour.

---

## 2026-07-02 — FoodReview screen pre-populates cache before navigation; useCatalogFood falls back to API fetch

**Context:** The search-foods screen already has the full FoodSearchResult in memory. Navigating to food-review and re-fetching the same data would be wasteful.

**Decision:** Before pushing the food-review route, search-foods calls `queryClient.setQueryData(catalogFoodQueryKey(provider, providerFoodId), result)`. The `useCatalogFood` hook uses `staleTime: Infinity` and `retry: false`. In the common path the hook resolves from cache synchronously. If the user somehow reaches food-review directly (e.g. deep link), the hook falls back to a live API fetch.

**Reason:** Avoids a duplicate network request for data the search screen already holds. `staleTime: Infinity` is safe because catalog food nutrition doesn't change between the search and the review (seconds). Keeping the fallback fetch means the screen is self-sufficient and doesn't crash on deep link.

---

## 2026-07-02 — Barcode scanning uses expo-camera CameraView (expo-barcode-scanner deprecated)

**Context:** Expo SDK 50 deprecated `expo-barcode-scanner`. Expo SDK 51 introduced `CameraView` as the stable replacement in `expo-camera` v15+. SDK 52 ships `expo-camera` v16.

**Decision:** Use `CameraView` and `useCameraPermissions` from `expo-camera` (~16.0.18 for SDK 52). No `expo-barcode-scanner` dependency is added. Barcode scanning is configured via `CameraView`'s `onBarcodeScanned` callback and `barcodeScannerSettings.barcodeTypes`.

**Reason:** `expo-barcode-scanner` is deprecated and will be removed. Using the current supported API avoids a forced migration later and keeps the dependency count low.

---

## 2026-07-02 — Barcode scanner screen uses conditional CameraView unmount (not `active` prop)

**Context:** Multiple camera previews must not be active simultaneously. The scanner screen should release the camera when the user navigates away.

**Decision:** The `CameraView` is rendered conditionally inside a `useFocusEffect` callback: mounted when the screen gains focus, unmounted when it loses focus. The `isFocused` boolean state gate causes a full component unmount.

**Reason:** Unmounting the CameraView is the most reliable way to guarantee hardware release across Android and iOS. An `active={false}` prop pause leaves the camera handle open in some device/OS combinations. The conditional-render pattern also avoids the need to track an `active` prop and is compatible with React Native's new architecture (`newArchEnabled: true`).

---

## 2026-07-02 — Barcode scan-once lock uses a ref (not state)

**Context:** `onBarcodeScanned` fires many times per second for the same barcode while it remains in frame. A state variable set from a callback could race between renders and allow multiple state updates.

**Decision:** A `hasScannedRef = useRef(false)` guards the callback. The ref is read and written synchronously within the callback, ensuring exactly one state update per scan session regardless of how many callbacks fire. `useRef` (not `useState`) is used because the lock value does not need to trigger a re-render by itself.

**Reason:** React state updates are asynchronous — checking `scanResult !== null` inside `onBarcodeScanned` does not reliably prevent double-firing because the state update may not have flushed yet. A mutable ref is synchronous and is the correct primitive for deduplicating rapid callbacks.

---

## 2026-07-02 — CameraErrorBoundary catches camera hardware failures

**Context:** `CameraView` does not expose an `onError` prop in expo-camera v16. Camera hardware failures (device in use, no rear camera, driver crash) surface as JavaScript errors thrown during render or native module exceptions.

**Decision:** A class-based `CameraErrorBoundary` wraps `CameraView`. `componentDidCatch` calls `onError()` on the parent, which sets `cameraHardwareError: true` and renders the "Camera unavailable" fallback screen.

**Reason:** An error boundary is the only standard React mechanism that catches errors thrown inside a child component's render or lifecycle. Without it, camera hardware failures would crash the screen or show a blank view. Using class component is required because React does not yet support functional error boundaries.

---

## 2026-07-02 — Barcode lookup uses a dedicated useBarcodeFood hook with 5-minute stale time

**Context:** After a scan is locked, the barcode scanner needs to call `GET /api/v1/barcode/:barcode` and surface loading, found, not-found, provider-unavailable, and hard-error states.

**Decision:** A `useBarcodeFood(barcode: string | null)` hook wraps `useQuery` with `enabled: barcode !== null`, `staleTime: 5 * 60_000`, and `retry: false`. The hook classifies the error into three buckets (`notFound`, `providerUnavailable`, `hardError`) so the screen can render the appropriate fallback without error-code switch statements at the view layer.

**Reason:** A 5-minute stale time avoids redundant API calls if the user scans the same product twice in quick succession (e.g., after a network error retry). `retry: false` is intentional: barcode lookup errors (NOT_FOUND, PROVIDER_UNAVAILABLE) are not transient and automatic retries would delay showing the fallback screens. The `enabled` gate means the hook is safe to call unconditionally at the component top level even when no scan has occurred.

---

## 2026-07-02 — Non-numeric barcodes are filtered client-side; QR excluded from scanner types

**Context:** The server barcode endpoint validates `/^\d{4,14}$/`. Non-food barcodes (QR codes, Code-39 with letters) that pass through the camera would return validation errors.

**Decision:** QR is removed from `FOOD_BARCODE_TYPES`. A `NUMERIC_BARCODE_RE = /^\d{4,14}$/` constant on the client mirrors the server regex. When a scan result fails the regex, `barcodeForLookup` is `null` (disabling the hook) and the screen shows the not-found fallback immediately without an API call.

**Reason:** QR codes on grocery shelves are rarely food nutrition barcodes. Removing QR prevents the scanner from locking on incidental QR codes in the environment. The client-side numeric check eliminates a round-trip for alphanumeric Code-39/Code-128 values that would always fail server validation.

---

## 2026-07-02 — hasNavigatedRef prevents double-navigation on food found

**Context:** `useEffect` fires after every render in which its dependencies change. If `food` is already in cache (second scan of same product within stale window), the effect fires on the first render that has `food !== null`.

**Decision:** A `hasNavigatedRef = useRef(false)` guards the navigation `useEffect`. The ref is reset to `false` in `useFocusEffect` when the scanner regains focus (same pattern as `hasScannedRef`).

**Reason:** `router.replace` is not idempotent — calling it twice in rapid succession would push two history entries or cause a navigation race. A ref (not state) is used because the guard value does not need to trigger a re-render.

---

## 2026-07-02 — Barcode flow uses router.replace to food-review; source=barcode triggers navigate('/today') on save

**Context:** The barcode scanner is reached via `router.replace('/today/barcode-scanner')` from add-food (so the scanner occupies the modal slot). After a product is found, the user should proceed to food-review and then return directly to Today after saving.

**Decision:** The scanner uses `router.replace('/today/food-review?...&source=barcode')` to swap itself for food-review in the navigation stack. `food-review.tsx` reads the `source` param: when `source === 'barcode'`, saving a food entry calls `router.navigate('/today')` instead of `router.back()`.

**Reason:** Using `replace` (not `push`) ensures the scanner is not in the back stack when food-review is open — tapping back from food-review returns to Today, not to the scanner mid-lookup state. The `source` param propagates the entry source to the `food_entries.source` column (`'barcode'`) and controls post-save navigation, keeping the two concerns (data provenance, UX routing) in one parameter rather than two.

---

## 2026-07-02 — Barcode not-found and error states both offer manual entry; user is never dead-ended

**Context:** A scanned barcode may not be in the food database, the provider may be unavailable, or the network may fail. The product requirement is that barcode scanning must never leave the user with no next step.

**Decision:** All three error states (not-found, provider-unavailable, hard-error) display an "Enter manually" button that calls `router.replace('/today/manual-entry')` and a "Scan another barcode" button that resets the scan lock. The barcode value is displayed on-screen so the user can reference it while typing.

**Reason:** Dead-ending on a scan failure breaks the logging flow. `router.replace` for manual-entry swaps the scanner for the manual-entry modal cleanly, so the back stack is: Today → manual-entry (not Today → scanner → manual-entry). Showing the barcode value lets the user search for the product themselves if the database doesn't have it.

---

## 2026-07-03 — Favorites and saved meals store nutrition snapshots; adding them creates new food_entries

**Context:** Users need a way to quickly re-log foods and groups of foods they eat repeatedly without re-searching or re-entering nutrition data. The data must not couple historical entries to a changing source record.

**Decision:** Both `favorites` and `saved_meal_items` store full nutrition snapshots (name, brand, serving label, quantity, macros) at save time. Logging a favorite or saved meal always inserts new `food_entries` rows by copying the snapshot — no external food-provider APIs are queried.

**Reason:** Snapshot isolation is the only design that keeps historical entries accurate after the user edits a custom food or a provider updates a barcode product. Querying external APIs at log time would reintroduce the coupling that the snapshot pattern is designed to prevent, and would fail offline.

---

## 2026-07-03 — favorite source value on food_entries; favorites.source stores original provenance

**Context:** When a user logs a food from their favorites list, the resulting `food_entry` needs a `source` value. The `favorites` table also records where the original food came from (e.g., `'barcode'`, `'catalog'`, `'manual'`).

**Decision:** `food_entries.source = 'favorite'` when logged from the favorites list. `favorites.source` records the original provenance (passed from the client at creation time). `'favorite'` is added to `FoodSourceSchema` and the `food_entries_source_check` constraint.

**Reason:** Distinguishing `source = 'favorite'` in food_entries lets analytics and sync differentiate favorites-logged entries from directly-logged entries. Storing original provenance in `favorites.source` preserves lineage without requiring a foreign key to the original source table, which would vary by type.

---

## 2026-07-03 — Saved meal log route validates clientMutationIds count against item count

**Context:** `POST /api/v1/saved-meals/:id/log` accepts a `clientMutationIds` array (one UUID per meal item) to enable idempotent re-log. The client generates all UUIDs before the request.

**Decision:** The route validates `clientMutationIds.length === items.length` and returns 400 if they differ. Each item is inserted with `onConflictDoNothing` on `(userId, clientMutationId)`, then the existing entry is fetched on conflict to return a complete response.

**Reason:** Requiring the client to supply mutation IDs keeps the idempotency contract consistent with the single-entry POST route. Validating count up-front prevents partial inserts that would be confusing to retry. Fetching on conflict (same as single-entry route) ensures the response always contains the canonical entry regardless of whether the insert was new or duplicated.

---

## 2026-07-03 — Heart button in food-review matches favorites by name + brand + servingLabel

**Context:** The food-review screen shows a catalog or barcode food. The user should be able to favorite/unfavorite it from the header without navigating away.

**Decision:** The header heart button checks `useFavorites()` data for a match on `name + brand + servingLabel` (the currently-selected serving option label). If matched, tapping removes that favorite; if not matched, tapping creates a new favorite snapshot at quantity=1 for the selected serving.

**Reason:** There is no stable foreign key from a catalog food result to a favorites row (catalog foods are transient API results with provider-side IDs, not stored locally). Matching by name+brand+servingLabel is the only deterministic way to detect "already favorited". Saving at quantity=1 gives the user a sensible default that they can adjust when re-logging from favorites.

---

## 2026-07-03 — Saved meals list screen uses Alert.prompt for rename

**Context:** The saved-meals list screen needs inline rename support without navigating to a new screen.

**Decision:** Long-pressing a meal shows an `Alert` with Rename/Delete/Cancel options. Rename uses `Alert.prompt` (iOS only). No custom modal is built.

**Reason:** `Alert.prompt` is sufficient for a single text field on iOS (the primary development target). Building a custom rename modal would add significant complexity for a secondary feature. If Android support becomes critical, a custom modal can be introduced then.

---

## 2026-07-03 — Offline updates include baseVersion for optimistic concurrency

**Context:** Food-entry edits queued offline need a mechanism to detect if another client changed the same entry before the offline edit reaches the server.

**Decision:** When `useUpdateEntry` queues an update offline, it stores the entry's current `version` in the outbox `base_version` column. The sync service includes `baseVersion` in the PATCH body. The API adds `AND version = baseVersion` to the WHERE clause. If nothing is updated and the entry exists, the API returns `409 VERSION_CONFLICT` with the current server entry.

**Reason:** A version guard prevents a stale offline edit from silently overwriting a more recent server change made from another device. The guard is opt-in (no `baseVersion` in body = unconditional update), which allows force-apply after a user-visible conflict.

---

## 2026-07-03 — VERSION_CONFLICT marks outbox item as 'conflict', not 'failed'

**Context:** A PATCH that returns VERSION_CONFLICT is not a transient error — retrying with the same payload will fail again until the user takes deliberate action.

**Decision:** The `conflict` status is a third outbox state alongside `pending` and `failed`. A conflict item is surfaced in `SyncIndicator` with two explicit actions: **Discard** (remove from outbox, keep server version) and **Apply anyway** (retry without `baseVersion`, unconditionally overwriting the server).

**Reason:** Silently treating VERSION_CONFLICT as a failure-to-retry (like a network error) would mean the user's edit is stuck in a retry loop that never succeeds. The user must explicitly choose between their edit and the server's version. "Apply anyway" corresponds to a force-write; "Discard" is a client-side rollback.

---

## 2026-07-03 — Delete-wins over pending updates for the same entry

**Context:** A user may edit an entry offline, then delete it offline before syncing. Both operations are in the outbox.

**Decision:** Before processing outbox items, `syncPending` pre-computes the set of entry IDs that have a pending delete. Any pending update for an entry in that set is removed from the outbox without being sent. The delete is then sent normally.

**Reason:** The user's final intention is to delete the entry. Sending the update first and then deleting would be semantically correct but wasteful (an extra round-trip). Removing the superseded update locally is safe: the delete achieves the same end state.

---

## 2026-07-03 — Create+delete pair is cancelled locally with no server round-trips

**Context:** An entry created offline and then deleted offline before syncing has never reached the server.

**Decision:** When `syncPending` encounters a pending create whose ID also appears as a pending-delete `entry_id`, both operations are removed from the outbox. No API calls are made.

**Reason:** The entry does not exist on the server, so neither a POST nor a DELETE is meaningful. Cancelling both locally produces the correct end state (entry never persisted) with zero network cost.

---

## 2026-07-03 — SQLite outbox schema extended via ALTER TABLE with try-catch

**Context:** The outbox table was created in session 5 with a fixed schema. Session 7 adds op_type, entry_id, base_version, food_name, and conflict_data columns.

**Decision:** The `db()` initialiser attempts `ALTER TABLE outbox ADD COLUMN …` for each new column inside individual try-catch blocks. Failure (column already exists) is silently swallowed.

**Reason:** SQLite does not support `ADD COLUMN IF NOT EXISTS`. A try-catch per column is the standard workaround for additive SQLite migrations inside an app bundle. The alternative (recreating the table) would drop existing pending outbox items, which is unacceptable. A version-tracking approach (`PRAGMA user_version`) adds complexity that is not justified given the small number of columns being added.

---

## 2026-07-04 — Insights computed on device from the existing entries range endpoint

**Context:** The Insights tab needs 7-day calorie, protein, carb, and fat averages; a logged-day count; a calorie range; and a per-day trend for the last seven days.

**Decision:** `GET /api/v1/entries?from=&to=` (already used by the History tab) returns all entries in the window. The mobile client passes those entries to `computeWeeklyInsights()` in `apps/mobile/lib/insightsUtils.ts`, which groups by `localDate`, sums per-day macros, and derives all aggregate values.

**Reason:** No new API endpoint is required because the entries list contains everything needed. Keeping the calculation on the device in pure, synchronous functions makes the logic trivially testable with vitest (no network, no React Native). The alternative — a server-side `/api/v1/insights` endpoint — would add API surface for aggregations that are cheap to compute on a 7-row dataset.

---

## 2026-07-04 — Empty state threshold is 3 days, not 7

**Context:** With fewer than 3 days of data the computed averages and range are not meaningful to display.

**Decision:** If `loggedDays < 3`, the Insights screen shows an empty state ("Log on at least 3 days to see your weekly summary") instead of stats.

**Reason:** A 1- or 2-day average gives a misleading impression of the user's weekly pattern. Three days is enough to establish a range and a rudimentary average without being an arbitrary high bar.

---

## 2026-07-04 — Trend chart uses plain React Native Views, no charting library

**Context:** The Insights tab needs a simple day-by-day calorie bar chart.

**Decision:** Each bar is a `View` with `height` proportional to `(dayCalories / calorieMax) * MAX_BAR_HEIGHT`. Day labels are `Text` components beneath each bar. No external chart library is added.

**Reason:** A dependency-light chart keeps the bundle small, avoids SVG layer issues on Expo, and is fully accessible via `accessibilityLabel` on each bar column. A 7-bar chart does not warrant a charting library.

---

## 2026-07-04 — Account deletion: Neon first, Clerk second

**Context:** Deleting an account requires erasing data from two systems: the Neon database and the Clerk identity service.

**Decision:** `DELETE /api/v1/me` deletes the `app_users` row from Neon first (which cascades to all child tables via foreign-key constraints), then calls `clerkClient().users.deleteUser()`. The Clerk call is wrapped in a try-catch that swallows errors — if it fails, the endpoint still returns 204.

**Reason:** Neon data is the primary concern for the user's right to erasure. Deleting Neon data first guarantees the data is gone even if the Clerk call transiently fails. If Clerk deletion fails and the user re-authenticates, they get a fresh empty account via `GET /api/v1/me` — an acceptable edge case for beta. The alternative (Clerk first) would leave the user unable to authenticate if Neon deletion subsequently fails, which is worse.

---

## 2026-07-04 — Data export returns raw JSON via Content-Disposition

**Context:** Users need a way to download a copy of their data for portability or backup.

**Decision:** `GET /api/v1/me/export` returns `application/json` with `Content-Disposition: attachment; filename="calorielog-export-YYYY-MM-DD.json"`. The mobile app uses raw `fetch` (not `apiFetch`) to capture the response as text and passes it to React Native's `Share.share()`.

**Reason:** The `Content-Disposition` header signals to browsers and HTTP clients that the response is a file download. On mobile, the Share sheet lets users save the JSON to Files, email it, or upload to Drive without requiring `expo-file-system` (an additional dependency). Numeric string columns from Drizzle are converted to numbers in the export, matching the contracts API shape.

---

## 2026-07-04 — Analytics wrapper uses a closed event-name union type

**Context:** The app needs a privacy-safe foundation for product analytics.

**Decision:** `apps/mobile/lib/analytics.ts` exports `track(event: AllowedEventName)` where `AllowedEventName` is a union of specific string literals. The implementation is a no-op. No event carries a payload.

**Reason:** Limiting events to a closed union makes it impossible for callers to accidentally pass food names, calorie values, or any user-entered text — the TypeScript compiler rejects it. The no-op default means analytics is safe to call unconditionally without needing a configured SDK. Switching to a real provider later requires only a one-line body change.

---

## 2026-07-04 — Error reporting disabled by default; guarded by DSN env var

**Context:** Error reporting SDKs (e.g. Sentry) must never log nutrition data.

**Decision:** `apps/mobile/lib/errorReporting.ts` checks `EXPO_PUBLIC_ERROR_REPORTING_DSN` at module load time. When absent, `captureError()` returns immediately. The function signature accepts only `Record<string, string>` context to prevent accidental object logging.

**Reason:** A missing DSN means the SDK is not configured, so sending errors would fail silently or throw. Checking at module load is cheaper than checking per call. The `Record<string, string>` context type prevents callers from accidentally passing structured food objects as debug context.

---

## 2026-07-04 — EAS three-profile strategy (development / preview / production)

**Context:** The app needs reproducible cloud builds for developers, internal testers, and store submission.

**Decision:** `apps/mobile/eas.json` defines three profiles. `development` builds a debug APK with `developmentClient: true` for Metro-connected debugging. `preview` builds a release APK with `distribution: "internal"` for sideloaded or Play Console internal testing. `production` builds an AAB with `distribution: "store"` for Play Store submission.

**Reason:** Separate profiles prevent accidentally uploading a debug or development build to the store. The preview APK lets testers install without a Play Store account. The production AAB is required by Google Play — APKs are no longer accepted for new app submissions.
