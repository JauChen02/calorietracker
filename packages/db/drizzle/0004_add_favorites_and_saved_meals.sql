-- Extend food_entries source check to include 'favorite'
ALTER TABLE "food_entries" DROP CONSTRAINT "food_entries_source_check";
--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_source_check" CHECK (source IN ('manual', 'custom_food', 'catalog', 'barcode', 'saved_meal', 'favorite'));
--> statement-breakpoint

-- Nutrition snapshots the user wants to re-log quickly
CREATE TABLE "favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"serving_label" text,
	"quantity" numeric(10,2) NOT NULL DEFAULT '1',
	"grams" numeric(10,2),
	"calories" numeric(10,2) NOT NULL,
	"protein_g" numeric(10,2) NOT NULL DEFAULT '0',
	"carbs_g" numeric(10,2) NOT NULL DEFAULT '0',
	"fat_g" numeric(10,2) NOT NULL DEFAULT '0',
	"fiber_g" numeric(10,2),
	"source" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "favorites_user_id_idx" ON "favorites" USING btree ("user_id");
--> statement-breakpoint

-- Named collections of foods for one-tap multi-item logging
CREATE TABLE "saved_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_meal_type" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "saved_meals" ADD CONSTRAINT "saved_meals_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "saved_meals_user_id_idx" ON "saved_meals" USING btree ("user_id");
--> statement-breakpoint

-- Nutrition snapshots that belong to a saved meal (order preserved via sort_order)
CREATE TABLE "saved_meal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saved_meal_id" uuid NOT NULL,
	"sort_order" integer NOT NULL DEFAULT 0,
	"food_name" text NOT NULL,
	"brand" text,
	"serving_label" text,
	"quantity" numeric(10,2) NOT NULL DEFAULT '1',
	"grams" numeric(10,2),
	"calories" numeric(10,2) NOT NULL,
	"protein_g" numeric(10,2) NOT NULL DEFAULT '0',
	"carbs_g" numeric(10,2) NOT NULL DEFAULT '0',
	"fat_g" numeric(10,2) NOT NULL DEFAULT '0',
	"fiber_g" numeric(10,2),
	"source" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "saved_meal_items" ADD CONSTRAINT "saved_meal_items_saved_meal_id_saved_meals_id_fk" FOREIGN KEY ("saved_meal_id") REFERENCES "public"."saved_meals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "saved_meal_items_saved_meal_id_idx" ON "saved_meal_items" USING btree ("saved_meal_id");
