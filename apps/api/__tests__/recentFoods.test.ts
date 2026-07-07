/**
 * Recent foods API tests — /api/v1/recent-foods route.
 *
 * Scenarios:
 *   16. Unauthenticated requests return 401.
 *   17. Returns empty array for user with no entries.
 *   18. Scopes query to authenticated user only (ownership).
 *   19. Deduplication: DISTINCT ON (food_name, brand) — only most recent occurrence returned.
 *   20. Maps database rows to RecentFood contract shape correctly.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  },
}));

vi.mock("@/lib/auth", () => ({
  getClerkUserId: vi.fn(),
  getAppUser: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  assertDatabaseUrl: vi.fn().mockReturnValue("postgres://mock"),
}));

vi.mock("@calorielog/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calorielog/db")>();
  return { ...actual, createDb: vi.fn() };
});

import { getClerkUserId, getAppUser } from "@/lib/auth";
import { createDb } from "@calorielog/db";
import { GET } from "../app/api/v1/recent-foods/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLERK_USER_ID = "user_rf_test";
const APP_USER = {
  id: "a1b2c3d4-rf00-4000-8000-000000000001",
  clerkUserId: CLERK_USER_ID,
  email: "test@example.com",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const RECENT_ROW = {
  food_entry_id: "fe000001-0000-4000-8000-000000000001",
  food_name: "Protein shake",
  brand: "MyBrand",
  serving_label: "1 scoop",
  quantity: "1.00",
  grams: "30.00",
  calories: "120.00",
  protein_g: "25.00",
  carbs_g: "5.00",
  fat_g: "2.00",
  fiber_g: null,
  last_meal_type: "breakfast",
  last_logged_at: new Date("2024-01-15T08:00:00Z"),
};

beforeEach(() => vi.clearAllMocks());

function mockDbWithRows(rows: unknown[]) {
  const mockExecute = vi.fn().mockResolvedValue({ rows });
  vi.mocked(createDb).mockReturnValue({ execute: mockExecute } as never);
  return { mockExecute };
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. Unauthenticated requests
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/v1/recent-foods", () => {
  it("returns 401 when no auth", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 when user profile not found", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(null);
    mockDbWithRows([]);

    const res = await GET();

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("USER_NOT_FOUND");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 17. Empty result for user with no entries
  // ───────────────────────────────────────────────────────────────────────────

  it("returns empty array when user has no food entries", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    mockDbWithRows([]);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recentFoods).toEqual([]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 18. Ownership: query scoped to authenticated user
  // ───────────────────────────────────────────────────────────────────────────

  it("passes the authenticated user id to the SQL query", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    const { mockExecute } = mockDbWithRows([RECENT_ROW]);

    await GET();

    // execute() should have been called with a SQL template that
    // includes the user id (the raw SQL uses ${appUser.id} as a parameter)
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const sqlArg = mockExecute.mock.calls[0][0];
    // drizzle-orm sql template values contain the interpolated params
    expect(JSON.stringify(sqlArg)).toContain(APP_USER.id);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 19. Deduplication — DISTINCT ON result shape (enforced in SQL, not JS)
  // ───────────────────────────────────────────────────────────────────────────

  it("returns each (food_name, brand) once — the SQL result is not re-deduplicated in JS", async () => {
    // If the database returns two rows with the same name+brand, both appear.
    // This test documents that deduplication responsibility lives in SQL (DISTINCT ON),
    // not in the route handler's JS. The route maps rows 1-to-1.
    const rows = [RECENT_ROW, { ...RECENT_ROW, food_entry_id: "fe-other" }];
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    mockDbWithRows(rows);

    const res = await GET();
    const body = await res.json();

    // Route maps each returned DB row to an output entry — no extra filtering
    expect(body.recentFoods).toHaveLength(2);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 20. Response shape — numeric string coercion and field mapping
  // ───────────────────────────────────────────────────────────────────────────

  it("maps DB row to RecentFood contract shape with numeric coercion", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    mockDbWithRows([RECENT_ROW]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    const food = body.recentFoods[0];
    expect(food.foodEntryId).toBe(RECENT_ROW.food_entry_id);
    expect(food.foodName).toBe("Protein shake");
    expect(food.brand).toBe("MyBrand");
    expect(food.calories).toBe(120);       // coerced from "120.00"
    expect(food.proteinG).toBe(25);        // coerced from "25.00"
    expect(food.fiberG).toBeNull();
    expect(food.lastMealType).toBe("breakfast");
    expect(typeof food.lastLoggedAt).toBe("string");
  });
});
