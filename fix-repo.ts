import fs from 'fs';

let content = fs.readFileSync('src/lib/repositories.ts', 'utf8');

const newRepoCode = `
export const InventoryRepository = {
  async postOpeningBalance(warehouseId: string, items: { variantId: string, quantity: string, cost?: string }[], date: string, notes?: string) {
    const opIdBase = 'OPB-' + Date.now().toString(36).toUpperCase();
    
    await db.transaction('rw', db.stockMovements, db.outbox, async () => {
      const movements = items.map((item, idx) => ({
        id: crypto.randomUUID(),
        operationId: crypto.randomUUID(),
        warehouseId,
        variantId: item.variantId,
        type: 'ADJUSTMENT_IN',
        quantity: item.quantity,
        date: date,
        referenceId: opIdBase,
        notes: JSON.stringify({
          type: 'OPENING_BALANCE',
          notes: notes || 'رصيد افتتاحي',
          cost: item.cost
        })
      }));
      
      const outboxOps = movements.map(m => ({
        id: m.operationId,
        entityType: 'stock_movements',
        operationType: 'INSERT' as const,
        payload: m,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0
      }));
      
      await db.stockMovements.bulkAdd(movements);
      await db.outbox.bulkAdd(outboxOps);
    });
  },

  async postInventoryAdjustment(warehouseId: string, adjustments: { variantId: string, bookQty: string, actualQty: string, difference: string, type: 'IN' | 'OUT' }[], date: string, notes?: string) {
    const opIdBase = 'ADJ-' + Date.now().toString(36).toUpperCase();
    
    await db.transaction('rw', db.stockMovements, db.outbox, async () => {
      const movements = adjustments.filter(adj => parseFloat(adj.difference) !== 0).map((adj, idx) => ({
        id: crypto.randomUUID(),
        operationId: crypto.randomUUID(),
        warehouseId,
        variantId: adj.variantId,
        type: adj.type === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        quantity: Math.abs(parseFloat(adj.difference)).toString(),
        date: date,
        referenceId: opIdBase,
        notes: JSON.stringify({
          type: 'INVENTORY_COUNT',
          bookQty: adj.bookQty,
          actualQty: adj.actualQty,
          notes: notes || 'تسوية جردية'
        })
      }));
      
      if (movements.length > 0) {
        const outboxOps = movements.map(m => ({
          id: m.operationId,
          entityType: 'stock_movements',
          operationType: 'INSERT' as const,
          payload: m,
          status: 'PENDING' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          retryCount: 0
        }));

        await db.stockMovements.bulkAdd(movements);
        await db.outbox.bulkAdd(outboxOps);
      }
    });
  }
};
`;

// Replace the old InventoryRepository
const startIdx = content.indexOf('export const InventoryRepository = {');
if (startIdx !== -1) {
  content = content.slice(0, startIdx) + newRepoCode;
  fs.writeFileSync('src/lib/repositories.ts', content);
}
