import fs from 'fs';

let content = fs.readFileSync('src/lib/repositories.ts', 'utf8');

const repoCode = `
export const InventoryRepository = {
  async postOpeningBalance(warehouseId: string, items: { variantId: string, quantity: string, cost?: string }[], date: string, notes?: string) {
    const opId = 'OPB-' + Date.now().toString(36).toUpperCase();
    
    await db.transaction('rw', db.stockMovements, db.outbox, async () => {
      const movements = items.map((item, idx) => ({
        id: crypto.randomUUID(),
        operationId: opId,
        warehouseId,
        variantId: item.variantId,
        type: 'ADJUSTMENT_IN',
        quantity: item.quantity,
        date: date,
        referenceId: opId,
        notes: JSON.stringify({
          type: 'OPENING_BALANCE',
          notes: notes || 'رصيد افتتاحي',
          cost: item.cost
        })
      }));
      
      await db.stockMovements.bulkAdd(movements);
      
      await db.outbox.add({
        id: crypto.randomUUID(),
        operation: 'POST_OPENING_BALANCE',
        payload: {
          operationId: opId,
          warehouseId,
          date,
          items,
          notes: notes || 'رصيد افتتاحي'
        },
        createdAt: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0
      });
    });
  },

  async postInventoryAdjustment(warehouseId: string, adjustments: { variantId: string, bookQty: string, actualQty: string, difference: string, type: 'IN' | 'OUT' }[], date: string, notes?: string) {
    const opId = 'ADJ-' + Date.now().toString(36).toUpperCase();
    
    await db.transaction('rw', db.stockMovements, db.outbox, async () => {
      const movements = adjustments.filter(adj => parseFloat(adj.difference) !== 0).map((adj, idx) => ({
        id: crypto.randomUUID(),
        operationId: opId,
        warehouseId,
        variantId: adj.variantId,
        type: adj.type === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        quantity: Math.abs(parseFloat(adj.difference)).toString(),
        date: date,
        referenceId: opId,
        notes: JSON.stringify({
          type: 'INVENTORY_COUNT',
          bookQty: adj.bookQty,
          actualQty: adj.actualQty,
          notes: notes || 'تسوية جردية'
        })
      }));
      
      if (movements.length > 0) {
        await db.stockMovements.bulkAdd(movements);
        
        await db.outbox.add({
          id: crypto.randomUUID(),
          operation: 'POST_INVENTORY_ADJUSTMENT',
          payload: {
            operationId: opId,
            warehouseId,
            date,
            adjustments,
            notes: notes || 'تسوية جردية'
          },
          createdAt: new Date().toISOString(),
          status: 'PENDING',
          retryCount: 0
        });
      }
    });
  }
};
`;

if (!content.includes('export const InventoryRepository')) {
  fs.appendFileSync('src/lib/repositories.ts', '\n' + repoCode);
}
