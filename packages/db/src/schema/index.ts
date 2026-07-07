import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Key-value store for application-level metadata.
 * Used to verify schema connectivity and store runtime config flags.
 */
export const appMetadata = pgTable("app_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AppMetadata = typeof appMetadata.$inferSelect;
export type NewAppMetadata = typeof appMetadata.$inferInsert;

export const appUsers = pgTable("app_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AppUser = typeof appUsers.$inferSelect;
export type NewAppUser = typeof appUsers.$inferInsert;

export const nutritionTargets = pgTable(
  "nutrition_targets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    calorieTarget: integer("calorie_target"),
    proteinTargetG: numeric("protein_target_g", { precision: 10, scale: 2 }),
    carbsTargetG: numeric("carbs_target_g", { precision: 10, scale: 2 }),
    fatTargetG: numeric("fat_target_g", { precision: 10, scale: 2 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [unique("nutrition_targets_user_id_unique").on(t.userId)],
);

export type NutritionTargets = typeof nutritionTargets.$inferSelect;
export type NewNutritionTargets = typeof nutritionTargets.$inferInsert;

export const foodEntries = pgTable(
  "food_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    clientMutationId: uuid("client_mutation_id").notNull(),
    mealType: text("meal_type").notNull(),
    foodName: text("food_name").notNull(),
    brand: text("brand"),
    servingLabel: text("serving_label"),
    quantity: numeric("quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
    grams: numeric("grams", { precision: 10, scale: 2 }),
    calories: numeric("calories", { precision: 10, scale: 2 }).notNull(),
    proteinG: numeric("protein_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    carbsG: numeric("carbs_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    fatG: numeric("fat_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    fiberG: numeric("fiber_g", { precision: 10, scale: 2 }),
    source: text("source").notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
    localDate: date("local_date").notNull(),
    timezone: text("timezone").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("food_entries_user_mutation_unique").on(
      t.userId,
      t.clientMutationId,
    ),
    check(
      "food_entries_meal_type_check",
      sql`${t.mealType} IN ('breakfast', 'lunch', 'dinner', 'snack')`,
    ),
    check(
      "food_entries_source_check",
      sql`${t.source} IN ('manual', 'custom_food', 'catalog', 'barcode', 'saved_meal', 'favorite')`,
    ),
    index("food_entries_user_local_date_idx").on(t.userId, t.localDate),
    index("food_entries_user_logged_at_idx").on(t.userId, t.loggedAt),
    index("food_entries_user_updated_at_idx").on(t.userId, t.updatedAt),
  ],
);

export type FoodEntry = typeof foodEntries.$inferSelect;
export type NewFoodEntry = typeof foodEntries.$inferInsert;

export const customFoods = pgTable(
  "custom_foods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    servingLabel: text("serving_label"),
    defaultQuantity: numeric("default_quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
    defaultGrams: numeric("default_grams", { precision: 10, scale: 2 }),
    calories: numeric("calories", { precision: 10, scale: 2 }).notNull(),
    proteinG: numeric("protein_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    carbsG: numeric("carbs_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    fatG: numeric("fat_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    fiberG: numeric("fiber_g", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("custom_foods_user_id_idx").on(t.userId),
    index("custom_foods_user_name_idx").on(t.userId, t.name),
  ],
);

export type CustomFood = typeof customFoods.$inferSelect;
export type NewCustomFood = typeof customFoods.$inferInsert;

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    servingLabel: text("serving_label"),
    quantity: numeric("quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
    grams: numeric("grams", { precision: 10, scale: 2 }),
    calories: numeric("calories", { precision: 10, scale: 2 }).notNull(),
    proteinG: numeric("protein_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    carbsG: numeric("carbs_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    fatG: numeric("fat_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    fiberG: numeric("fiber_g", { precision: 10, scale: 2 }),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("favorites_user_id_idx").on(t.userId),
  ],
);

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;

export const savedMeals = pgTable(
  "saved_meals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    defaultMealType: text("default_meal_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("saved_meals_user_id_idx").on(t.userId),
  ],
);

export type SavedMeal = typeof savedMeals.$inferSelect;
export type NewSavedMeal = typeof savedMeals.$inferInsert;

export const savedMealItems = pgTable(
  "saved_meal_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    savedMealId: uuid("saved_meal_id")
      .notNull()
      .references(() => savedMeals.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    foodName: text("food_name").notNull(),
    brand: text("brand"),
    servingLabel: text("serving_label"),
    quantity: numeric("quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
    grams: numeric("grams", { precision: 10, scale: 2 }),
    calories: numeric("calories", { precision: 10, scale: 2 }).notNull(),
    proteinG: numeric("protein_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    carbsG: numeric("carbs_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    fatG: numeric("fat_g", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    fiberG: numeric("fiber_g", { precision: 10, scale: 2 }),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("saved_meal_items_saved_meal_id_idx").on(t.savedMealId),
  ],
);

export type SavedMealItem = typeof savedMealItems.$inferSelect;
export type NewSavedMealItem = typeof savedMealItems.$inferInsert;
