CREATE TABLE "nutrition_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"calorie_target" integer,
	"protein_target_g" numeric(10,2),
	"carbs_target_g" numeric(10,2),
	"fat_target_g" numeric(10,2),
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "nutrition_targets_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "food_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_mutation_id" uuid NOT NULL,
	"meal_type" text NOT NULL,
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
	"logged_at" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL,
	"timezone" text NOT NULL,
	"version" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "food_entries_user_mutation_unique" UNIQUE("user_id","client_mutation_id"),
	CONSTRAINT "food_entries_meal_type_check" CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
	CONSTRAINT "food_entries_source_check" CHECK (source IN ('manual', 'custom_food', 'catalog', 'barcode', 'saved_meal'))
);

ALTER TABLE "nutrition_targets" ADD CONSTRAINT "nutrition_targets_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "food_entries_user_local_date_idx" ON "food_entries" ("user_id","local_date");
CREATE INDEX "food_entries_user_logged_at_idx" ON "food_entries" ("user_id","logged_at" DESC);
CREATE INDEX "food_entries_user_updated_at_idx" ON "food_entries" ("user_id","updated_at" DESC);
