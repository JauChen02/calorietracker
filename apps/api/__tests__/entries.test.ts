/**
 * API route tests for /api/v1/entries and /api/v1/entries/:id.
 *
 * These tests verify the three key behavioural requirements:
 *   1. All endpoints return 401 when the request is unauthenticated.
 *   2. Ownership is enforced — a user cannot access or mutate another user's entry.
 *   3. POSTing the same client_mutation_id twice returns the original entry, not a duplicate.
 *
 * next/server and @clerk/nextjs/server are mocked so that tests run in plain
 * Node.js without a running Next.js server or Clerk instance.
 * @calorielog/db's createDb is mocked so tests run without a real database.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Mock next/server before any route imports ────────────────────────────────
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  },
}));

// ── Mock auth helpers so we control who is "signed in" ───────────────────────
vi.mock("@/lib/auth", () => ({
  getClerkUserId: vi.fn(),
  getAppUser: vi.fn(),
}));

// ── Mock env assertion so tests don't need a real DATABASE_URL ───────────────
vi.mock("@/lib/env", () => ({
  assertDatabaseUrl: vi.fn().mockReturnValue("postgres://mock"),
}));

// ── Mock createDb from @calorielog/db — tests supply per-scenario fake DBs ───
vi.mock("@calorielog/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calorielog/db")>();
  return { ...actual, createDb: vi.fn() };
});

// ── Now import the mocked helpers and route handlers ─────────────────────────
import { getClerkUserId, getAppUser } from "@/lib/auth";
import { createDb } from "@calorielog/db";
import { GET, POST } from "../app/api/v1/entries/route";
import {
  PATCH,
  DELETE,
} from "../app/api/v1/entries/[id]/route";

// ── Shared test fixtures ──────────────────────────────────────────────────────

const CLERK_USER_ID = "user_abc123";
const APP_USER = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  clerkUserId: CLERK_USER_ID,
  email: "alice@example.com",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const NOW = new Date("2024-01-15T12:00:00Z");

const EXISTING_ENTRY = {
  id: "eeeeeeee-0000-4000-8000-000000000001",
  userId: APP_USER.id,
  clientMutationId: "cccccccc-0000-4000-8000-000000000001",
  mealType: "breakfast",
  foodName: "Oatmeal",
  brand: null,
  servingLabel: null,
  quantity: "1.00",
  grams: null,
  calories: "300.00",
  proteinG: "10.00",
  carbsG: "54.00",
  fatG: "6.00",
  fiberG: null,
  source: "manual",
  loggedAt: NOW,
  localDate: "2024-01-15",
  timezone: "UTC",
  version: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

const VALID_CREATE_BODY = {
  clientMutationId: EXISTING_ENTRY.clientMutationId,
  mealType: "breakfast",
  foodName: "Oatmeal",
  calories: 300,
  source: "manual",
  loggedAt: NOW.toISOString(),
  localDate: "2024-01-15",
  timezone: "UTC",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Unauthorized access
// ─────────────────────────────────────────────────────────────────────────────

describe("Unauthorized access", () => {
  beforeEach(() => {
    vi.mocked(getClerkUserId).mockResolvedValue(null);
  });

  it("GET /api/v1/entries returns 401 without auth", async () => {
    const req = new Request(
      "http://localhost/api/v1/entries?from=2024-01-01&to=2024-01-07",
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/v1/entries returns 401 without auth", async () => {
    const req = new Request("http://localhost/api/v1/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_CREATE_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/v1/entries/:id returns 401 without auth", async () => {
    const req = new Request("http://localhost/api/v1/entries/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodName: "Updated" }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "some-id" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("DELETE /api/v1/entries/:id returns 401 without auth", async () => {
    const req = new Request("http://localhost/api/v1/entries/some-id", {
      method: "DELETE",
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "some-id" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Ownership enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe("Ownership enforcement", () => {
  beforeEach(() => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
  });

  it("PATCH returns 404 when the entry belongs to a different user", async () => {
    // The DB update finds no row (entry exists but belongs to another user — the
    // WHERE clause filters on BOTH id AND user_id, so it returns nothing).
    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request(
      "http://localhost/api/v1/entries/other-users-entry-id",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodName: "Tampered" }),
      },
    );
    const res = await PATCH(req, {
      params: Promise.resolve({ id: "other-users-entry-id" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("DELETE returns 404 when the entry belongs to a different user", async () => {
    const mockDb = {
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request(
      "http://localhost/api/v1/entries/other-users-entry-id",
      { method: "DELETE" },
    );
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "other-users-entry-id" }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("GET /api/v1/entries always scopes results to the authenticated user", async () => {
    const mockOrderBy = vi.fn().mockResolvedValue([EXISTING_ENTRY]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockDb = {
      select: vi.fn().mockReturnValue({ from: mockFrom }),
    };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request(
      "http://localhost/api/v1/entries?from=2024-01-01&to=2024-01-31",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    // The WHERE clause was applied — ownership scoping is always in effect.
    expect(mockWhere).toHaveBeenCalled();
    // The result set is returned from the route
    const body = await res.json();
    expect(body.entries).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Idempotent create — duplicate client_mutation_id
// ─────────────────────────────────────────────────────────────────────────────

describe("Duplicate client_mutation_id behaviour", () => {
  beforeEach(() => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
  });

  it("returns the original entry (200) when the same client_mutation_id is posted twice", async () => {
    // First POST succeeds — insert returns the new entry
    const mockDbFirstCall = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([EXISTING_ENTRY]),
          }),
        }),
      }),
    };

    // Second POST — insert conflicts (returns nothing), select fetches existing
    const mockDbSecondCall = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // conflict
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([EXISTING_ENTRY]),
        }),
      }),
    };

    vi.mocked(createDb)
      .mockReturnValueOnce(mockDbFirstCall as never)
      .mockReturnValueOnce(mockDbSecondCall as never);

    const makeRequest = () =>
      new Request("http://localhost/api/v1/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_CREATE_BODY),
      });

    const firstRes = await POST(makeRequest());
    expect(firstRes.status).toBe(201);

    const secondRes = await POST(makeRequest());
    // Must not be 201 (no new entry created) and must not be an error
    expect(secondRes.status).toBe(200);

    const firstBody = await firstRes.json();
    const secondBody = await secondRes.json();

    // Both responses refer to the same entry
    expect(firstBody.id).toBe(secondBody.id);
    expect(firstBody.clientMutationId).toBe(secondBody.clientMutationId);
  });

  it("does not call select when the first insert succeeds (no conflict)", async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([EXISTING_ENTRY]),
          }),
        }),
      }),
      select: vi.fn(), // should NOT be called
    };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request("http://localhost/api/v1/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID_CREATE_BODY),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    // select is only used on the conflict path — it must not fire here
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Input validation
// ─────────────────────────────────────────────────────────────────────────────

describe("Input validation", () => {
  beforeEach(() => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
  });

  it("GET /api/v1/entries returns 400 when date params are missing", async () => {
    const req = new Request("http://localhost/api/v1/entries");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_DATE_RANGE");
  });

  it("POST returns 422 when foodName is empty", async () => {
    const mockDb = {
      insert: vi.fn(),
    };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request("http://localhost/api/v1/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_CREATE_BODY, foodName: "  " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    // insert must never be called for invalid input
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
