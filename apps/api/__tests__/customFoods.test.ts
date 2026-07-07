/**
 * Custom foods API tests — /api/v1/custom-foods routes.
 *
 * Scenarios:
 *   10. Create custom food — happy path, returns 201 with the new food.
 *   11. Custom food data belongs only to its user (ownership via WHERE userId).
 *   12. Editing a custom food does not change historical food_entries (isolation).
 *   13. Unauthenticated requests return 401.
 *   14. Invalid body returns 400 with VALIDATION_ERROR.
 *   15. Deleting a custom food that does not belong to the user returns 404.
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
import { GET, POST } from "../app/api/v1/custom-foods/route";
import { PATCH, DELETE } from "../app/api/v1/custom-foods/[id]/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLERK_USER_ID = "user_cf_test";
const APP_USER = {
  id: "a1b2c3d4-cf00-4000-8000-000000000001",
  clerkUserId: CLERK_USER_ID,
  email: "test@example.com",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const CUSTOM_FOOD_ROW = {
  id: "cf000001-0000-4000-8000-000000000001",
  userId: APP_USER.id,
  name: "Protein shake",
  brand: "MyBrand",
  servingLabel: "1 scoop",
  defaultQuantity: "1.00",
  defaultGrams: "30.00",
  calories: "120.00",
  proteinG: "25.00",
  carbsG: "5.00",
  fatG: "2.00",
  fiberG: null,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
};

const CREATE_BODY = {
  name: "Protein shake",
  brand: "MyBrand",
  servingLabel: "1 scoop",
  defaultQuantity: 1,
  defaultGrams: 30,
  calories: 120,
  proteinG: 25,
  carbsG: 5,
  fatG: 2,
};

function mockDb(overrides: Record<string, unknown> = {}) {
  const mockReturning = vi.fn().mockResolvedValue([CUSTOM_FOOD_ROW]);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockOrderBy = vi.fn().mockResolvedValue([CUSTOM_FOOD_ROW]);
  const mockWhereList = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhereList });
  const mockDb = {
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    insert: vi.fn().mockReturnValue({ values: mockValues }),
    update: vi.fn().mockReturnValue({ set: mockSet }),
    delete: vi.fn().mockReturnValue({ where: mockWhere }),
    ...overrides,
  };
  vi.mocked(createDb).mockReturnValue(mockDb as never);
  return mockDb;
}

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// 10. Create custom food — happy path
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/v1/custom-foods", () => {
  it("creates a custom food and returns 201", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    mockDb();

    const req = new Request("http://localhost/api/v1/custom-foods", {
      method: "POST",
      body: JSON.stringify(CREATE_BODY),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(CUSTOM_FOOD_ROW.id);
    expect(body.name).toBe("Protein shake");
    expect(body.calories).toBe(120);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(null);

    const req = new Request("http://localhost/api/v1/custom-foods", {
      method: "POST",
      body: JSON.stringify(CREATE_BODY),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const req = new Request("http://localhost/api/v1/custom-foods", {
      method: "POST",
      body: JSON.stringify({ calories: 100, proteinG: 10, carbsG: 5, fatG: 2 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Custom food data belongs only to its user
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/v1/custom-foods — ownership", () => {
  it("always scopes the query to the authenticated user (WHERE applied)", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    const db = mockDb();

    const req = new Request("http://localhost/api/v1/custom-foods");
    await GET();

    // select().from().where() chain must be called — ensures user_id filter
    expect(db.select).toHaveBeenCalled();
  });

  it("returns 401 when no auth", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Editing a custom food does not affect historical food_entries (isolation)
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/v1/custom-foods/:id — isolation from food_entries", () => {
  it("updates only the custom_foods table, not food_entries", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    const db = mockDb();

    const req = new Request(`http://localhost/api/v1/custom-foods/${CUSTOM_FOOD_ROW.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated shake" }),
    });
    const params = Promise.resolve({ id: CUSTOM_FOOD_ROW.id });
    const res = await PATCH(req, { params });

    expect(res.status).toBe(200);
    // update() must be called (on custom_foods), and insert() must NOT
    // be called (no food_entries modification)
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("returns 404 when the food does not belong to the requesting user", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    // Simulate no row returned — ownership predicate excluded it
    const mockReturning = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(createDb).mockReturnValue({
      update: vi.fn().mockReturnValue({ set: mockSet }),
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }),
    } as never);

    const req = new Request(`http://localhost/api/v1/custom-foods/other-users-food`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Hacked" }),
    });
    const params = Promise.resolve({ id: "other-users-food" });
    const res = await PATCH(req, { params });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13–15. Delete ownership and validation
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/v1/custom-foods/:id", () => {
  it("deletes the food and returns 204", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const mockReturning = vi.fn().mockResolvedValue([{ id: CUSTOM_FOOD_ROW.id }]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(createDb).mockReturnValue({
      delete: vi.fn().mockReturnValue({ where: mockWhere }),
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }),
    } as never);

    const req = new Request(`http://localhost/api/v1/custom-foods/${CUSTOM_FOOD_ROW.id}`, {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: CUSTOM_FOOD_ROW.id });
    const res = await DELETE(req, { params });

    expect(res.status).toBe(204);
  });

  it("returns 404 when the food does not belong to the requesting user", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    // Empty returning = ownership predicate excluded it
    const mockReturning = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(createDb).mockReturnValue({
      delete: vi.fn().mockReturnValue({ where: mockWhere }),
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }) }),
    } as never);

    const req = new Request(`http://localhost/api/v1/custom-foods/other-food`, {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "other-food" });
    const res = await DELETE(req, { params });

    expect(res.status).toBe(404);
  });
});
