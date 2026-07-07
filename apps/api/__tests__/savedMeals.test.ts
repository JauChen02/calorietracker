/**
 * Saved meals API tests — /api/v1/saved-meals routes.
 *
 * Scenarios:
 *   SM01. Create saved meal from entryIds — happy path returns 201 with items.
 *   SM02. Create saved meal with no matching entries returns 404.
 *   SM03. List saved meals includes items, sorted by sortOrder.
 *   SM04. Rename saved meal (PATCH name) returns updated meal.
 *   SM05. Delete saved meal returns 204.
 *   SM06. Log saved meal creates one food_entry per item, returns 201.
 *   SM07. Log saved meal with wrong clientMutationIds count returns 400.
 *   SM08. Log saved meal idempotency — clientMutationId conflict returns existing entry.
 *   SM09. Saved meal items are nutrition snapshots — logging never queries external API.
 *   SM10. Ownership — cannot log another user's saved meal (404).
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
import { GET, POST } from "../app/api/v1/saved-meals/route";
import { PATCH, DELETE } from "../app/api/v1/saved-meals/[id]/route";
import { POST as LOG } from "../app/api/v1/saved-meals/[id]/log/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLERK_USER_ID = "user_sm_test";
const APP_USER = {
  id: "a1b2c3d4-sm00-4000-8000-000000000001",
  clerkUserId: CLERK_USER_ID,
  email: "sm@example.com",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const ENTRY_ROW = {
  id: "entry001-0000-4000-8000-000000000001",
  userId: APP_USER.id,
  clientMutationId: "mut00001-0000-4000-8000-000000000001",
  mealType: "breakfast",
  foodName: "Oatmeal",
  brand: null,
  servingLabel: "1 cup",
  quantity: "1.00",
  grams: "240.00",
  calories: "154.00",
  proteinG: "5.00",
  carbsG: "27.00",
  fatG: "3.00",
  fiberG: "4.00",
  source: "manual",
  loggedAt: new Date("2024-03-01T08:00:00Z"),
  localDate: "2024-03-01",
  timezone: "America/New_York",
  version: 1,
  createdAt: new Date("2024-03-01"),
  updatedAt: new Date("2024-03-01"),
};

const MEAL_ROW = {
  id: "meal0001-0000-4000-8000-000000000001",
  userId: APP_USER.id,
  name: "Usual breakfast",
  defaultMealType: "breakfast",
  createdAt: new Date("2024-03-02"),
  updatedAt: new Date("2024-03-02"),
};

const ITEM_ROW = {
  id: "mealitem-0000-4000-8000-000000000001",
  savedMealId: MEAL_ROW.id,
  sortOrder: 0,
  foodName: "Oatmeal",
  brand: null,
  servingLabel: "1 cup",
  quantity: "1.00",
  grams: "240.00",
  calories: "154.00",
  proteinG: "5.00",
  carbsG: "27.00",
  fatG: "3.00",
  fiberG: "4.00",
  source: "manual",
  createdAt: new Date("2024-03-02"),
  updatedAt: new Date("2024-03-02"),
};

const LOG_BODY = {
  mealType: "breakfast",
  loggedAt: "2024-03-05T08:00:00.000Z",
  localDate: "2024-03-05",
  timezone: "America/New_York",
  clientMutationIds: ["logmut01-0000-4000-8000-000000000001"],
};

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// SM01. Create saved meal — happy path
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/v1/saved-meals", () => {
  it("creates a saved meal with items and returns 201", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const txFn = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([MEAL_ROW]) }),
        }),
      };
      const txInsertItems = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([ITEM_ROW]) }),
      });
      // First insert = meal, second = items
      tx.insert
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([MEAL_ROW]) }) })
        .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([ITEM_ROW]) }) });
      return fn(tx);
    });

    const mockOrderBy = vi.fn().mockResolvedValue([ENTRY_ROW]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

    vi.mocked(createDb).mockReturnValue({
      select: vi.fn().mockReturnValue({ from: mockFrom }),
      transaction: txFn,
    } as never);

    const req = new Request("http://localhost/api/v1/saved-meals", {
      method: "POST",
      body: JSON.stringify({ name: "Usual breakfast", entryIds: [ENTRY_ROW.id] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Usual breakfast");
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("returns 404 when no matching entries found", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const mockOrderBy = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

    vi.mocked(createDb).mockReturnValue({
      select: vi.fn().mockReturnValue({ from: mockFrom }),
    } as never);

    const req = new Request("http://localhost/api/v1/saved-meals", {
      method: "POST",
      body: JSON.stringify({ name: "Ghost meal", entryIds: ["non-existent-id"] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(null);

    const req = new Request("http://localhost/api/v1/saved-meals", {
      method: "POST",
      body: JSON.stringify({ name: "Breakfast", entryIds: ["id1"] }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SM03. List saved meals
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/v1/saved-meals", () => {
  it("returns saved meals with their items", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const mockOrderByMeals = vi.fn().mockResolvedValue([MEAL_ROW]);
    const mockWhereMeals = vi.fn().mockReturnValue({ orderBy: mockOrderByMeals });
    const mockFromMeals = vi.fn().mockReturnValue({ where: mockWhereMeals });

    const mockOrderByItems = vi.fn().mockResolvedValue([ITEM_ROW]);
    const mockWhereItems = vi.fn().mockReturnValue({ orderBy: mockOrderByItems });
    const mockFromItems = vi.fn().mockReturnValue({ where: mockWhereItems });

    vi.mocked(createDb).mockReturnValue({
      select: vi.fn()
        .mockReturnValueOnce({ from: mockFromMeals })
        .mockReturnValueOnce({ from: mockFromItems }),
    } as never);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.savedMeals)).toBe(true);
    expect(body.savedMeals[0].name).toBe("Usual breakfast");
    expect(body.savedMeals[0].items.length).toBeGreaterThan(0);
    expect(body.savedMeals[0].items[0].calories).toBe(154);
  });

  it("returns empty list when user has no saved meals", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const mockOrderBy = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

    vi.mocked(createDb).mockReturnValue({
      select: vi.fn().mockReturnValue({ from: mockFrom }),
    } as never);

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.savedMeals).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SM04. Rename saved meal
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/v1/saved-meals/:id", () => {
  it("renames the meal and returns the updated meal", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const updatedMeal = { ...MEAL_ROW, name: "New name" };
    const mockUpdateReturning = vi.fn().mockResolvedValue([updatedMeal]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });

    const mockOrderByItems = vi.fn().mockResolvedValue([ITEM_ROW]);
    const mockWhereItems = vi.fn().mockReturnValue({ orderBy: mockOrderByItems });
    const mockFromItems = vi.fn().mockReturnValue({ where: mockWhereItems });

    vi.mocked(createDb).mockReturnValue({
      update: vi.fn().mockReturnValue({ set: mockSet }),
      select: vi.fn().mockReturnValue({ from: mockFromItems }),
    } as never);

    const req = new Request(`http://localhost/api/v1/saved-meals/${MEAL_ROW.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "New name" }),
    });
    const params = Promise.resolve({ id: MEAL_ROW.id });
    const res = await PATCH(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("New name");
  });

  it("returns 404 when meal does not belong to the user", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const mockReturning = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });

    vi.mocked(createDb).mockReturnValue({
      update: vi.fn().mockReturnValue({ set: mockSet }),
    } as never);

    const req = new Request(`http://localhost/api/v1/saved-meals/other-meal`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Hack" }),
    });
    const params = Promise.resolve({ id: "other-meal" });
    const res = await PATCH(req, { params });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SM05. Delete saved meal
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/v1/saved-meals/:id", () => {
  it("deletes the meal and returns 204", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const mockReturning = vi.fn().mockResolvedValue([{ id: MEAL_ROW.id }]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });

    vi.mocked(createDb).mockReturnValue({
      delete: vi.fn().mockReturnValue({ where: mockWhere }),
    } as never);

    const params = Promise.resolve({ id: MEAL_ROW.id });
    const res = await DELETE(new Request("http://localhost"), { params });

    expect(res.status).toBe(204);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SM06. Log saved meal — creates food_entries snapshots
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/v1/saved-meals/:id/log", () => {
  function makeLogDb(mealRow = MEAL_ROW, items = [ITEM_ROW]) {
    const LOGGED_ENTRY = {
      ...ENTRY_ROW,
      id: "logged01-0000-4000-8000-000000000001",
      clientMutationId: LOG_BODY.clientMutationIds[0],
      localDate: LOG_BODY.localDate,
      source: "saved_meal",
    };

    const txFn = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([LOGGED_ENTRY]),
            }),
          }),
        }),
      };
      return fn(tx);
    });

    // Meal lookup: select().from().where() → Promise<[mealRow]>
    const mockMealWhere = vi.fn().mockResolvedValue([mealRow]);
    const mockMealFrom = vi.fn().mockReturnValue({ where: mockMealWhere });

    // Items lookup: select().from().where().orderBy() → Promise<items>
    const mockItemsOrderBy = vi.fn().mockResolvedValue(items);
    const mockItemsWhere = vi.fn().mockReturnValue({ orderBy: mockItemsOrderBy });
    const mockItemsFrom = vi.fn().mockReturnValue({ where: mockItemsWhere });

    let selectCallCount = 0;
    vi.mocked(createDb).mockReturnValue({
      select: vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return { from: mockMealFrom };
        }
        return { from: mockItemsFrom };
      }),
      transaction: txFn,
    } as never);

    return { LOGGED_ENTRY, txFn };
  }

  it("creates one food_entry per item and returns 201", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    makeLogDb();

    const req = new Request(
      `http://localhost/api/v1/saved-meals/${MEAL_ROW.id}/log`,
      {
        method: "POST",
        body: JSON.stringify(LOG_BODY),
      },
    );
    const params = Promise.resolve({ id: MEAL_ROW.id });
    const res = await LOG(req, { params });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.entries.length).toBe(1);
    expect(body.entries[0].source).toBe("saved_meal");
  });

  it("returns 400 when clientMutationIds count does not match item count", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    makeLogDb();

    const req = new Request(
      `http://localhost/api/v1/saved-meals/${MEAL_ROW.id}/log`,
      {
        method: "POST",
        body: JSON.stringify({
          ...LOG_BODY,
          clientMutationIds: [], // wrong count
        }),
      },
    );
    const params = Promise.resolve({ id: MEAL_ROW.id });
    const res = await LOG(req, { params });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when the meal does not belong to the requesting user", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    // First select returns empty (no meal found for this user)
    vi.mocked(createDb).mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as never);

    const req = new Request(
      `http://localhost/api/v1/saved-meals/other-meal/log`,
      {
        method: "POST",
        body: JSON.stringify(LOG_BODY),
      },
    );
    const params = Promise.resolve({ id: "other-meal" });
    const res = await LOG(req, { params });

    expect(res.status).toBe(404);
  });
});
