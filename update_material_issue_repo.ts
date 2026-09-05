import fs from 'fs';

let content = fs.readFileSync('src/lib/repositories.ts', 'utf8');

const newRepo = `
export const MaterialIssueRepository = {
  async addMaterialIssue(
    issueData: Omit<import('./db').LocalMaterialIssue, 'id' | 'createdAt' | 'status'>,
    itemsData: Omit<import('./db').LocalMaterialIssueItem, 'id' | 'issueId'>[]
  ) {
    const newIssue: import('./db').LocalMaterialIssue = {
      ...issueData,
      status: 'POSTED', // Backend automatically posts it and adjusts stock
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    const newItems = itemsData.map(item => ({
      ...item,
      id: uuidv4(),
      issueId: newIssue.id,
    }));

    const stockMovements: import('./db').LocalStockMovement[] = newItems.map(item => ({
      id: uuidv4(),
      operationId: newIssue.id,
      warehouseId: newIssue.warehouseId,
      variantId: item.variantId,
      type: 'INTERNAL_ISSUE',
      quantity: item.quantity, // Positively stored, the calculation logic interprets INTERNAL_ISSUE as negative
      date: newIssue.date,
    }));

    const createIssuePayload = {
      ...newIssue,
      items: newItems
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'CREATE_MATERIAL_ISSUE',
      operationType: 'INSERT' as const,
      payload: createIssuePayload,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.materialIssues, db.materialIssueItems, db.stockMovements, db.outbox], async () => {
      await db.materialIssues.put(newIssue);
      await db.materialIssueItems.bulkPut(newItems);
      await db.stockMovements.bulkPut(stockMovements); // Local only, backend handles its own
      await db.outbox.add(outboxOp); // Send only aggregate operation
    });

    return { issue: newIssue, items: newItems };
  },

  async cancelMaterialIssue(id: string) {
    const existing = await db.materialIssues.get(id);
    if (!existing) throw new Error('Material Issue not found');
    if (existing.status === 'CANCELLED') return existing;

    const updatedIssue = { ...existing, status: 'CANCELLED' };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'CANCEL_MATERIAL_ISSUE',
      operationType: 'UPDATE' as const,
      payload: { id },
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.materialIssues, db.stockMovements, db.outbox], async () => {
      await db.materialIssues.put(updatedIssue);
      // Remove local stock movements associated with this issue
      const issueMovements = await db.stockMovements.where('operationId').equals(id).toArray();
      const movementIds = issueMovements.map(m => m.id);
      await db.stockMovements.bulkDelete(movementIds);
      await db.outbox.add(outboxOp);
    });

    return updatedIssue;
  }
};
`;

const regex = /export const MaterialIssueRepository = \{[\s\S]*?\n\};\n/m;
content = content.replace(regex, newRepo + '\n');
fs.writeFileSync('src/lib/repositories.ts', content);
