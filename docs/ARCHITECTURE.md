# Architecture — CalorieLog

## Overview

CalorieLog is a pnpm workspace monorepo with two applications and two shared packages.

```
apps/mobile    →  Android-first Expo app (iOS-compatible shared code)
apps/api       →  Next.js App Router API deployed to Vercel
packages/contracts  →  Shared Zod schemas and TypeScript types
packages/db         →  Drizzle ORM schema, migrations, and DB client
```

## Mobile App — `apps/mobile`

- Built with **Expo SDK 52** and **Expo Router 4** (file-based routing).
- Android is the primary target. iOS builds share the same codebase.
- Navigation is handled by Expo Router's file-based system inside `app/`.
- Server state will be managed by **TanStack Query** once the API is connected.
- **Expo SQLite** is added only after the online logging flow is working end-to-end, to avoid premature complexity.
- The app never connects directly to Neon. All data access goes through the API.
- The app never stores database credentials, Clerk secret keys, food-provider keys, or Vercel secrets.
- Environment variables are prefixed `EXPO_PUBLIC_` to expose them to the app bundle.

## API — `apps/api`

- Built with **Next.js 15 App Router**.
- Deployed to **Vercel**.
- Connects to **Neon Postgres** using the `DATABASE_URL` environment variable (pooled connection via Neon's connection pooler).
- All request and response shapes are validated with **Zod** schemas from `packages/contracts`.
- **Clerk** provides authentication middleware. The Clerk secret key lives only in Vercel environment variables.

## Database — `packages/db`

- Schema defined with **Drizzle ORM** (`drizzle-orm/pg-core`).
- Migrations are generated with `drizzle-kit generate` and applied with `drizzle-kit migrate`.
- Migration commands use `DATABASE_URL_UNPOOLED` (direct connection) to avoid issues with the connection pooler during DDL operations.
- Migrations are committed to source control in `packages/db/drizzle/`.

## Shared Contracts — `packages/contracts`

- Zod schemas define the shape of all API request and response bodies.
- TypeScript types are derived from schemas via `z.infer<>`.
- Both the API (for validation) and the mobile app (for type safety) import from this package.

## Authentication — Clerk

- Clerk is not yet configured. Its integration will be added after the core logging flow works.
- The mobile app will use the Clerk Expo SDK.
- The API will use Clerk's Next.js middleware.

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `apps/api` | Neon pooled connection (runtime) |
| `DATABASE_URL_UNPOOLED` | `packages/db` | Neon direct connection (migrations) |
| `CLERK_SECRET_KEY` | `apps/api` | Clerk server-side key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `apps/api` | Clerk client-side key |
| `EXPO_PUBLIC_API_BASE_URL` | `apps/mobile` | API base URL |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `apps/mobile` | Clerk client-side key |

## Build and Deploy

- **Android/iOS builds**: Expo Application Services (EAS).
- **API hosting**: Vercel (auto-deploys from `main`).
- **CI**: GitHub Actions — lint, typecheck, and test on every push and pull request.
