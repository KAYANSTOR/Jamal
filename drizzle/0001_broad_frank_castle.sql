CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "material_issue_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"issue_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" numeric NOT NULL,
	"returned_quantity" numeric DEFAULT '0' NOT NULL,
	"exchanged_quantity" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"department_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"issue_number" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"issued_by" text NOT NULL,
	"date" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issue_items" ADD CONSTRAINT "material_issue_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issue_items" ADD CONSTRAINT "material_issue_items_issue_id_material_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."material_issues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issue_items" ADD CONSTRAINT "material_issue_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_issues" ADD CONSTRAINT "material_issues_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_departments_org" ON "departments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_material_issue_items_org" ON "material_issue_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_material_issue_items_issue" ON "material_issue_items" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "idx_material_issues_org" ON "material_issues" USING btree ("organization_id");