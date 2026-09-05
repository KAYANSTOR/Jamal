CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text,
	"operation_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"before_state" text,
	"after_state" text
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"product_id" text NOT NULL,
	"unit_id" text,
	"name" text NOT NULL,
	"sku" text,
	"barcode" text,
	"attributes" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"description" text,
	"min_stock_level" numeric DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"purchase_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" numeric NOT NULL,
	"received_quantity" numeric DEFAULT '0' NOT NULL,
	"unit_cost" numeric NOT NULL,
	"total_cost" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_receipt_items" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"receipt_id" text NOT NULL,
	"purchase_item_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"purchase_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"receipt_number" text,
	"date" timestamp NOT NULL,
	"status" text DEFAULT 'POSTED' NOT NULL,
	"received_by" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"invoice_number" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"total_amount" numeric DEFAULT '0' NOT NULL,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"organization_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"quantity" numeric DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_balances_warehouse_id_variant_id_pk" PRIMARY KEY("warehouse_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"warehouse_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"type" text NOT NULL,
	"quantity" numeric NOT NULL,
	"reference_id" text,
	"user_id" text,
	"date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "stock_movements_operation_id_unique" UNIQUE("operation_id")
);
--> statement-breakpoint
CREATE TABLE "supplier_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"type" text NOT NULL,
	"reference_id" text NOT NULL,
	"amount" numeric NOT NULL,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"amount" numeric NOT NULL,
	"date" timestamp NOT NULL,
	"reference_id" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"device_id" text,
	"user_id" text,
	"entity_type" text NOT NULL,
	"operation_type" text NOT NULL,
	"payload" text,
	"synced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text DEFAULT 'STOREKEEPER' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_receipt_id_purchase_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_item_id_purchase_items_id_fk" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."purchase_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_ledger" ADD CONSTRAINT "supplier_ledger_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_ledger" ADD CONSTRAINT "supplier_ledger_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_org" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_categories_org" ON "categories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_variants_org" ON "product_variants" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_variants_product" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_products_org" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_items_org" ON "purchase_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_items_purchase" ON "purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_receipt_items_org" ON "purchase_receipt_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_receipt_items_receipt" ON "purchase_receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_receipts_org" ON "purchase_receipts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_purchases_org" ON "purchases" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_balances_org" ON "stock_balances" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_movements_org" ON "stock_movements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_movements_warehouse_variant" ON "stock_movements" USING btree ("warehouse_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_movements_operation" ON "stock_movements" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_ledger_org" ON "supplier_ledger" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_ledger_supplier" ON "supplier_ledger" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_payments_org" ON "supplier_payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_suppliers_org" ON "suppliers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_sync_org" ON "sync_operations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_units_org" ON "units" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_users_org" ON "users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_warehouses_org" ON "warehouses" USING btree ("organization_id");