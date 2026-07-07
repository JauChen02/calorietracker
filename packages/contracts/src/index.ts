import { z } from "zod";

// ---------------------------------------------------------------------------
// Standard error envelope
// ---------------------------------------------------------------------------

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  timestamp: z.string().datetime(),
  version: z.string(),
  environment: z.string(),
  database: z.object({
    connected: z.boolean(),
    latencyMs: z.number().optional(),
    error: z.string().optional(),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ---------------------------------------------------------------------------
// GET /api/v1/version
// ---------------------------------------------------------------------------

export const VersionResponseSchema = z.object({
  version: z.string(),
  apiVersion: z.string(),
  environment: z.string(),
});

export type VersionResponse = z.infer<typeof VersionResponseSchema>;

// ---------------------------------------------------------------------------
// GET /api/v1/me
// ---------------------------------------------------------------------------

export const MeResponseSchema = z.object({
  userId: z.string().uuid(),
  clerkUserId: z.string(),
  email: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;

// ---------------------------------------------------------------------------
// Food entries — shared enums
// ---------------------------------------------------------------------------

export const MealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export type MealType = z.infer<typeof MealTypeSchema>;

export const FoodSourceSchema = z.enum([
  "manual",
  "custom_food",
  "catalog",
  "barcode",
  "saved_meal",
  "favorite",
]);

export type FoodSource = z.infer<typeof FoodSourceSchema>;

// ---------------------------------------------------------------------------
// Food entries — response shape
// ---------------------------------------------------------------------------

export const FoodEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  clientMutationId: z.string().uuid(),
  mealType: MealTypeSchema,
  foodName: z.string(),
  brand: z.string().nullable(),
  servingLabel: z.string().nullable(),
  quantity: z.number().positive(),
  grams: z.number().nonnegative().nullable(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().nullable(),
  source: FoodSourceSchema,
  loggedAt: z.string().datetime(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  timezone: z.string(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FoodEntry = z.infer<typeof FoodEntrySchema>;

// ---------------------------------------------------------------------------
// POST /api/v1/entries — create request
// ---------------------------------------------------------------------------

export const CreateFoodEntrySchema = z.object({
  clientMutationId: z.string().uuid(),
  mealType: MealTypeSchema,
  foodName: z.string().trim().min(1, "Food name is required"),
  brand: z.string().trim().nullable().optional(),
  servingLabel: z.string().trim().nullable().optional(),
  quantity: z.number().positive().default(1),
  grams: z.number().nonnegative().nullable().optional(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative().default(0),
  carbsG: z.number().nonnegative().default(0),
  fatG: z.number().nonnegative().default(0),
  fiberG: z.number().nonnegative().nullable().optional(),
  source: FoodSourceSchema,
  loggedAt: z.string().datetime(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  timezone: z.string().min(1),
});

export type CreateFoodEntry = z.infer<typeof CreateFoodEntrySchema>;

// ---------------------------------------------------------------------------
// PATCH /api/v1/entries/:id — patch request
// ---------------------------------------------------------------------------

export const PatchFoodEntrySchema = z
  .object({
    mealType: MealTypeSchema.optional(),
    foodName: z.string().trim().min(1).optional(),
    brand: z.string().trim().nullable().optional(),
    servingLabel: z.string().trim().nullable().optional(),
    quantity: z.number().positive().optional(),
    grams: z.number().nonnegative().nullable().optional(),
    calories: z.number().nonnegative().optional(),
    proteinG: z.number().nonnegative().optional(),
    carbsG: z.number().nonnegative().optional(),
    fatG: z.number().nonnegative().optional(),
    fiberG: z.number().nonnegative().nullable().optional(),
    source: FoodSourceSchema.optional(),
    loggedAt: z.string().datetime().optional(),
    localDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
      .optional(),
    timezone: z.string().min(1).optional(),
    baseVersion: z.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type PatchFoodEntry = z.infer<typeof PatchFoodEntrySchema>;

// ---------------------------------------------------------------------------
// PATCH /api/v1/entries/:id — version conflict response (409)
// ---------------------------------------------------------------------------

export const VersionConflictSchema = z.object({
  error: z.object({ code: z.literal("VERSION_CONFLICT"), message: z.string() }),
  current: FoodEntrySchema,
});

export type VersionConflict = z.infer<typeof VersionConflictSchema>;

// ---------------------------------------------------------------------------
// GET /api/v1/day — daily summary
// ---------------------------------------------------------------------------

export const MacroTotalsSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  fiberG: z.number(),
});

export type MacroTotals = z.infer<typeof MacroTotalsSchema>;

export const DayResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  entries: z.array(FoodEntrySchema),
  totals: MacroTotalsSchema,
});

export type DayResponse = z.infer<typeof DayResponseSchema>;

// ---------------------------------------------------------------------------
// GET /api/v1/entries — entries list
// ---------------------------------------------------------------------------

export const EntriesResponseSchema = z.object({
  entries: z.array(FoodEntrySchema),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

export type EntriesResponse = z.infer<typeof EntriesResponseSchema>;

// ---------------------------------------------------------------------------
// GET /api/v1/targets/current + PUT /api/v1/targets/current
// ---------------------------------------------------------------------------

export const NutritionTargetsSchema = z.object({
  userId: z.string().uuid(),
  calorieTarget: z.number().int().positive().nullable(),
  proteinTargetG: z.number().nonnegative().nullable(),
  carbsTargetG: z.number().nonnegative().nullable(),
  fatTargetG: z.number().nonnegative().nullable(),
  updatedAt: z.string().datetime(),
});

export type NutritionTargets = z.infer<typeof NutritionTargetsSchema>;

export const TargetsResponseSchema = z.object({
  targets: NutritionTargetsSchema.nullable(),
});

export type TargetsResponse = z.infer<typeof TargetsResponseSchema>;

export const UpdateNutritionTargetsSchema = z.object({
  calorieTarget: z.number().int().positive().nullable().optional(),
  proteinTargetG: z.number().nonnegative().nullable().optional(),
  carbsTargetG: z.number().nonnegative().nullable().optional(),
  fatTargetG: z.number().nonnegative().nullable().optional(),
});

export type UpdateNutritionTargets = z.infer<
  typeof UpdateNutritionTargetsSchema
>;

// ---------------------------------------------------------------------------
// Custom foods — user-saved food definitions
// ---------------------------------------------------------------------------

export const CustomFoodSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  brand: z.string().nullable(),
  servingLabel: z.string().nullable(),
  defaultQuantity: z.number().positive(),
  defaultGrams: z.number().nonnegative().nullable(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CustomFood = z.infer<typeof CustomFoodSchema>;

export const CreateCustomFoodSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  brand: z.string().trim().nullable().optional(),
  servingLabel: z.string().trim().nullable().optional(),
  defaultQuantity: z.number().positive().default(1),
  defaultGrams: z.number().nonnegative().nullable().optional(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative().default(0),
  carbsG: z.number().nonnegative().default(0),
  fatG: z.number().nonnegative().default(0),
  fiberG: z.number().nonnegative().nullable().optional(),
});

export type CreateCustomFood = z.infer<typeof CreateCustomFoodSchema>;

export const UpdateCustomFoodSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    brand: z.string().trim().nullable().optional(),
    servingLabel: z.string().trim().nullable().optional(),
    defaultQuantity: z.number().positive().optional(),
    defaultGrams: z.number().nonnegative().nullable().optional(),
    calories: z.number().nonnegative().optional(),
    proteinG: z.number().nonnegative().optional(),
    carbsG: z.number().nonnegative().optional(),
    fatG: z.number().nonnegative().optional(),
    fiberG: z.number().nonnegative().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateCustomFood = z.infer<typeof UpdateCustomFoodSchema>;

export const CustomFoodsResponseSchema = z.object({
  customFoods: z.array(CustomFoodSchema),
});

export type CustomFoodsResponse = z.infer<typeof CustomFoodsResponseSchema>;

// ---------------------------------------------------------------------------
// Recent foods — derived from food_entries history (no separate table)
// ---------------------------------------------------------------------------

export const RecentFoodSchema = z.object({
  foodEntryId: z.string().uuid(),
  foodName: z.string(),
  brand: z.string().nullable(),
  servingLabel: z.string().nullable(),
  quantity: z.number().positive(),
  grams: z.number().nonnegative().nullable(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().nullable(),
  lastMealType: MealTypeSchema,
  lastLoggedAt: z.string().datetime(),
});

export type RecentFood = z.infer<typeof RecentFoodSchema>;

export const RecentFoodsResponseSchema = z.object({
  recentFoods: z.array(RecentFoodSchema),
});

export type RecentFoodsResponse = z.infer<typeof RecentFoodsResponseSchema>;

// ---------------------------------------------------------------------------
// Food provider search — normalized, provider-neutral result shape
// ---------------------------------------------------------------------------

// Names of supported external food-data providers.
// "open_food_facts" is the only live provider in v1.
export const FoodProviderNameSchema = z.enum(["open_food_facts"]);
export type FoodProviderName = z.infer<typeof FoodProviderNameSchema>;

// Indicates how the nutrition data in a result was sourced/verified.
export const FoodVerificationStatusSchema = z.enum([
  "community", // crowd-sourced (e.g. Open Food Facts)
  "official",  // government or authoritative source (e.g. USDA — future)
]);
export type FoodVerificationStatus = z.infer<typeof FoodVerificationStatusSchema>;

// A single serving-size option returned with a food search result.
// At least one option (per 100 g) is always present; additional options
// (e.g. "1 serving") are included when the provider supplies serving data.
export const FoodServingOptionSchema = z.object({
  label: z.string(),                          // "100 g", "1 serving (30 g)"
  quantity: z.number().positive(),            // numeric magnitude for the label
  grams: z.number().nonnegative().nullable(), // weight in grams, null when unknown
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().nullable(),
});
export type FoodServingOption = z.infer<typeof FoodServingOptionSchema>;

// Normalized food result returned by all provider adapters.
// Top-level nutrition fields (calories, macros) match servingOptions[0].
export const FoodSearchResultSchema = z.object({
  provider: FoodProviderNameSchema,
  providerFoodId: z.string(),        // barcode for OFF; varies by future provider
  name: z.string(),
  brand: z.string().nullable(),
  barcode: z.string().nullable(),
  servingOptions: z.array(FoodServingOptionSchema).min(1),
  // Top-level nutrition = first serving option (per 100 g for OFF)
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().nullable(),
  sourceLabel: z.string(),           // human-readable provider name
  verificationStatus: FoodVerificationStatusSchema,
});
export type FoodSearchResult = z.infer<typeof FoodSearchResultSchema>;

// GET /api/v1/food-search response
export const FoodSearchResponseSchema = z.object({
  results: z.array(FoodSearchResultSchema),
  provider: z.string(),
});
export type FoodSearchResponse = z.infer<typeof FoodSearchResponseSchema>;

// GET /api/v1/food-lookup/:provider/:providerFoodId response
// GET /api/v1/barcode/:barcode response
export const FoodLookupResponseSchema = z.object({
  result: FoodSearchResultSchema,
});
export type FoodLookupResponse = z.infer<typeof FoodLookupResponseSchema>;

// ---------------------------------------------------------------------------
// Favorites — nutrition snapshots the user wants to re-log quickly
// ---------------------------------------------------------------------------

export const FavoriteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  brand: z.string().nullable(),
  servingLabel: z.string().nullable(),
  quantity: z.number().positive(),
  grams: z.number().nonnegative().nullable(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().nullable(),
  source: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Favorite = z.infer<typeof FavoriteSchema>;

export const CreateFavoriteSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  brand: z.string().trim().nullable().optional(),
  servingLabel: z.string().trim().nullable().optional(),
  quantity: z.number().positive().default(1),
  grams: z.number().nonnegative().nullable().optional(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative().default(0),
  carbsG: z.number().nonnegative().default(0),
  fatG: z.number().nonnegative().default(0),
  fiberG: z.number().nonnegative().nullable().optional(),
  source: z.string().min(1),
});

export type CreateFavorite = z.infer<typeof CreateFavoriteSchema>;

export const FavoritesResponseSchema = z.object({
  favorites: z.array(FavoriteSchema),
});

export type FavoritesResponse = z.infer<typeof FavoritesResponseSchema>;

// ---------------------------------------------------------------------------
// Saved meals — named collections for one-tap multi-item logging
// ---------------------------------------------------------------------------

export const SavedMealItemSchema = z.object({
  id: z.string().uuid(),
  savedMealId: z.string().uuid(),
  sortOrder: z.number().int(),
  foodName: z.string(),
  brand: z.string().nullable(),
  servingLabel: z.string().nullable(),
  quantity: z.number().positive(),
  grams: z.number().nonnegative().nullable(),
  calories: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
  fiberG: z.number().nonnegative().nullable(),
  source: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SavedMealItem = z.infer<typeof SavedMealItemSchema>;

export const SavedMealSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  defaultMealType: MealTypeSchema.nullable(),
  items: z.array(SavedMealItemSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SavedMeal = z.infer<typeof SavedMealSchema>;

export const CreateSavedMealSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  entryIds: z.array(z.string().uuid()).min(1, "At least one entry is required"),
  defaultMealType: MealTypeSchema.nullable().optional(),
});

export type CreateSavedMeal = z.infer<typeof CreateSavedMealSchema>;

export const UpdateSavedMealSchema = z.object({
  name: z.string().trim().min(1).optional(),
  defaultMealType: MealTypeSchema.nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, {
  message: "At least one field must be provided",
});

export type UpdateSavedMeal = z.infer<typeof UpdateSavedMealSchema>;

export const SavedMealsResponseSchema = z.object({
  savedMeals: z.array(SavedMealSchema),
});

export type SavedMealsResponse = z.infer<typeof SavedMealsResponseSchema>;

export const LogSavedMealSchema = z.object({
  mealType: MealTypeSchema,
  loggedAt: z.string().datetime(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  timezone: z.string().min(1),
  clientMutationIds: z.array(z.string().uuid()),
});

export type LogSavedMeal = z.infer<typeof LogSavedMealSchema>;

export const LogSavedMealResponseSchema = z.object({
  entries: z.array(FoodEntrySchema),
});

export type LogSavedMealResponse = z.infer<typeof LogSavedMealResponseSchema>;

// ---------------------------------------------------------------------------
// Nutrition utilities — re-exported so callers import from one location
// ---------------------------------------------------------------------------

export { sumEntries, macroPercent, dailyProgress } from "./nutrition";
export type { DailyProgress } from "./nutrition";
