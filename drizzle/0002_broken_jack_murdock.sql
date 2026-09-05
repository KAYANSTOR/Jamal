ALTER TABLE "material_issues" ADD COLUMN "settled_at" timestamp;--> statement-breakpoint
ALTER TABLE "material_issues" ADD COLUMN "settled_by" text;--> statement-breakpoint
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_settled_by_users_id_fk" FOREIGN KEY ("settled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;