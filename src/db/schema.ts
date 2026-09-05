import { relations, sql } from 'drizzle-orm';
import { pgTable, text, timestamp, numeric, serial, uniqueIndex, index, primaryKey } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('STOREKEEPER').notNull(), // ADMIN, STOREKEEPER
  status: text('status').default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_users_org').on(t.organizationId)
]);

export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_warehouses_org').on(t.organizationId)
]);

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
}, (t) => [
  index('idx_categories_org').on(t.organizationId)
]);

export const units = pgTable('units', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  symbol: text('symbol'), // e.g. kg, m, pcs
}, (t) => [
  index('idx_units_org').on(t.organizationId)
]);

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  categoryId: text('category_id').references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  minStockLevel: numeric('min_stock_level').default('0'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_products_org').on(t.organizationId)
]);

export const productVariants = pgTable('product_variants', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  productId: text('product_id').references(() => products.id).notNull(),
  unitId: text('unit_id').references(() => units.id),
  name: text('name').notNull(),
  sku: text('sku'),
  barcode: text('barcode'),
  attributes: text('attributes'), // JSON stringified for flexible properties (color, size)
}, (t) => [
  index('idx_variants_org').on(t.organizationId),
  index('idx_variants_product').on(t.productId)
]);

export const suppliers = pgTable('suppliers', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_suppliers_org').on(t.organizationId)
]);

export const purchases = pgTable('purchases', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  supplierId: text('supplier_id').references(() => suppliers.id).notNull(),
  warehouseId: text('warehouse_id').references(() => warehouses.id).notNull(),
  invoiceNumber: text('invoice_number'),
  status: text('status').notNull().default('DRAFT'), // DRAFT, CONFIRMED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
  totalAmount: numeric('total_amount').notNull().default('0'),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_purchases_org').on(t.organizationId)
]);

export const purchaseItems = pgTable('purchase_items', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  purchaseId: text('purchase_id').references(() => purchases.id).notNull(),
  variantId: text('variant_id').references(() => productVariants.id).notNull(),
  quantity: numeric('quantity').notNull(),
  receivedQuantity: numeric('received_quantity').notNull().default('0'),
  unitCost: numeric('unit_cost').notNull(),
  totalCost: numeric('total_cost').notNull(),
}, (t) => [
  index('idx_purchase_items_org').on(t.organizationId),
  index('idx_purchase_items_purchase').on(t.purchaseId)
]);

export const purchaseReceipts = pgTable('purchase_receipts', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  purchaseId: text('purchase_id').references(() => purchases.id).notNull(),
  warehouseId: text('warehouse_id').references(() => warehouses.id).notNull(),
  receiptNumber: text('receipt_number'),
  date: timestamp('date').notNull(),
  status: text('status').notNull().default('POSTED'), // POSTED, CANCELLED
  receivedBy: text('received_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_purchase_receipts_org').on(t.organizationId)
]);

export const purchaseReceiptItems = pgTable('purchase_receipt_items', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  receiptId: text('receipt_id').references(() => purchaseReceipts.id).notNull(),
  purchaseItemId: text('purchase_item_id').references(() => purchaseItems.id).notNull(),
  variantId: text('variant_id').references(() => productVariants.id).notNull(),
  quantity: numeric('quantity').notNull(),
}, (t) => [
  index('idx_purchase_receipt_items_org').on(t.organizationId),
  index('idx_purchase_receipt_items_receipt').on(t.receiptId)
]);

export const supplierLedger = pgTable('supplier_ledger', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  supplierId: text('supplier_id').references(() => suppliers.id).notNull(),
  type: text('type').notNull(), // PURCHASE, PAYMENT, DEBIT_NOTE, CREDIT_NOTE
  referenceId: text('reference_id').notNull(), // purchaseId or paymentId
  amount: numeric('amount').notNull(), // positive means we owe supplier (credit), negative means we paid (debit)
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_supplier_ledger_org').on(t.organizationId),
  index('idx_supplier_ledger_supplier').on(t.supplierId)
]);

export const supplierPayments = pgTable('supplier_payments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  supplierId: text('supplier_id').references(() => suppliers.id).notNull(),
  amount: numeric('amount').notNull(),
  date: timestamp('date').notNull(),
  referenceId: text('reference_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_supplier_payments_org').on(t.organizationId)
]);

export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_departments_org').on(t.organizationId)
]);

export const materialIssues = pgTable('material_issues', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  departmentId: text('department_id').references(() => departments.id).notNull(),
  warehouseId: text('warehouse_id').references(() => warehouses.id).notNull(),
  issueNumber: text('issue_number'),
  status: text('status').notNull().default('DRAFT'), // DRAFT, POSTED, CANCELLED
  issuedBy: text('issued_by').notNull(), // User/Employee responsible
  date: timestamp('date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_material_issues_org').on(t.organizationId)
]);

export const materialIssueItems = pgTable('material_issue_items', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  issueId: text('issue_id').references(() => materialIssues.id).notNull(),
  variantId: text('variant_id').references(() => productVariants.id).notNull(),
  quantity: numeric('quantity').notNull(),
  returnedQuantity: numeric('returned_quantity').notNull().default('0'),
  exchangedQuantity: numeric('exchanged_quantity').notNull().default('0'),
}, (t) => [
  index('idx_material_issue_items_org').on(t.organizationId),
  index('idx_material_issue_items_issue').on(t.issueId)
]);

export const stockMovements = pgTable('stock_movements', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  operationId: text('operation_id').unique().notNull(),
  warehouseId: text('warehouse_id').references(() => warehouses.id).notNull(),
  variantId: text('variant_id').references(() => productVariants.id).notNull(),
  type: text('type').notNull(), 
  quantity: numeric('quantity').notNull(),
  referenceId: text('reference_id'),
  userId: text('user_id').references(() => users.id),
  date: timestamp('date').notNull().defaultNow(),
  notes: text('notes'),
}, (t) => [
  index('idx_movements_org').on(t.organizationId),
  index('idx_movements_warehouse_variant').on(t.warehouseId, t.variantId),
  index('idx_movements_operation').on(t.operationId)
]);

export const stockBalances = pgTable('stock_balances', {
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  warehouseId: text('warehouse_id').references(() => warehouses.id).notNull(),
  variantId: text('variant_id').references(() => productVariants.id).notNull(),
  quantity: numeric('quantity').notNull().default('0'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.warehouseId, t.variantId] }),
  index('idx_balances_org').on(t.organizationId)
]);

export const syncOperations = pgTable('sync_operations', {
  id: text('id').primaryKey(), // operationId
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  deviceId: text('device_id'),
  userId: text('user_id'),
  entityType: text('entity_type').notNull(),
  operationType: text('operation_type').notNull(),
  payload: text('payload'),
  syncedAt: timestamp('synced_at').defaultNow(),
}, (t) => [
  index('idx_sync_org').on(t.organizationId)
]);

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id).notNull(),
  userId: text('user_id').notNull(),
  deviceId: text('device_id'),
  operationId: text('operation_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  beforeState: text('before_state'),
  afterState: text('after_state'),
}, (t) => [
  index('idx_audit_org').on(t.organizationId),
  index('idx_audit_entity').on(t.entityType, t.entityId)
]);

