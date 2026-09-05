import { db } from './src/db/index.ts';
import { organizations, users, warehouses, productVariants, products, categories, units, stockBalances, stockMovements, syncOperations } from './src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from 'decimal.js';

async function runTests() {
  console.log('--- STARTING INVENTORY INTEGRITY TESTS ---');
  
  const orgId = 'org_test';
  const userId = 'user_test';
  const warehouseId = 'wh_test';
  const variantId = 'var_test';
  
  // 1. Setup Test Data
  await db.transaction(async (tx) => {
    // Clean up
    await tx.delete(stockMovements).where(eq(stockMovements.organizationId, orgId));
    await tx.delete(stockBalances).where(eq(stockBalances.organizationId, orgId));
    await tx.delete(syncOperations).where(eq(syncOperations.organizationId, orgId));
    await tx.delete(productVariants).where(eq(productVariants.organizationId, orgId));
    await tx.delete(products).where(eq(products.organizationId, orgId));
    await tx.delete(warehouses).where(eq(warehouses.organizationId, orgId));
    await tx.delete(users).where(eq(users.organizationId, orgId));
    await tx.delete(organizations).where(eq(organizations.id, orgId));

    // Seed
    await tx.insert(organizations).values({ id: orgId, name: 'Test Org' });
    await tx.insert(users).values({ id: userId, uid: 'test_uid', organizationId: orgId, email: 'test@test.com', role: 'ADMIN' });
    await tx.insert(warehouses).values({ id: warehouseId, organizationId: orgId, name: 'Test WH', type: 'MAIN' });
    
    // Minimal product seed
    await tx.insert(products).values({ id: 'prod_1', organizationId: orgId, name: 'Test Product' });
    await tx.insert(productVariants).values({ id: variantId, organizationId: orgId, productId: 'prod_1', name: 'Test Variant' });
  });
  
  console.log('✅ Test Data Seeded');

  // Helper to simulate sync endpoint processing
  const processMovement = async (opId: string, type: string, quantity: string) => {
    try {
      const result = await db.transaction(async (tx) => {
        // Idempotency
        const existing = await tx.select().from(syncOperations).where(eq(syncOperations.id, opId));
        if (existing.length > 0) return 'already_synced';

        const requestedQty = new Decimal(quantity);

        if (['ISSUE', 'TRANSFER_OUT', 'DAMAGE'].includes(type)) {
          const balanceRows = await tx.execute(sql`
            SELECT quantity FROM stock_balances 
            WHERE organization_id = ${orgId} AND warehouse_id = ${warehouseId} AND variant_id = ${variantId}
            FOR UPDATE
          `);
          const currentQty = balanceRows.rows.length > 0 ? new Decimal(balanceRows.rows[0].quantity as string) : new Decimal(0);
          
          if (currentQty.lessThan(requestedQty)) {
            throw new Error('INSUFFICIENT_STOCK');
          }

          await tx.execute(sql`
            UPDATE stock_balances SET quantity = (quantity::numeric - ${requestedQty.toNumber()}::numeric)
            WHERE organization_id = ${orgId} AND warehouse_id = ${warehouseId} AND variant_id = ${variantId}
          `);
        } else {
          await tx.execute(sql`
            INSERT INTO stock_balances (organization_id, warehouse_id, variant_id, quantity)
            VALUES (${orgId}, ${warehouseId}, ${variantId}, ${requestedQty.toNumber()}::numeric)
            ON CONFLICT (warehouse_id, variant_id)
            DO UPDATE SET quantity = (stock_balances.quantity::numeric + ${requestedQty.toNumber()}::numeric)
          `);
        }

        await tx.insert(stockMovements).values({
          id: uuidv4(),
          organizationId: orgId,
          operationId: opId,
          warehouseId,
          variantId,
          type,
          quantity: requestedQty.toString(),
          userId,
        });

        await tx.insert(syncOperations).values({
          id: opId,
          organizationId: orgId,
          entityType: 'stock_movements',
          operationType: 'INSERT',
        });
        
        return 'success';
      });
      return result;
    } catch (e: any) {
      if (e.message === 'INSUFFICIENT_STOCK') return 'conflict';
      throw e;
    }
  };

  // Test 1: Ledger Math & Decimals (100.50 Opening, -12.35 Issue)
  console.log('--- TEST 1: Decimal Math ---');
  await processMovement('op_1', 'OPENING_BALANCE', '100.50');
  await processMovement('op_2', 'ISSUE', '12.35');
  
  const b1 = await db.select().from(stockBalances).where(eq(stockBalances.warehouseId, warehouseId));
  console.log(`Balance after 100.50 - 12.35 = ${b1[0].quantity} (Expected: 88.15)`);
  if (b1[0].quantity === '88.15') console.log('✅ Decimal Math Passed');
  else console.log('❌ Decimal Math Failed');

  // Test 2: Standard Ledger Math
  console.log('--- TEST 2: Ledger Math ---');
  // Reset balance
  await db.execute(sql`UPDATE stock_balances SET quantity = 0`);
  await db.execute(sql`DELETE FROM sync_operations WHERE id NOT IN ('op_1', 'op_2')`);
  
  await processMovement('op_3', 'OPENING_BALANCE', '100');
  await processMovement('op_4', 'PURCHASE', '50');
  await processMovement('op_5', 'ISSUE', '20');
  await processMovement('op_6', 'TRANSFER_OUT', '10');
  await processMovement('op_7', 'TRANSFER_IN', '5');
  await processMovement('op_8', 'DAMAGE', '3');
  
  const b2 = await db.select().from(stockBalances).where(eq(stockBalances.warehouseId, warehouseId));
  console.log(`Final Balance: ${b2[0].quantity} (Expected: 122)`);
  if (Number(b2[0].quantity) === 122) console.log('✅ Ledger Math Passed');
  else console.log('❌ Ledger Math Failed');

  // Test 3: Idempotency
  console.log('--- TEST 3: Idempotency ---');
  const idempOpId = 'op_9_idemp';
  const r1 = await processMovement(idempOpId, 'PURCHASE', '10');
  const r2 = await processMovement(idempOpId, 'PURCHASE', '10');
  const r3 = await processMovement(idempOpId, 'PURCHASE', '10');
  console.log(`Run 1: ${r1}, Run 2: ${r2}, Run 3: ${r3}`);
  if (r1 === 'success' && r2 === 'already_synced' && r3 === 'already_synced') console.log('✅ Idempotency Passed');
  else console.log('❌ Idempotency Failed');

  // Test 4: Conflict Resolution (Offline Race Condition)
  console.log('--- TEST 4: Conflict Resolution ---');
  // Balance is currently 122 + 10 = 132. Let's set it precisely to 100
  await db.execute(sql`UPDATE stock_balances SET quantity = 100 WHERE warehouse_id = ${warehouseId}`);
  
  // Device A requests Issue 80
  const devA = await processMovement('op_10_devA', 'ISSUE', '80');
  
  // Device B requests Issue 70
  const devB = await processMovement('op_11_devB', 'ISSUE', '70');
  
  console.log(`Device A Status: ${devA}`);
  console.log(`Device B Status: ${devB}`);
  if (devA === 'success' && devB === 'conflict') console.log('✅ Conflict Resolution Passed');
  else console.log('❌ Conflict Resolution Failed');

  console.log('--- ALL TESTS COMPLETED ---');
  process.exit(0);
}

runTests().catch(console.error);
