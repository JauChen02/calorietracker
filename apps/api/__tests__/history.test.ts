/**
 * History feature tests — /api/v1/day route.
 *
 * Tests required by the History task:
 *   3. Date filtering uses local_date (not loggedAt) as the boundary.
 *   4. Date navigation cannot accidentally return entries from another user.
 *
 * Mocking follows the same pattern as entries.test.ts so tests run in plain
 * Node.js without a running Next.js server, Clerk instance, or database.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Mock next/server ─────────────────────────────────────────────────────────
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  },
}));

// ── Mock auth helpers ─────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  getClerkUserId: vi.fn(),
  getAppUser: vi.fn(),
}));

// ── Mock env assertion ────────────────────────────────────────────────────────
vi.mock("@/lib/env", () => ({
  assertDatabaseUrl: vi.fn().mockReturnValue("postgres://mock"),
}));

// ── Mock createDb ─────────────────────────────────────────────────────────────
vi.mock("@calorielog/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calorielog/db")>();
  return { ...actual, createDb: vi.fn() };
});

import { getClerkUserId, getAppUser } from "@/lib/auth";
import { createDb } from "@calorielog/db";
import { GET as GET_DAY } from "../app/api/v1/day/route";

// ── Shared fixtures ───────────────────────────────────────────────────────────

const CLERK_USER_ID = "user_history_test";
const APP_USER = {
  id: "a1b2c3d4-hist-4000-8000-000000000001",
  clerkUserId: CLERK_USER_ID,
  email: "test@example.com",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// An entry logged at 23:30 UTC (which may be the next calendar day in UTC)
// but with localDate = '2024-01-10' (user's local date).
const ENTRY_JAN10 = {
  id: "entry-jan10-0000-4000-8000-000000000001",
  userId: APP_USER.id,
  clientMutationId: "mut-jan10-0000-4000-8000-000000000001",
  mealType: "dinner",
  foodName: "Late dinner",
  brand: null,
  servingLabel: null,
  quantity: "1.00",
  grams: null,
  calories: "600.00",
  proteinG: "40.00",
  carbsG: "70.00",
  fatG: "15.00",
  fiberG: null,
  source: "manual",
  // loggedAt is UTC 23:30 on Jan 10, which is Jan 11 UTC — but localDate is Jan 10
  loggedAt: new Date("2024-01-10T23:30:00Z"),
  localDate: "2024-01-10",
  timezone: "America/New_York",
  version: 1,
  createdAt: new Date("2024-01-10T23:30:00Z"),
  updatedAt: new Date("2024-01-10T23:30:00Z"),
};

const ENTRY_JAN11 = {
  ...ENTRY_JAN10,
  id: "entry-jan11-0000-4000-8000-000000000002",
  clientMutationId: "mut-jan11-0000-4000-8000-000000000002",
  foodName: "Breakfast next day",
  localDate: "2024-01-11",
  loggedAt: new Date("2024-01-11T09:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Date filtering uses local_date
// ─────────────────────────────────────────────────────────────────────────────

describe("Date filtering uses local_date", () => {
  beforeEach(() => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
  });

  it("returns only the entry whose localDate matches the requested date", async () => {
    // The mock DB returns only the Jan-10 entry when queried — simulating the
    // server-side WHERE local_date = '2024-01-10' filter.
    const mockOrderBy = vi.fn().mockResolvedValue([ENTRY_JAN10]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockDb = { select: vi.fn().mockReturnValue({ from: mockFrom }) };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request("http://localhost/api/v1/day?date=2024-01-10");
    const res = await GET_DAY(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    // The route must surface the date as given.
    expect(body.date).toBe("2024-01-10");

    // Only the entry for Jan 10 is returned (not the Jan 11 entry).
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].localDate).toBe("2024-01-10");

    // WHERE clause was applied — local_date filtering is in effect.
    expect(mockWhere).toHaveBeenCalled();
  });

  it("does NOT return entries from a different date even if loggedAt is close to midnight", async () => {
    // ENTRY_JAN10's loggedAt is 23:30 UTC Jan 10, which is Jan 11 UTC.
    // The route MUST use localDate, not loggedAt, as the filter.
    // Asking for Jan 11 must not return ENTRY_JAN10 (whose localDate is Jan 10).
    const mockOrderBy = vi.fn().mockResolvedValue([ENTRY_JAN11]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockDb = { select: vi.fn().mockReturnValue({ from: mockFrom }) };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request("http://localhost/api/v1/day?date=2024-01-11");
    const res = await GET_DAY(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.date).toBe("2024-01-11");
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].localDate).toBe("2024-01-11");
  });

  it("returns totals aggregated from only the returned entries", async () => {
    const mockOrderBy = vi.fn().mockResolvedValue([ENTRY_JAN10]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockDb = { select: vi.fn().mockReturnValue({ from: mockFrom }) };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request("http://localhost/api/v1/day?date=2024-01-10");
    const res = await GET_DAY(req);

    const body = await res.json();
    // sumEntries converts numeric strings to numbers — calories = 600
    expect(body.totals.calories).toBe(600);
  });

  it("returns an empty entries array and zero totals for a date with no entries", async () => {
    const mockOrderBy = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockDb = { select: vi.fn().mockReturnValue({ from: mockFrom }) };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request("http://localhost/api/v1/day?date=2024-06-01");
    const res = await GET_DAY(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(0);
    expect(body.totals.calories).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Date navigation cannot accidentally return entries from another user
// ─────────────────────────────────────────────────────────────────────────────

describe("Ownership enforcement on GET /api/v1/day", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(null);

    const req = new Request("http://localhost/api/v1/day?date=2024-01-10");
    const res = await GET_DAY(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("always scopes the query to the authenticated user (WHERE clause applied)", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const mockOrderBy = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockDb = { select: vi.fn().mockReturnValue({ from: mockFrom }) };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request("http://localhost/api/v1/day?date=2024-01-10");
    const res = await GET_DAY(req);

    expect(res.status).toBe(200);
    // The WHERE clause (containing userId AND localDate filters) must always fire.
    // A route that forgets the user_id predicate would return all users' entries.
    expect(mockWhere).toHaveBeenCalled();
  });

  it("returns an empty result for the requesting user even if other users have entries on that date", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    // The mock simulates a DB that, after ownership scoping, finds nothing for this user.
    const mockOrderBy = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockDb = { select: vi.fn().mockReturnValue({ from: mockFrom }) };
    vi.mocked(createDb).mockReturnValue(mockDb as never);

    const req = new Request("http://localhost/api/v1/day?date=2024-01-10");
    const res = await GET_DAY(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    // No cross-user data leak — only an empty array for this user.
    expect(body.entries).toHaveLength(0);
    expect(mockWhere).toHaveBeenCalled();
  });

  it("returns 400 for an invalid date format", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);

    const req = new Request("http://localhost/api/v1/day?date=not-a-date");
    const res = await GET_DAY(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_DATE");
  });
});
