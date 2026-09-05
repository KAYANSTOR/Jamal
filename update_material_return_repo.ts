import fs from 'fs';

let content = fs.readFileSync('src/lib/repositories.ts', 'utf8');

const newRepo = `
export const MaterialReturnRepository = {
  async returnMaterialIssue(
    issueId: string,
    date: string,
    items: { issueItemId: string; returnQuantity: string; variantId: string }[],
    warehouseId: string
  ) {
    const returnPayload = {
      issueId,
      date,
      items: items.map(i => ({ issueItemId: i.issueItemId, returnQuantity: i.returnQuantity }))
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'RETURN_MATERIAL_ISSUE',
      operationType: 'INSERT' as const,
      payload: returnPayload,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };
    
    // Optimistically create the stock movements so they appear in the UI
    const stockMovements: import('./db').LocalStockMovement[] = items.map(item => ({
      id: uuidv4(),
      operationId: outboxOp.id, // Grouping them locally by outbox operation ID
      warehouseId: warehouseId,
      variantId: item.variantId,
      type: 'INTERNAL_ISSUE_RETURN',
      quantity: item.returnQuantity, // Positively stored, interpreted correctly based on type
      date: date,
      referenceId: issueId
    }));

    await db.transaction('rw', [db.materialIssueItems, db.stockMovements, db.outbox], async () => {
      // Optimistic updates for returnedQuantity
      for (const item of items) {
        const issueItem = await db.materialIssueItems.get(item.issueItemId);
        if (issueItem) {
          const newReturned = (parseFloat(issueItem.returnedQuantity || '0') + parseFloat(item.returnQuantity)).toString();
          await db.materialIssueItems.update(issueItem.id, { returnedQuantity: newReturned });
        }
      }
      
      await db.stockMovements.bulkPut(stockMovements);
      await db.outbox.add(outboxOp);
    });
  }
};
`;

content = content + '\n' + newRepo;
fs.writeFileSync('src/lib/repositories.ts', content);
