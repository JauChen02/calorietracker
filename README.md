# CalorieLog

A fast, non-judgmental calorie and macro tracker. Android-first, built with Expo and Next.js.

## Repository structure

```
apps/
  mobile/       Expo Router Android app
  api/          Next.js App Router API (deployed to Vercel)
packages/
  contracts/    Shared Zod schemas and TypeScript types
  db/           Drizzle ORM schema, migrations, and DB utilities
docs/
  PRODUCT.md        Product scope and tone
  ARCHITECTURE.md   Technical architecture overview
  DECISIONS.md      Log of architectural decisions
```

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| Android Studio | latest | [developer.android.com/studio](https://developer.android.com/studio) |

---

## Local setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

Open `apps/api/.env.local` and fill in `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `API_ENV`.  
See the **Neon setup** section below for how to get those values.

### 3. Run the API

```bash
pnpm dev:api
```

API starts at `http://localhost:3000`.

| Endpoint | Description |
|---|---|
| `GET /api/health` | API and database connectivity status |
| `GET /api/v1/version` | Version and environment info |

### 4. Run the mobile app

```bash
pnpm dev:mobile
```

Press `a` to open on an Android emulator, or scan the QR code with Expo Go.

---

## Workspace scripts

| Script | Description |
|---|---|
| `pnpm lint` | ESLint across all packages |
| `pnpm typecheck` | TypeScript checking across all packages |
| `pnpm test` | Vitest unit tests |
| `pnpm format` | Prettier — write |
| `pnpm format:check` | Prettier — check only |
| `pnpm dev:mobile` | Start Expo dev server |
| `pnpm dev:api` | Start Next.js dev server |
| `pnpm db:generate` | Generate Drizzle migration from schema diff |
| `pnpm db:migrate` | Apply pending migrations to Neon |
| `pnpm db:status` | Show applied vs. pending migrations |

---

## Neon setup

### Create a project

1. Sign up at [neon.tech](https://neon.tech) and create a new project.
2. Choose the **PostgreSQL 16** version and a region close to your Vercel deployment region.
3. Note the project name — it appears in the connection strings.

### Get connection strings

In the Neon console go to **Project → Connection Details**:

| Variable | Setting | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ "Pooled connection" checked | API runtime (PgBouncer pooler) |
| `DATABASE_URL_UNPOOLED` | ❌ "Connection pooling" unchecked | Drizzle migrations (direct) |

Both strings look like `postgres://user:password@host/dbname`. Copy them into `apps/api/.env.local`.

### Run migrations

```bash
pnpm db:migrate
```

This applies all pending migrations in order:
- `0000_initial_schema.sql` — creates the `app_metadata` table
- `0001_add_app_users.sql` — creates the `app_users` table (requires Clerk to be configured)

### Verify migration status

```bash
pnpm db:status
```

Shows which migrations have been applied and which are pending.

### Adding schema changes

1. Edit `packages/db/src/schema/index.ts`.
2. Run `pnpm db:generate` — creates a new SQL migration file in `packages/db/drizzle/`.
3. Review the generated SQL, then run `pnpm db:migrate`.
4. Commit both the schema change and the migration file.

> **Rule:** Never run migrations automatically during Vercel deployment. Apply them manually before deploying breaking schema changes.

---

## Clerk setup

### 1. Create a Clerk application

1. Sign up at [clerk.com](https://clerk.com) and create a new application.
2. Choose **Email + Password** as the sign-in method.
3. Enable **Email verification** (Clerk requires this for new accounts by default).

### 2. Get your API keys

In the Clerk dashboard → **API Keys**:

| Key | Where to put it |
|---|---|
| Publishable key (`pk_…`) | `apps/api/.env.local` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| | `apps/mobile/.env.local` as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| Secret key (`sk_…`) | `apps/api/.env.local` as `CLERK_SECRET_KEY` only — **never in mobile** |

### 3. Verify the auth flow locally

1. Start the API: `pnpm dev:api`
2. Start the mobile app: `pnpm dev:mobile`
3. Create an account via the Sign Up screen.
4. Check `GET /api/v1/me` — it should return your user record and trigger an `app_users` upsert.

### 4. Test the protected endpoint

```bash
# Without a token — should return 401
curl http://localhost:3000/api/v1/me

# With a valid session token from Clerk (copy from the dev tools or useAuth().getToken())
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/me
```

---

## Vercel deployment (API)

### 1. Create a Vercel project

```bash
# Install Vercel CLI once
npm install -g vercel

# From the monorepo root
vercel
```

When prompted:
- **Set up and deploy**: Yes
- **Link to existing project**: No (create new)
- **Project name**: `calorielog-api` (or your choice)

### 2. Set the root directory

In Vercel dashboard → **Project → Settings → General**:

| Setting | Value |
|---|---|
| Root Directory | `apps/api` |
| Framework Preset | Next.js (auto-detected) |
| Build Command | `pnpm build` (auto-detected) |
| Install Command | `cd ../.. && pnpm install` |
| Output Directory | `.next` (auto-detected) |

The `apps/api/vercel.json` sets the install and build commands for you, but Root Directory must be set in the dashboard or via `vercel link`.

### 3. Add environment variables

In Vercel dashboard → **Project → Settings → Environment Variables**, add:

| Variable | Environment | Value |
|---|---|---|
| `DATABASE_URL` | Production, Preview | Neon pooled connection string |
| `API_ENV` | Production | `production` |
| `API_ENV` | Preview | `staging` |
| `CLERK_SECRET_KEY` | Production, Preview | Clerk Secret key (from Clerk dashboard) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production, Preview | Clerk Publishable key |

> `DATABASE_URL_UNPOOLED` is only needed locally for migrations. Do **not** add it to Vercel.

### 4. Deploy

```bash
vercel --prod
```

Or push to `main` — Vercel auto-deploys on push.

### 5. Verify

```
https://your-project.vercel.app/api/health
```

Should return `{ "status": "ok", ... }` with `database.connected: true`.

---

## CI

GitHub Actions runs lint → typecheck → test on every push and pull request to `main`.

---

## Security notes

- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `CLERK_SECRET_KEY` are **never** committed to source control.
- The mobile app only receives `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — no database credentials or server secrets ever reach it.
- Clerk session tokens are stored in the OS keychain/keystore via `expo-secure-store`, never in AsyncStorage.
- All secrets live in `apps/api/.env.local` locally and Vercel environment variables in production.
