import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

let content = fs.readFileSync('src/lib/repositories.ts', 'utf8');

const repoStr = `
export const StockTransferRepository = {
  async saveDraft(draft: Omit<import('./db').LocalStockTransferDraft, 'id'> | import('./db').LocalStockTransferDraft) {
    const id = (draft as any).id || \`TRF-\${Date.now()}\`;
    await db.stockTransferDrafts.put({ ...draft, id });
    return id;
  },

  async deleteDraft(id: string) {
    await db.stockTransferDrafts.delete(id);
  },

  async sendTransfer(draftId: string, transferData: import('./db').LocalStockTransferDraft) {
    const id = draftId || \`TRF-\${Date.now()}\`;
    
    // We create a single Outbox operation that contains all the TRANSFER_OUT stock_movements
    const movements: import('./db').LocalStockMovement[] = transferData.items.map(item => {
      const opId = uuidv4();
      return {
        id: uuidv4(),
        operationId: opId,
        warehouseId: transferData.sourceWarehouseId,
        variantId: item.variantId,
        type: 'TRANSFER_OUT',
        quantity: item.quantity,
        date: transferData.date,
        referenceId: id,
        notes: JSON.stringify({ destId: transferData.destinationWarehouseId, notes: transferData.notes || '' })
      };
    });

    const outboxOps: import('./db').OutboxOperation[] = movements.map(m => ({
      id: m.operationId,
      entityType: 'stock_movements',
      operationType: 'INSERT' as const,
      payload: m,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    }));

    await db.transaction('rw', [db.stockTransferDrafts, db.stockMovements, db.outbox], async () => {
      // 1. Delete draft if it exists
      if (draftId) {
        await db.stockTransferDrafts.delete(draftId);
      }
      
      // 2. Put movements locally
      await db.stockMovements.bulkPut(movements);

      // 3. Put outbox ops
      await db.outbox.bulkAdd(outboxOps);
    });
  },

  async receiveTransfer(referenceId: string, date: string, destinationWarehouseId: string, items: {variantId: string, quantity: string}[]) {
    const movements: import('./db').LocalStockMovement[] = items.map(item => {
      const opId = uuidv4();
      return {
        id: uuidv4(),
        operationId: opId,
        warehouseId: destinationWarehouseId,
        variantId: item.variantId,
        type: 'TRANSFER_IN',
        quantity: item.quantity,
        date: date,
        referenceId: referenceId
      };
    });

    const outboxOps: import('./db').OutboxOperation[] = movements.map(m => ({
      id: m.operationId,
      entityType: 'stock_movements',
      operationType: 'INSERT' as const,
      payload: m,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    }));

    await db.transaction('rw', [db.stockMovements, db.outbox], async () => {
      await db.stockMovements.bulkPut(movements);
      await db.outbox.bulkAdd(outboxOps);
    });
  },

  async cancelTransfer(referenceId: string, date: string, sourceWarehouseId: string, items: {variantId: string, quantity: string}[]) {
    const movements: import('./db').LocalStockMovement[] = items.map(item => {
      const opId = uuidv4();
      return {
        id: uuidv4(),
        operationId: opId,
        warehouseId: sourceWarehouseId, // Return to source
        variantId: item.variantId,
        type: 'TRANSFER_CANCELLED', // Backend will interpret this as an addition because it's not in the reduction list
        quantity: item.quantity,
        date: date,
        referenceId: referenceId
      };
    });

    const outboxOps: import('./db').OutboxOperation[] = movements.map(m => ({
      id: m.operationId,
      entityType: 'stock_movements',
      operationType: 'INSERT' as const,
      payload: m,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    }));

    await db.transaction('rw', [db.stockMovements, db.outbox], async () => {
      await db.stockMovements.bulkPut(movements);
      await db.outbox.bulkAdd(outboxOps);
    });
  }
};
`;

content = content + '\n' + repoStr;
fs.writeFileSync('src/lib/repositories.ts', content);
