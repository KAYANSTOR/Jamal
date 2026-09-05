# Phase 5: Advanced Material Issue Management

This document outlines the requirements for handling advanced operations on issued materials (مرتجع, استبدال, توفية). All operations must be strictly internal inventory movements, with no sales module involved.

## 1. Material Returns (مرتجع مواد)
- **Goal:** Return unused/remaining quantities back to the origin warehouse.
- **Rules:**
  - Must increase warehouse stock balance by the returned quantity.
  - Must strictly reference the original Material Issue ID (`issue_id`).
  - **Validation:** Cannot return a quantity greater than what was originally issued (or currently remaining/unreturned).

## 2. Material Exchange (استبدال مواد)
- **Goal:** Exchange an originally issued Variant for a different Variant.
- **Rules:**
  - Must be logged as a distinct, linked process (not just a generic return).
  - Must return the old Variant to stock and deduct the new Variant from stock simultaneously.

## 3. Fulfillment / Reconciliation (التوفية / التسوية)
- **Goal:** Complete or adjust quantities based on actual usage/needs.
- **Rules:**
  - Must reference the original Material Issue ID.
  - Must be fully traceable and auditable.

## 4. Architectural & Safety Constraints
- **Atomic Transactions:** All DB changes (stock balance + movement + audit) must occur within a single database transaction.
- **Idempotency:** Re-syncing the same offline operation must not duplicate stock movements.
- **Multi-Organization Safe:** All queries and updates must strictly enforce `organization_id` isolation.
- **Audit Logging:** Every action must be recorded in `audit_logs`.
- **Offline Sync:** Operations must flow through the Dexie outbox `syncEngine`.
- **No Direct UI Balance Edits:** The UI is strictly forbidden from directly updating `stock_balances`. It must only submit standard operation payloads.
AppendAppend-Only Movements:** Use official `stock_movements` (e.g., `INTERNAL_ISSUE_RETURN`, `INTERNAL_ISSUE_EXCHANGE`). Do NOT delete or modify historical stock movements.
AppendAppendAppend