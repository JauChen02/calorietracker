CREATE TABLE "custom_foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"serving_label" text,
	"default_quantity" numeric(10,2) NOT NULL DEFAULT '1',
	"default_grams" numeric(10,2),
	"calories" numeric(10,2) NOT NULL,
	"protein_g" numeric(10,2) NOT NULL DEFAULT '0',
	"carbs_g" numeric(10,2) NOT NULL DEFAULT '0',
	"fat_g" numeric(10,2) NOT NULL DEFAULT '0',
	"fiber_g" numeric(10,2),
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "custom_foods" ADD CONSTRAINT "custom_foods_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "custom_foods_user_id_idx" ON "custom_foods" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "custom_foods_user_name_idx" ON "custom_foods" USING btree ("user_id","name");
