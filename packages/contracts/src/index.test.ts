import { describe, it, expect } from "vitest";
import {
  ApiErrorSchema,
  HealthResponseSchema,
  MeResponseSchema,
  VersionResponseSchema,
  MealTypeSchema,
  FoodSourceSchema,
  FoodEntrySchema,
  CreateFoodEntrySchema,
  PatchFoodEntrySchema,
  DayResponseSchema,
  EntriesResponseSchema,
  NutritionTargetsSchema,
  TargetsResponseSchema,
  UpdateNutritionTargetsSchema,
} from "./index";

// ---------------------------------------------------------------------------
// ApiErrorSchema
// ---------------------------------------------------------------------------

describe("ApiErrorSchema", () => {
  it("accepts a valid error envelope", () => {
    const result = ApiErrorSchema.safeParse({
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing error.code", () => {
    const result = ApiErrorSchema.safeParse({
      error: { message: "oops" },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// HealthResponseSchema
// ---------------------------------------------------------------------------

describe("HealthResponseSchema", () => {
  it("accepts a fully-connected ok response", () => {
    const result = HealthResponseSchema.safeParse({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.0.1",
      environment: "development",
      database: { connected: true, latencyMs: 12 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a degraded response with a db error string", () => {
    const result = HealthResponseSchema.safeParse({
      status: "degraded",
      timestamp: new Date().toISOString(),
      version: "0.0.1",
      environment: "production",
      database: { connected: false, error: "DATABASE_URL is not configured" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status value", () => {
    const result = HealthResponseSchema.safeParse({
      status: "unknown",
      timestamp: new Date().toISOString(),
      version: "0.0.1",
      environment: "development",
      database: { connected: false },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing database field", () => {
    const result = HealthResponseSchema.safeParse({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.0.1",
      environment: "development",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// VersionResponseSchema
// ---------------------------------------------------------------------------

describe("VersionResponseSchema", () => {
  it("accepts a valid version response", () => {
    const result = VersionResponseSchema.safeParse({
      version: "0.0.1",
      apiVersion: "v1",
      environment: "staging",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing apiVersion", () => {
    const result = VersionResponseSchema.safeParse({
      version: "0.0.1",
      environment: "development",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MeResponseSchema
// ---------------------------------------------------------------------------

describe("MeResponseSchema", () => {
  it("accepts a valid me response with email", () => {
    const result = MeResponseSchema.safeParse({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      clerkUserId: "user_2abc123",
      email: "test@example.com",
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("accepts a me response with null email", () => {
    const result = MeResponseSchema.safeParse({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      clerkUserId: "user_2abc123",
      email: null,
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing userId", () => {
    const result = MeResponseSchema.safeParse({
      clerkUserId: "user_2abc123",
      email: null,
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid userId", () => {
    const result = MeResponseSchema.safeParse({
      userId: "not-a-uuid",
      clerkUserId: "user_2abc123",
      email: null,
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MealTypeSchema
// ---------------------------------------------------------------------------

describe("MealTypeSchema", () => {
  it.each(["breakfast", "lunch", "dinner", "snack"] as const)(
    "accepts %s",
    (value) => {
      expect(MealTypeSchema.safeParse(value).success).toBe(true);
    },
  );

  it("rejects an unknown meal type", () => {
    expect(MealTypeSchema.safeParse("brunch").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FoodSourceSchema
// ---------------------------------------------------------------------------

describe("FoodSourceSchema", () => {
  it.each([
    "manual",
    "custom_food",
    "catalog",
    "barcode",
    "saved_meal",
  ] as const)("accepts %s", (value) => {
    expect(FoodSourceSchema.safeParse(value).success).toBe(true);
  });

  it("rejects an unknown source", () => {
    expect(FoodSourceSchema.safeParse("unknown").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FoodEntrySchema
// ---------------------------------------------------------------------------

const validEntry = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  userId: "123e4567-e89b-12d3-a456-426614174001",
  clientMutationId: "123e4567-e89b-12d3-a456-426614174002",
  mealType: "breakfast",
  foodName: "Oatmeal",
  brand: null,
  servingLabel: "1 cup",
  quantity: 1,
  grams: 240,
  calories: 300,
  proteinG: 10,
  carbsG: 54,
  fatG: 6,
  fiberG: 4,
  source: "manual",
  loggedAt: new Date().toISOString(),
  localDate: "2024-01-15",
  timezone: "America/New_York",
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("FoodEntrySchema", () => {
  it("accepts a fully-populated valid entry", () => {
    expect(FoodEntrySchema.safeParse(validEntry).success).toBe(true);
  });

  it("accepts an entry with nullable optional fields as null", () => {
    const result = FoodEntrySchema.safeParse({
      ...validEntry,
      brand: null,
      grams: null,
      fiberG: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative calories", () => {
    expect(
      FoodEntrySchema.safeParse({ ...validEntry, calories: -1 }).success,
    ).toBe(false);
  });

  it("rejects an invalid localDate format", () => {
    expect(
      FoodEntrySchema.safeParse({ ...validEntry, localDate: "2024/01/15" })
        .success,
    ).toBe(false);
  });

  it("rejects an invalid mealType", () => {
    expect(
      FoodEntrySchema.safeParse({ ...validEntry, mealType: "elevenses" })
        .success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CreateFoodEntrySchema
// ---------------------------------------------------------------------------

const validCreate = {
  clientMutationId: "123e4567-e89b-12d3-a456-426614174002",
  mealType: "lunch",
  foodName: "Apple",
  calories: 95,
  source: "manual",
  loggedAt: new Date().toISOString(),
  localDate: "2024-01-15",
  timezone: "UTC",
};

describe("CreateFoodEntrySchema", () => {
  it("accepts a minimal valid create body", () => {
    expect(CreateFoodEntrySchema.safeParse(validCreate).success).toBe(true);
  });

  it("applies default quantity of 1", () => {
    const result = CreateFoodEntrySchema.safeParse(validCreate);
    expect(result.success && result.data.quantity).toBe(1);
  });

  it("rejects negative calories", () => {
    expect(
      CreateFoodEntrySchema.safeParse({ ...validCreate, calories: -1 }).success,
    ).toBe(false);
  });

  it("rejects an empty foodName", () => {
    expect(
      CreateFoodEntrySchema.safeParse({ ...validCreate, foodName: "  " })
        .success,
    ).toBe(false);
  });

  it("rejects a missing clientMutationId", () => {
    const { clientMutationId: _, ...rest } = validCreate;
    expect(CreateFoodEntrySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a non-uuid clientMutationId", () => {
    expect(
      CreateFoodEntrySchema.safeParse({
        ...validCreate,
        clientMutationId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PatchFoodEntrySchema
// ---------------------------------------------------------------------------

describe("PatchFoodEntrySchema", () => {
  it("accepts a single field patch", () => {
    expect(
      PatchFoodEntrySchema.safeParse({ foodName: "Banana" }).success,
    ).toBe(true);
  });

  it("accepts null brand to clear it", () => {
    expect(PatchFoodEntrySchema.safeParse({ brand: null }).success).toBe(true);
  });

  it("rejects a negative proteinG", () => {
    expect(
      PatchFoodEntrySchema.safeParse({ proteinG: -5 }).success,
    ).toBe(false);
  });

  it("rejects an empty patch object", () => {
    expect(PatchFoodEntrySchema.safeParse({}).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DayResponseSchema
// ---------------------------------------------------------------------------

describe("DayResponseSchema", () => {
  it("accepts a valid day response with entries", () => {
    const result = DayResponseSchema.safeParse({
      date: "2024-01-15",
      entries: [validEntry],
      totals: {
        calories: 300,
        proteinG: 10,
        carbsG: 54,
        fatG: 6,
        fiberG: 4,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a day response with no entries", () => {
    const result = DayResponseSchema.safeParse({
      date: "2024-01-15",
      entries: [],
      totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid date format", () => {
    expect(
      DayResponseSchema.safeParse({
        date: "Jan 15 2024",
        entries: [],
        totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
      }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EntriesResponseSchema
// ---------------------------------------------------------------------------

describe("EntriesResponseSchema", () => {
  it("accepts a valid entries response", () => {
    const result = EntriesResponseSchema.safeParse({
      from: "2024-01-01",
      to: "2024-01-07",
      entries: [],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NutritionTargetsSchema
// ---------------------------------------------------------------------------

describe("NutritionTargetsSchema", () => {
  it("accepts targets with all fields set", () => {
    const result = NutritionTargetsSchema.safeParse({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      calorieTarget: 2000,
      proteinTargetG: 150,
      carbsTargetG: 200,
      fatTargetG: 65,
      updatedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("accepts targets with all macro fields null", () => {
    const result = NutritionTargetsSchema.safeParse({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      calorieTarget: null,
      proteinTargetG: null,
      carbsTargetG: null,
      fatTargetG: null,
      updatedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative calorie target", () => {
    expect(
      NutritionTargetsSchema.safeParse({
        userId: "123e4567-e89b-12d3-a456-426614174000",
        calorieTarget: -500,
        proteinTargetG: null,
        carbsTargetG: null,
        fatTargetG: null,
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TargetsResponseSchema
// ---------------------------------------------------------------------------

describe("TargetsResponseSchema", () => {
  it("accepts null targets (not yet configured)", () => {
    expect(TargetsResponseSchema.safeParse({ targets: null }).success).toBe(
      true,
    );
  });

  it("accepts a populated targets object", () => {
    expect(
      TargetsResponseSchema.safeParse({
        targets: {
          userId: "123e4567-e89b-12d3-a456-426614174000",
          calorieTarget: 2000,
          proteinTargetG: null,
          carbsTargetG: null,
          fatTargetG: null,
          updatedAt: new Date().toISOString(),
        },
      }).success,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UpdateNutritionTargetsSchema
// ---------------------------------------------------------------------------

describe("UpdateNutritionTargetsSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(UpdateNutritionTargetsSchema.safeParse({}).success).toBe(true);
  });

  it("accepts setting calorie target to null to clear it", () => {
    expect(
      UpdateNutritionTargetsSchema.safeParse({ calorieTarget: null }).success,
    ).toBe(true);
  });

  it("rejects a zero calorie target", () => {
    expect(
      UpdateNutritionTargetsSchema.safeParse({ calorieTarget: 0 }).success,
    ).toBe(false);
  });

  it("rejects a negative proteinTargetG", () => {
    expect(
      UpdateNutritionTargetsSchema.safeParse({ proteinTargetG: -10 }).success,
    ).toBe(false);
  });
});
