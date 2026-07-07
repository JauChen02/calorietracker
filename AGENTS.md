# AGENTS.md — Mandatory Rules for All Agents

Read PRODUCT.md, ARCHITECTURE.md, DECISIONS.md, and this AGENTS.md before every task.

## Repository Layout

1. Mobile app code lives in `apps/mobile`.
2. API code lives in `apps/api`.
3. Shared Zod contracts live in `packages/contracts`.
4. Drizzle schema and migrations live in `packages/db`.

## Security Rules

5. The mobile app must never connect directly to Neon.
6. The mobile app must never contain database credentials, Clerk secret keys, food-provider keys, or Vercel secrets.
7. API keys and secrets stay server-side in Vercel environment variables.
8. Screens must not query the database directly.

## Code Architecture Rules

9. Mobile screens call hooks and repositories, not raw fetch code scattered through components.
10. Database changes require a migration.
11. Do not add fake production integrations or fake server behavior.
12. Fixtures are allowed only in tests, development previews, or explicitly labeled development-only code.

## Dependency and Scope Rules

13. Do not add dependencies unless required for the assigned task.
14. Do not refactor unrelated files.
15. Use strict TypeScript and Zod validation.

## Honesty Rules

16. Never claim a device test, database test, deployment, or build succeeded unless it was actually performed.

## Tone Rules

17. Use calm, non-judgmental nutrition language. Never use shame-based copy.

## After-Task Reporting

After each task, report:

- **Changed files** — list every file added, edited, or deleted
- **Migrations added** — list any new Drizzle migration files
- **Environment variables added** — list any new keys added to `.env.example`
- **Commands actually run** — list every shell command executed
- **Tests that passed or failed** — copy the test runner output summary
- **Manual steps still required** — list anything the developer must do before the feature is usable

## Architecture Decisions

19. Add an entry to `docs/DECISIONS.md` whenever an architectural decision is made.
