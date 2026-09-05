import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, requirePermission, AuthRequest } from "./src/middleware/auth.ts";
import { db } from "./src/db/index.ts";
import { syncOperations, stockMovements, stockBalances, warehouses, products, productVariants, categories, units, auditLogs, suppliers, purchases, purchaseItems, supplierPayments, purchaseReceipts, purchaseReceiptItems, supplierLedger, departments, materialIssues, materialIssueItems } from "./src/db/schema.ts";
import { eq, sql, and } from "drizzle-orm";
import { Decimal } from "decimal.js";
import { v4 as uuidv4 } from "uuid";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/sync", requireAuth, async (req: AuthRequest, res) => {
    const { operations, deviceId } = req.body;
    const dbUser = req.dbUser!;
    const orgId = dbUser.organizationId;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const results = [];

    for (const op of operations) {
      try {
        await db.transaction(async (tx) => {
          // 1. Idempotency Check
          const existing = await tx.select().from(syncOperations)
            .where(and(eq(syncOperations.id, op.id), eq(syncOperations.organizationId, orgId)));
          
          if (existing.length > 0) {
            results.push({ id: op.id, status: 'already_synced' });
            return;
          }

          // 1.5. RBAC Permission Checks
          const userRole = dbUser.role; // 'ADMIN' or 'STOREKEEPER'
          const MASTER_DATA_ENTITIES = ['warehouses', 'categories', 'units', 'products', 'productVariants', 'suppliers', 'departments'];
          
          if (MASTER_DATA_ENTITIES.includes(op.entityType) && userRole !== 'ADMIN') {
            throw new Error(`Forbidden: Role ${userRole} cannot modify ${op.entityType}`);
          }
          if (op.entityType === 'CREATE_SUPPLIER_PAYMENT' && userRole !== 'ADMIN') {
            throw new Error(`Forbidden: Role ${userRole} cannot create supplier payments`);
          }

          // 2. Process Entity
          if (op.entityType === 'stock_movements') {
            const movement = op.payload;
            const requestedQty = new Decimal(movement.quantity);

            // Is it a reducing movement?
            if (['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT'].includes(movement.type)) {
              // Get current balance with lock
              const balanceRows = await tx.execute(sql`
                SELECT quantity FROM stock_balances 
                WHERE organization_id = ${orgId} 
                  AND warehouse_id = ${movement.warehouseId} 
                  AND variant_id = ${movement.variantId}
                FOR UPDATE
              `);

              const currentQty = balanceRows.rows.length > 0 ? new Decimal(balanceRows.rows[0].quantity as string) : new Decimal(0);
              
              if (currentQty.lessThan(requestedQty)) {
                throw new Error(`INSUFFICIENT_STOCK`); // Will trigger rollback
              }

              // Update balance (decrement)
              await tx.execute(sql`
                UPDATE stock_balances 
                SET quantity = (quantity::numeric - ${requestedQty.toNumber()}::numeric), updated_at = NOW()
                WHERE organization_id = ${orgId} 
                  AND warehouse_id = ${movement.warehouseId} 
                  AND variant_id = ${movement.variantId}
              `);
            } else {
              // Positive movement (UPSERT balance)
              await tx.execute(sql`
                INSERT INTO stock_balances (organization_id, warehouse_id, variant_id, quantity)
                VALUES (${orgId}, ${movement.warehouseId}, ${movement.variantId}, ${requestedQty.toNumber()}::numeric)
                ON CONFLICT (warehouse_id, variant_id)
                DO UPDATE SET quantity = (stock_balances.quantity::numeric + ${requestedQty.toNumber()}::numeric), updated_at = NOW()
              `);
            }

            // Insert Movement
            await tx.insert(stockMovements).values({
              id: movement.id,
              organizationId: orgId,
              operationId: op.id,
              warehouseId: movement.warehouseId,
              variantId: movement.variantId,
              type: movement.type,
              quantity: requestedQty.toString(),
              referenceId: movement.referenceId,
              userId: dbUser.id,
              date: new Date(movement.date),
              notes: movement.notes,
            });

            // Insert Audit Log
            await tx.insert(auditLogs).values({
              id: uuidv4(),
              organizationId: orgId,
              userId: dbUser.id,
              deviceId: deviceId || 'unknown',
              operationId: op.id,
              action: `SYNC_MOVEMENT_${movement.type}`,
              entityType: 'stock_movements',
              entityId: movement.id,
              afterState: JSON.stringify(movement)
            });
          } else if (op.entityType === 'CREATE_MATERIAL_ISSUE') {
            const issueData = op.payload;
            
            // 1. Validation
            const department = await tx.select().from(departments).where(and(eq(departments.id, issueData.departmentId), eq(departments.organizationId, orgId)));
            if (department.length === 0) throw new Error('Invalid department');

            const warehouse = await tx.select().from(warehouses).where(and(eq(warehouses.id, issueData.warehouseId), eq(warehouses.organizationId, orgId)));
            if (warehouse.length === 0) throw new Error('Invalid warehouse');

            if (!issueData.items || !Array.isArray(issueData.items) || issueData.items.length === 0) {
              throw new Error('Issue must have at least one item');
            }

            const itemsToInsert = [];
            const stockMovementsToInsert = [];

            for (const item of issueData.items) {
              const qty = new Decimal(item.quantity);
              if (qty.lte(0)) throw new Error('Quantity must be greater than zero');

              // Check current balance with FOR UPDATE
              const balanceRows = await tx.execute(sql`
                SELECT quantity FROM stock_balances 
                WHERE organization_id = ${orgId} 
                  AND warehouse_id = ${issueData.warehouseId} 
                  AND variant_id = ${item.variantId}
                FOR UPDATE
              `);

              const currentQty = balanceRows.rows.length > 0 ? new Decimal(balanceRows.rows[0].quantity as string) : new Decimal(0);
              
              if (currentQty.lessThan(qty)) {
                throw new Error(`INSUFFICIENT_STOCK`); // Will trigger rollback and CONFLICT status
              }

              itemsToInsert.push({
                id: item.id || uuidv4(),
                organizationId: orgId,
                issueId: issueData.id,
                variantId: item.variantId,
                quantity: qty.toString()
              });

              stockMovementsToInsert.push({
                variantId: item.variantId,
                quantity: qty,
                warehouseId: issueData.warehouseId
              });
            }

            // 2. Insert Header
            await tx.insert(materialIssues).values({
              id: issueData.id,
              organizationId: orgId,
              departmentId: issueData.departmentId,
              warehouseId: issueData.warehouseId,
              issueNumber: issueData.issueNumber || `ISS-${Date.now()}`,
              status: 'POSTED',
              issuedBy: issueData.issuedBy || dbUser.name || 'Unknown',
              date: new Date(issueData.date),
              notes: issueData.notes,
              createdAt: new Date(),
            });

            // 3. Insert Items
            for (const item of itemsToInsert) {
              await tx.insert(materialIssueItems).values(item);
            }

            // 4. Update Stock
            for (const sm of stockMovementsToInsert) {
                // Deduct stock balance
                await tx.execute(sql`
                  UPDATE stock_balances 
                  SET quantity = (quantity::numeric - ${sm.quantity.toNumber()}::numeric), updated_at = NOW()
                  WHERE organization_id = ${orgId} 
                    AND warehouse_id = ${sm.warehouseId} 
                    AND variant_id = ${sm.variantId}
                `);
                
                // Record movement
                await tx.insert(stockMovements).values({
                  id: uuidv4(),
                  organizationId: orgId,
                  operationId: uuidv4(),
                  warehouseId: sm.warehouseId,
                  variantId: sm.variantId,
                  type: 'INTERNAL_ISSUE',
                  quantity: sm.quantity.toString(),
                  referenceId: issueData.id,
                  userId: dbUser.id,
                  date: new Date(issueData.date)
                });
            }

            // 5. Audit
            await tx.insert(auditLogs).values({
              id: uuidv4(),
              organizationId: orgId,
              userId: dbUser.id,
              deviceId: deviceId || 'unknown',
              operationId: op.id,
              action: 'MATERIAL_ISSUE_POSTED',
              entityType: 'material_issues',
              entityId: issueData.id,
              afterState: JSON.stringify({ issueId: issueData.id, itemsCount: itemsToInsert.length })
            });

          } else if (op.entityType === 'CANCEL_MATERIAL_ISSUE') {
            const issueId = op.payload.id;
            
            // 1. Validation & Lock Issue (ensure it hasn't been cancelled already)
            const issueRows = await tx.execute(sql`
              SELECT status, warehouse_id FROM material_issues 
              WHERE id = ${issueId} AND organization_id = ${orgId}
              FOR UPDATE
            `);

            if (issueRows.rows.length === 0) throw new Error('Issue not found');
            const issueRecord = issueRows.rows[0];
            
            if (issueRecord.status === 'CANCELLED') {
              // Already cancelled, idempotent success
            } else if (issueRecord.status === 'SETTLED') {
              throw new Error('Cannot cancel a settled issue');
            } else {
              // 2. Revert stock balances and add reversing movements
              const items = await tx.select().from(materialIssueItems).where(and(eq(materialIssueItems.issueId, issueId), eq(materialIssueItems.organizationId, orgId)));
              
              for (const item of items) {
                // Add back to stock balance
                await tx.execute(sql`
                  UPDATE stock_balances 
                  SET quantity = (quantity::numeric + ${item.quantity}::numeric), updated_at = NOW()
                  WHERE organization_id = ${orgId} 
                    AND warehouse_id = ${issueRecord.warehouse_id} 
                    AND variant_id = ${item.variantId}
                `);

                // Insert Reversal Movement
                await tx.insert(stockMovements).values({
                  id: uuidv4(),
                  organizationId: orgId,
                  operationId: uuidv4(),
                  warehouseId: issueRecord.warehouse_id as string,
                  variantId: item.variantId,
                  type: 'INTERNAL_ISSUE_REVERSAL',
                  quantity: item.quantity,
                  referenceId: issueId,
                  userId: dbUser.id,
                  date: new Date()
                });
              }

              // 3. Mark Issue as Cancelled
              await tx.update(materialIssues)
                .set({ status: 'CANCELLED' })
                .where(and(eq(materialIssues.id, issueId), eq(materialIssues.organizationId, orgId)));
                
              // 4. Audit
              await tx.insert(auditLogs).values({
                id: uuidv4(),
                organizationId: orgId,
                userId: dbUser.id,
                deviceId: deviceId || 'unknown',
                operationId: op.id,
                action: 'MATERIAL_ISSUE_CANCELLED',
                entityType: 'material_issues',
                entityId: issueId,
                afterState: JSON.stringify({ status: 'CANCELLED', reversedItems: items.length })
              });
            }

          } else if (op.entityType === 'RETURN_MATERIAL_ISSUE') {
            const returnData = op.payload;
            const issueId = returnData.issueId;

            // 1. Lock Issue
            const issueRows = await tx.execute(sql`
              SELECT status, warehouse_id FROM material_issues 
              WHERE id = ${issueId} AND organization_id = ${orgId}
              FOR UPDATE
            `);
            if (issueRows.rows.length === 0) throw new Error('Issue not found');
            const issueRecord = issueRows.rows[0];

            if (['CANCELLED', 'SETTLED'].includes(issueRecord.status as string)) {
              throw new Error('Cannot return from a cancelled or settled issue');
            }

            if (!returnData.items || !Array.isArray(returnData.items) || returnData.items.length === 0) {
              throw new Error('Return must have at least one item');
            }

            for (const item of returnData.items) {
              const qtyToReturn = new Decimal(item.returnQuantity);
              if (qtyToReturn.lte(0)) continue;

              // Lock the issue item
              const issueItemRows = await tx.execute(sql`
                SELECT id, variant_id, quantity, returned_quantity, exchanged_quantity 
                FROM material_issue_items 
                WHERE id = ${item.issueItemId} AND issue_id = ${issueId} AND organization_id = ${orgId}
                FOR UPDATE
              `);

              if (issueItemRows.rows.length === 0) throw new Error('Issue item not found');
              const issueItemRecord = issueItemRows.rows[0];

              const issuedQty = new Decimal(issueItemRecord.quantity as string);
              const alreadyReturned = new Decimal(issueItemRecord.returned_quantity as string);
              const alreadyExchanged = new Decimal(issueItemRecord.exchanged_quantity as string);
              const remainingQty = issuedQty.minus(alreadyReturned).minus(alreadyExchanged);

              if (qtyToReturn.gt(remainingQty)) {
                throw new Error(`Cannot return more than remaining issued quantity for variant ${issueItemRecord.variant_id}`);
              }

              // Update item returned quantity
              await tx.execute(sql`
                UPDATE material_issue_items 
                SET returned_quantity = (returned_quantity::numeric + ${qtyToReturn.toNumber()}::numeric)
                WHERE id = ${issueItemRecord.id}
              `);

              // Upsert stock balance
              await tx.execute(sql`
                INSERT INTO stock_balances (organization_id, warehouse_id, variant_id, quantity, updated_at)
                VALUES (${orgId}, ${issueRecord.warehouse_id}, ${issueItemRecord.variant_id}, ${qtyToReturn.toNumber()}::numeric, NOW())
                ON CONFLICT (warehouse_id, variant_id) 
                DO UPDATE SET quantity = (stock_balances.quantity::numeric + ${qtyToReturn.toNumber()}::numeric), updated_at = NOW()
              `);

              // Add movement
              await tx.insert(stockMovements).values({
                id: uuidv4(),
                organizationId: orgId,
                operationId: uuidv4(),
                warehouseId: issueRecord.warehouse_id as string,
                variantId: issueItemRecord.variant_id as string,
                type: 'INTERNAL_ISSUE_RETURN',
                quantity: qtyToReturn.toString(),
                referenceId: issueId,
                userId: dbUser.id,
                date: new Date(returnData.date || new Date())
              });
            }

            await tx.insert(auditLogs).values({
              id: uuidv4(),
              organizationId: orgId,
              userId: dbUser.id,
              deviceId: deviceId || 'unknown',
              operationId: op.id,
              action: 'MATERIAL_ISSUE_RETURNED',
              entityType: 'material_issues',
              entityId: issueId,
              afterState: JSON.stringify(returnData)
            });

          } else if (op.entityType === 'EXCHANGE_MATERIAL_ISSUE') {
            const exchangeData = op.payload;
            const issueId = exchangeData.issueId;

            // 1. Lock Issue
            const issueRows = await tx.execute(sql`
              SELECT status, warehouse_id FROM material_issues 
              WHERE id = ${issueId} AND organization_id = ${orgId}
              FOR UPDATE
            `);
            if (issueRows.rows.length === 0) throw new Error('Issue not found');
            const issueRecord = issueRows.rows[0];

            if (['CANCELLED', 'SETTLED'].includes(issueRecord.status as string)) {
              throw new Error('Cannot exchange from a cancelled or settled issue');
            }

            if (!exchangeData.items || !Array.isArray(exchangeData.items) || exchangeData.items.length === 0) {
              throw new Error('Exchange must have at least one item');
            }

            for (const item of exchangeData.items) {
              const exchangeQty = new Decimal(item.exchangeQuantity);
              if (exchangeQty.lte(0)) continue;

              // Lock the issue item
              const issueItemRows = await tx.execute(sql`
                SELECT id, variant_id, quantity, returned_quantity, exchanged_quantity 
                FROM material_issue_items 
                WHERE id = ${item.issueItemId} AND issue_id = ${issueId} AND organization_id = ${orgId}
                FOR UPDATE
              `);

              if (issueItemRows.rows.length === 0) throw new Error('Issue item not found');
              const issueItemRecord = issueItemRows.rows[0];

              const issuedQty = new Decimal(issueItemRecord.quantity as string);
              const alreadyReturned = new Decimal(issueItemRecord.returned_quantity as string);
              const alreadyExchanged = new Decimal(issueItemRecord.exchanged_quantity as string);
              const remainingQty = issuedQty.minus(alreadyReturned).minus(alreadyExchanged);

              if (exchangeQty.gt(remainingQty)) {
                throw new Error(`Cannot exchange more than remaining issued quantity for variant ${issueItemRecord.variant_id}`);
              }

              // Check stock for new variant
              const newVariantId = item.newVariantId;
              const balanceRows = await tx.execute(sql`
                SELECT quantity FROM stock_balances 
                WHERE organization_id = ${orgId} 
                  AND warehouse_id = ${issueRecord.warehouse_id} 
                  AND variant_id = ${newVariantId}
                FOR UPDATE
              `);

              const newVariantStockQty = balanceRows.rows.length > 0 ? new Decimal(balanceRows.rows[0].quantity as string) : new Decimal(0);
              
              if (newVariantStockQty.lessThan(exchangeQty)) {
                throw new Error(`INSUFFICIENT_STOCK`); // Triggers rollback
              }

              // Update item exchanged quantity
              await tx.execute(sql`
                UPDATE material_issue_items 
                SET exchanged_quantity = (exchanged_quantity::numeric + ${exchangeQty.toNumber()}::numeric)
                WHERE id = ${issueItemRecord.id}
              `);
              
              // 1. Add Old Variant back to stock
              await tx.execute(sql`
                INSERT INTO stock_balances (organization_id, warehouse_id, variant_id, quantity, updated_at)
                VALUES (${orgId}, ${issueRecord.warehouse_id}, ${issueItemRecord.variant_id}, ${exchangeQty.toNumber()}::numeric, NOW())
                ON CONFLICT (warehouse_id, variant_id) 
                DO UPDATE SET quantity = (stock_balances.quantity::numeric + ${exchangeQty.toNumber()}::numeric), updated_at = NOW()
              `);

              // 2. Deduct New Variant from stock
              await tx.execute(sql`
                UPDATE stock_balances 
                SET quantity = (quantity::numeric - ${exchangeQty.toNumber()}::numeric), updated_at = NOW()
                WHERE organization_id = ${orgId} 
                  AND warehouse_id = ${issueRecord.warehouse_id} 
                  AND variant_id = ${newVariantId}
              `);

              // 3. Add movements
              // Old variant returning
              await tx.insert(stockMovements).values({
                id: uuidv4(),
                organizationId: orgId,
                operationId: uuidv4(),
                warehouseId: issueRecord.warehouse_id as string,
                variantId: issueItemRecord.variant_id as string,
                type: 'INTERNAL_ISSUE_EXCHANGE_RETURN',
                quantity: exchangeQty.toString(),
                referenceId: issueId,
                userId: dbUser.id,
                date: new Date(exchangeData.date || new Date())
              });
              
              // New variant issuing
              await tx.insert(stockMovements).values({
                id: uuidv4(),
                organizationId: orgId,
                operationId: uuidv4(),
                warehouseId: issueRecord.warehouse_id as string,
                variantId: newVariantId,
                type: 'INTERNAL_ISSUE_EXCHANGE_OUT',
                quantity: exchangeQty.toString(),
                referenceId: issueId,
                userId: dbUser.id,
                date: new Date(exchangeData.date || new Date())
              });
            }

            await tx.insert(auditLogs).values({
              id: uuidv4(),
              organizationId: orgId,
              userId: dbUser.id,
              deviceId: deviceId || 'unknown',
              operationId: op.id,
              action: 'MATERIAL_ISSUE_EXCHANGED',
              entityType: 'material_issues',
              entityId: issueId,
              afterState: JSON.stringify(exchangeData)
            });

          } else if (op.entityType === 'SETTLE_MATERIAL_ISSUE') {
            const settleData = op.payload;
            const issueId = settleData.id;

            // Lock the issue so two devices cannot settle it concurrently.
            const issueRows = await tx.execute(sql`
              SELECT status
              FROM material_issues
              WHERE id = ${issueId} AND organization_id = ${orgId}
              FOR UPDATE
            `);
            if (issueRows.rows.length === 0) throw new Error('Issue not found');

            const issueStatus = issueRows.rows[0].status as string;
            if (issueStatus === 'CANCELLED') {
              throw new Error('Cannot settle a cancelled issue');
            }
            if (issueStatus === 'SETTLED') {
              // A second settle operation is a safe no-op.
            } else {
              if (issueStatus !== 'POSTED') {
                throw new Error(`Only POSTED issues can be settled (current status: ${issueStatus})`);
              }

              const items = await tx.select({
                quantity: materialIssueItems.quantity,
                returnedQuantity: materialIssueItems.returnedQuantity,
                exchangedQuantity: materialIssueItems.exchangedQuantity,
              }).from(materialIssueItems).where(and(
                eq(materialIssueItems.issueId, issueId),
                eq(materialIssueItems.organizationId, orgId),
              ));

              if (items.length === 0) throw new Error('Issue has no items');

              const outstanding = items.reduce((total, item) => {
                const remaining = new Decimal(item.quantity)
                  .minus(new Decimal(item.returnedQuantity || '0'))
                  .minus(new Decimal(item.exchangedQuantity || '0'));
                return total.plus(remaining);
              }, new Decimal(0));

              if (outstanding.gt(0)) {
                throw new Error('ISSUE_HAS_OUTSTANDING_QUANTITY');
              }

              await tx.update(materialIssues)
                .set({
                  status: 'SETTLED',
                  settledAt: new Date(),
                  settledBy: dbUser.id,
                })
                .where(and(
                  eq(materialIssues.id, issueId),
                  eq(materialIssues.organizationId, orgId),
                ));

              await tx.insert(auditLogs).values({
                id: uuidv4(),
                organizationId: orgId,
                userId: dbUser.id,
                deviceId: deviceId || 'unknown',
                operationId: op.id,
                action: 'MATERIAL_ISSUE_SETTLED',
                entityType: 'material_issues',
                entityId: issueId,
                afterState: JSON.stringify({ status: 'SETTLED', issueId }),
              });
            }

          } else if (op.entityType === 'CREATE_PURCHASE') {
            const purchaseData = op.payload;

            // 1. Organization Validation
            const supplier = await tx.select().from(suppliers).where(and(eq(suppliers.id, purchaseData.supplierId), eq(suppliers.organizationId, orgId)));
            if (supplier.length === 0) throw new Error('Invalid supplier for this organization');

            const warehouse = await tx.select().from(warehouses).where(and(eq(warehouses.id, purchaseData.warehouseId), eq(warehouses.organizationId, orgId)));
            if (warehouse.length === 0) throw new Error('Invalid warehouse for this organization');

            // 2. Validate Items and Calculate Totals securely on backend
            let backendCalculatedTotal = new Decimal(0);
            const itemsToInsert = [];

            if (!purchaseData.items || !Array.isArray(purchaseData.items) || purchaseData.items.length === 0) {
              throw new Error('Purchase must have at least one item');
            }

            for (const item of purchaseData.items) {
              const variant = await tx.select().from(productVariants).where(and(eq(productVariants.id, item.variantId), eq(productVariants.organizationId, orgId)));
              if (variant.length === 0) throw new Error('Invalid variant for this organization');
              
              const qty = new Decimal(item.quantity);
              const cost = new Decimal(item.unitCost);
              if (qty.lte(0)) throw new Error('Quantity must be greater than zero');
              if (cost.lt(0)) throw new Error('Unit cost cannot be negative');

              const total = qty.mul(cost);
              backendCalculatedTotal = backendCalculatedTotal.plus(total);

              itemsToInsert.push({
                id: item.id || uuidv4(),
                organizationId: orgId,
                purchaseId: purchaseData.id,
                variantId: item.variantId,
                quantity: qty.toString(),
                unitCost: cost.toString(),
                totalCost: total.toString()
              });
            }

            // 3. Create Purchase
            await tx.insert(purchases).values({
              id: purchaseData.id,
              organizationId: orgId,
              supplierId: purchaseData.supplierId,
              warehouseId: purchaseData.warehouseId,
              invoiceNumber: purchaseData.invoiceNumber,
              status: 'CONFIRMED', // Start as CONFIRMED instead of DRAFT for simplicity, or we can use DRAFT if requested
              totalAmount: backendCalculatedTotal.toString(),
              date: new Date(purchaseData.date),
              createdAt: new Date(),
            });

            // 4. Create Items
            for (const item of itemsToInsert) {
              await tx.insert(purchaseItems).values(item);
            }

            // 5. Update Ledger Liability
            await tx.insert(supplierLedger).values({
              id: uuidv4(),
              organizationId: orgId,
              supplierId: purchaseData.supplierId,
              type: 'PURCHASE_INVOICE',
              referenceId: purchaseData.id,
              amount: backendCalculatedTotal.toString(), // Liability added
              date: new Date(purchaseData.date)
            });

            // 6. Audit
            await tx.insert(auditLogs).values({
              id: uuidv4(),
              organizationId: orgId,
              userId: dbUser.id,
              deviceId: deviceId || 'unknown',
              operationId: op.id,
              action: 'PURCHASE_CREATED_AND_CONFIRMED',
              entityType: 'purchases',
              entityId: purchaseData.id,
              afterState: JSON.stringify({ ...purchaseData, backendCalculatedTotal: backendCalculatedTotal.toString() })
            });

          } else if (op.entityType === 'RECEIVE_PURCHASE') {
            const receiptData = op.payload;
            const purchaseId = receiptData.purchaseId;
            
            // 1. Validate Purchase
            const purchaseResult = await tx.select().from(purchases).where(and(eq(purchases.id, purchaseId), eq(purchases.organizationId, orgId)));
            if (purchaseResult.length === 0) throw new Error('Purchase not found');
            const purchase = purchaseResult[0];

            if (purchase.status === 'RECEIVED' || purchase.status === 'CANCELLED') {
               throw new Error('Purchase is already received or cancelled');
            }

            // 2. Validate Items & calculate receipt
            const existingItems = await tx.select().from(purchaseItems).where(and(eq(purchaseItems.purchaseId, purchaseId), eq(purchaseItems.organizationId, orgId)));
            
            const receiptItemsToInsert = [];
            const stockMovementsToInsert = [];
            let allItemsFullyReceived = true;

            for (const rItem of receiptData.items) {
               const pItem = existingItems.find(i => i.id === rItem.purchaseItemId);
               if (!pItem) throw new Error('Invalid purchase item');
               
               const receivingQty = new Decimal(rItem.quantity);
               if (receivingQty.lte(0)) continue; // skip zero receive

               const orderedQty = new Decimal(pItem.quantity);
               const previouslyReceived = new Decimal(pItem.receivedQuantity);
               const remainingQty = orderedQty.minus(previouslyReceived);

               if (receivingQty.gt(remainingQty)) {
                 throw new Error(`Cannot receive more than remaining for item ${pItem.variantId}`);
               }

               const newReceivedQty = previouslyReceived.plus(receivingQty);
               if (newReceivedQty.lt(orderedQty)) {
                 allItemsFullyReceived = false;
               }

               // Update purchase item received quantity
               await tx.update(purchaseItems)
                 .set({ receivedQuantity: newReceivedQty.toString() })
                 .where(and(eq(purchaseItems.id, pItem.id), eq(purchaseItems.organizationId, orgId)));

               receiptItemsToInsert.push({
                 id: rItem.id || uuidv4(),
                 organizationId: orgId,
                 receiptId: receiptData.id,
                 purchaseItemId: pItem.id,
                 variantId: pItem.variantId,
                 quantity: receivingQty.toString()
               });

               // Generate Stock Movement
               stockMovementsToInsert.push({
                 variantId: pItem.variantId,
                 quantity: receivingQty,
                 warehouseId: purchase.warehouseId
               });
            }

            if (receiptItemsToInsert.length === 0) {
              throw new Error('No items to receive');
            }

            // Check if any other items in the purchase are not fully received
            for (const pItem of existingItems) {
               const receivedInThisBatch = receiptItemsToInsert.find(r => r.purchaseItemId === pItem.id);
               const orderedQty = new Decimal(pItem.quantity);
               const previouslyReceived = new Decimal(pItem.receivedQuantity);
               let totalReceived = previouslyReceived;
               if (receivedInThisBatch) {
                 totalReceived = totalReceived.plus(new Decimal(receivedInThisBatch.quantity));
               }
               if (totalReceived.lt(orderedQty)) {
                 allItemsFullyReceived = false;
               }
            }

            // 3. Insert Receipt Header
            await tx.insert(purchaseReceipts).values({
               id: receiptData.id,
               organizationId: orgId,
               purchaseId: purchaseId,
               warehouseId: purchase.warehouseId,
               receiptNumber: receiptData.receiptNumber || `REC-${Date.now()}`,
               date: new Date(receiptData.date),
               status: 'POSTED',
               receivedBy: dbUser.id,
            });

            // 4. Insert Receipt Items
            for (const ri of receiptItemsToInsert) {
               await tx.insert(purchaseReceiptItems).values(ri);
            }

            // 5. Apply Stock Balance Updates securely inside transaction
            for (const sm of stockMovementsToInsert) {
                // Upsert stock balance
                await tx.execute(sql`
                  INSERT INTO stock_balances (organization_id, warehouse_id, variant_id, quantity, updated_at)
                  VALUES (${orgId}, ${sm.warehouseId}, ${sm.variantId}, ${sm.quantity.toNumber()}::numeric, NOW())
                  ON CONFLICT (warehouse_id, variant_id) 
                  DO UPDATE SET quantity = (stock_balances.quantity::numeric + ${sm.quantity.toNumber()}::numeric), updated_at = NOW()
                `);
                
                // Record movement
                await tx.insert(stockMovements).values({
                  id: uuidv4(),
                  organizationId: orgId,
                  operationId: uuidv4(), // Need unique operation for each movement in batch to avoid idempotency clashes
                  warehouseId: sm.warehouseId,
                  variantId: sm.variantId,
                  type: 'PURCHASE_RECEIPT',
                  quantity: sm.quantity.toString(),
                  referenceId: receiptData.id,
                  userId: dbUser.id,
                  date: new Date(receiptData.date)
                });
            }

            // 6. Update Purchase Status
            const newStatus = allItemsFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
            await tx.update(purchases)
              .set({ status: newStatus })
              .where(and(eq(purchases.id, purchaseId), eq(purchases.organizationId, orgId)));

            // 7. Audit
            await tx.insert(auditLogs).values({
              id: uuidv4(),
              organizationId: orgId,
              userId: dbUser.id,
              deviceId: deviceId || 'unknown',
              operationId: op.id,
              action: 'RECEIPT_POSTED',
              entityType: 'purchase_receipts',
              entityId: receiptData.id,
              afterState: JSON.stringify({ receiptId: receiptData.id, status: newStatus, itemsCount: receiptItemsToInsert.length })
            });

          
          } else if (op.entityType === 'warehouses') {
            await tx.insert(warehouses).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: warehouses.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'categories') {
            await tx.insert(categories).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: categories.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'units') {
            await tx.insert(units).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: units.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'products') {
            await tx.insert(products).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: products.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'productVariants') {
            await tx.insert(productVariants).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: productVariants.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'suppliers') {
            await tx.insert(suppliers).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: suppliers.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'departments') {
            await tx.insert(departments).values({ ...op.payload, organizationId: orgId }).onConflictDoUpdate({ target: departments.id, set: { ...op.payload, organizationId: orgId } });
          } else if (op.entityType === 'CREATE_SUPPLIER_PAYMENT') {
            const paymentData = op.payload;
            
            const supplier = await tx.select().from(suppliers).where(and(eq(suppliers.id, paymentData.supplierId), eq(suppliers.organizationId, orgId)));
            if (supplier.length === 0) throw new Error('Invalid supplier for this organization');

            const amount = new Decimal(paymentData.amount);
            if (amount.lte(0)) throw new Error('Payment amount must be greater than zero');

            await tx.insert(supplierPayments).values({
               id: paymentData.id,
               organizationId: orgId,
               supplierId: paymentData.supplierId,
               amount: amount.toString(),
               date: new Date(paymentData.date),
               referenceId: paymentData.referenceId,
               notes: paymentData.notes
            });

            await tx.insert(supplierLedger).values({
              id: uuidv4(),
              organizationId: orgId,
              supplierId: paymentData.supplierId,
              type: 'PAYMENT',
              referenceId: paymentData.id,
              amount: amount.negated().toString(), // Payment reduces liability
              date: new Date(paymentData.date)
            });

            await tx.insert(auditLogs).values({
              id: uuidv4(),
              organizationId: orgId,
              userId: dbUser.id,
              deviceId: deviceId || 'unknown',
              operationId: op.id,
              action: 'SUPPLIER_PAYMENT_POSTED',
              entityType: 'supplier_payments',
              entityId: paymentData.id,
              afterState: JSON.stringify(paymentData)
            });

          } else if (['warehouses', 'categories', 'units', 'products', 'productVariants', 'suppliers', 'departments'].includes(op.entityType)) {
            let tableToUse: any;
            
            switch (op.entityType) {
              case 'warehouses': tableToUse = warehouses; break;
              case 'categories': tableToUse = categories; break;
              case 'units': tableToUse = units; break;
              case 'products': tableToUse = products; break;
              case 'productVariants': tableToUse = productVariants; break;
              case 'suppliers': tableToUse = suppliers; break;
              case 'departments': tableToUse = departments; break;
            }

            const data = { ...op.payload, organizationId: orgId };
            
            // Convert string dates to Date objects if they exist
            if (data.date && typeof data.date === 'string') {
              data.date = new Date(data.date);
            }
            if (data.createdAt && typeof data.createdAt === 'string') {
              data.createdAt = new Date(data.createdAt);
            }

            await tx.insert(tableToUse)
              .values(data)
              .onConflictDoUpdate({
                target: tableToUse.id,
                set: data,
                where: eq(tableToUse.organizationId, orgId)
              });

            await tx.insert(auditLogs).values({
              id: uuidv4(),
              organizationId: orgId,
              userId: dbUser.id,
              deviceId: deviceId || 'unknown',
              operationId: op.id,
              action: `SYNC_${op.entityType.toUpperCase()}`,
              entityType: op.entityType,
              entityId: data.id,
              afterState: JSON.stringify(data)
            });
          }

          // 3. Mark as Synced
          await tx.insert(syncOperations).values({
            id: op.id,
            organizationId: orgId,
            deviceId: deviceId || 'unknown',
            userId: dbUser.id,
            entityType: op.entityType,
            operationType: op.operationType,
            payload: JSON.stringify(op.payload),
          });

          results.push({ id: op.id, status: 'success' });
        });
      } catch (err: any) {
        console.error(`Sync error on operation ${op.id}:`, err);
        if (['INSUFFICIENT_STOCK', 'ISSUE_HAS_OUTSTANDING_QUANTITY'].includes(err.message)) {
          results.push({ id: op.id, status: 'conflict', reason: err.message });
        } else {
          results.push({ id: op.id, status: 'error', message: err.message });
        }
      }
    }

    res.json({ results });
  });

  app.get("/api/pull", requireAuth, async (req: AuthRequest, res) => {
    try {
      const orgId = req.dbUser!.organizationId;
      const userRole = req.dbUser!.role; // 'ADMIN' or 'STOREKEEPER'

      const allWarehouses = await db.select().from(warehouses).where(eq(warehouses.organizationId, orgId));
      const allCategories = await db.select().from(categories).where(eq(categories.organizationId, orgId));
      const allUnits = await db.select().from(units).where(eq(units.organizationId, orgId));
      const allProducts = await db.select().from(products).where(eq(products.organizationId, orgId));
      const allVariants = await db.select().from(productVariants).where(eq(productVariants.organizationId, orgId));
      const allMovements = await db.select().from(stockMovements).where(eq(stockMovements.organizationId, orgId));
      const allBalances = await db.select().from(stockBalances).where(eq(stockBalances.organizationId, orgId));
      const allSuppliers = await db.select().from(suppliers).where(eq(suppliers.organizationId, orgId));
      const allDepartments = await db.select().from(departments).where(eq(departments.organizationId, orgId));
      const allMaterialIssues = await db.select().from(materialIssues).where(eq(materialIssues.organizationId, orgId));
      const allMaterialIssueItems = await db.select().from(materialIssueItems).where(eq(materialIssueItems.organizationId, orgId));
      const allPurchaseReceipts = await db.select().from(purchaseReceipts).where(eq(purchaseReceipts.organizationId, orgId));
      const allPurchaseReceiptItems = await db.select().from(purchaseReceiptItems).where(eq(purchaseReceiptItems.organizationId, orgId));

      let allPurchases: any[] = [];
      let allPurchaseItems: any[] = [];
      let allSupplierLedger: any[] = [];
      let allSupplierPayments: any[] = [];

      // Only ADMIN can see financial/purchasing records completely.
      // (Storekeeper can see receipts which are just inventory movements).
      if (userRole === 'ADMIN') {
        allPurchases = await db.select().from(purchases).where(eq(purchases.organizationId, orgId));
        allPurchaseItems = await db.select().from(purchaseItems).where(eq(purchaseItems.organizationId, orgId));
        allSupplierLedger = await db.select().from(supplierLedger).where(eq(supplierLedger.organizationId, orgId));
        allSupplierPayments = await db.select().from(supplierPayments).where(eq(supplierPayments.organizationId, orgId));
      } else {
        // STOREKEEPER can see Purchases to receive them, but no ledger/payments
        allPurchases = await db.select().from(purchases).where(eq(purchases.organizationId, orgId));
        allPurchaseItems = await db.select().from(purchaseItems).where(eq(purchaseItems.organizationId, orgId));
      }

      res.json({
        warehouses: allWarehouses,
        categories: allCategories,
        units: allUnits,
        products: allProducts,
        productVariants: allVariants,
        stockMovements: allMovements,
        stockBalances: allBalances,
        suppliers: allSuppliers,
        purchases: allPurchases,
        purchaseItems: allPurchaseItems,
        purchaseReceipts: allPurchaseReceipts,
        purchaseReceiptItems: allPurchaseReceiptItems,
        supplierLedger: allSupplierLedger,
        supplierPayments: allSupplierPayments,
        departments: allDepartments,
        materialIssues: allMaterialIssues,
        materialIssueItems: allMaterialIssueItems
      });
    } catch (err: any) {
      console.error("Pull error:", err);
      res.status(500).json({ error: "Failed to pull data" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
