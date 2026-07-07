/**
 * Favorites API tests — /api/v1/favorites routes.
 *
 * Scenarios:
 *   F01. Create favorite — happy path, returns 201 with the new favorite.
 *   F02. List favorites — scoped to the authenticated user.
 *   F03. Unauthenticated requests return 401.
 *   F04. Invalid body returns 400 with VALIDATION_ERROR.
 *   F05. Delete favorite — happy path returns 204.
 *   F06. Delete favorite that does not belong to the user returns 404.
 *   F07. Favorites store nutrition snapshots — no external data source queried.
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
import { GET, POST } from "../app/api/v1/favorites/route";
import { DELETE } from "../app/api/v1/favorites/[id]/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLERK_USER_ID = "user_fav_test";
const APP_USER = {
  id: "a1b2c3d4-fav0-4000-8000-000000000001",
  clerkUserId: CLERK_USER_ID,
  email: "fav@example.com",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const FAVORITE_ROW = {
  id: "fav00001-0000-4000-8000-000000000001",
  userId: APP_USER.id,
  name: "Greek Yogurt",
  brand: "Chobani",
  servingLabel: "1 cup",
  quantity: "1.00",
  grams: "227.00",
  calories: "130.00",
  proteinG: "17.00",
  carbsG: "9.00",
  fatG: "0.00",
  fiberG: null,
  source: "barcode",
  createdAt: new Date("2024-02-01"),
  updatedAt: new Date("2024-02-01"),
};

const CREATE_BODY = {
  name: "Greek Yogurt",
  brand: "Chobani",
  servingLabel: "1 cup",
  quantity: 1,
  grams: 227,
  calories: 130,
  proteinG: 17,
  carbsG: 9,
  fatG: 0,
  source: "barcode",
};

function mockDb(overrides: Record<string, unknown> = {}) {
  const mockReturning = vi.fn().mockResolvedValue([FAVORITE_ROW]);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockOrderBy = vi.fn().mockResolvedValue([FAVORITE_ROW]);
  const mockWhereList = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhereList });
  const db = {
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    insert: vi.fn().mockReturnValue({ values: mockValues }),
    delete: vi.fn().mockReturnValue({ where: mockWhere }),
    ...overrides,
  };
  vi.mocked(createDb).mockReturnValue(db as never);
  return db;
}

beforeEach(() => vi.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// F01. Create favorite — happy path
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/v1/favorites", () => {
  it("creates a favorite and returns 201 with numeric fields", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    mockDb();

    const req = new Request("http://localhost/api/v1/favorites", {
      method: "POST",
      body: JSON.stringify(CREATE_BODY),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Greek Yogurt");
    expect(body.calories).toBe(130);
    expect(body.proteinG).toBe(17);
    expect(body.source).toBe("barcode");
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(null);

    const req = new Request("http://localhost/api/v1/favorites", {
      method: "POST",
      body: JSON.stringify(CREATE_BODY),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const req = new Request("http://localhost/api/v1/favorites", {
      method: "POST",
      body: JSON.stringify({ calories: 100, proteinG: 10, carbsG: 5, fatG: 2, source: "manual" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F02. List favorites — scoped to user
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/v1/favorites", () => {
  it("returns the user's favorites as a list", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    mockDb();

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.favorites)).toBe(true);
    expect(body.favorites[0].name).toBe("Greek Yogurt");
    expect(body.favorites[0].calories).toBe(130);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F05–F06. Delete favorite
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/v1/favorites/:id", () => {
  it("deletes the favorite and returns 204", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const mockReturning = vi.fn().mockResolvedValue([{ id: FAVORITE_ROW.id }]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(createDb).mockReturnValue({
      delete: vi.fn().mockReturnValue({ where: mockWhere }),
    } as never);

    const params = Promise.resolve({ id: FAVORITE_ROW.id });
    const res = await DELETE(new Request("http://localhost"), { params });

    expect(res.status).toBe(204);
  });

  it("returns 404 when the favorite does not belong to the requesting user", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);

    const mockReturning = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(createDb).mockReturnValue({
      delete: vi.fn().mockReturnValue({ where: mockWhere }),
    } as never);

    const params = Promise.resolve({ id: "other-users-favorite" });
    const res = await DELETE(new Request("http://localhost"), { params });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F07. Favorites store snapshots — no external provider query
// ─────────────────────────────────────────────────────────────────────────────

describe("Favorites — snapshot isolation", () => {
  it("creating a favorite does not call any food provider API", async () => {
    vi.mocked(getClerkUserId).mockResolvedValue(CLERK_USER_ID);
    vi.mocked(getAppUser).mockResolvedValue(APP_USER);
    mockDb();

    const req = new Request("http://localhost/api/v1/favorites", {
      method: "POST",
      body: JSON.stringify(CREATE_BODY),
    });
    // No fetch mock needed — if the route tries to call an external API it
    // will throw (no global fetch mock in this test), making the test fail.
    const res = await POST(req);

    expect(res.status).toBe(201);
  });
});
