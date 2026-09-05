import fs from 'fs';

let content = fs.readFileSync('src/lib/repositories.ts', 'utf8');

const newPurchaseRepo = `
export const PurchaseRepository = {
  async addPurchaseOrder(
    purchaseData: Omit<import('./db').LocalPurchase, 'id' | 'createdAt'>,
    itemsData: Omit<import('./db').LocalPurchaseItem, 'id' | 'purchaseId'>[]
  ) {
    const newPurchase: import('./db').LocalPurchase = {
      ...purchaseData,
      status: 'CONFIRMED', // Force CONFIRMED as required by backend contract
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    const newItems = itemsData.map(item => ({
      ...item,
      id: uuidv4(),
      purchaseId: newPurchase.id,
    }));

    // Aggregate Payload for backend
    const createPurchasePayload = {
      ...newPurchase,
      items: newItems
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'CREATE_PURCHASE',
      operationType: 'INSERT' as const,
      payload: createPurchasePayload,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.purchases, db.purchaseItems, db.outbox], async () => {
      await db.purchases.put(newPurchase);
      await db.purchaseItems.bulkPut(newItems);
      await db.outbox.add(outboxOp); // Send only one aggregate operation
    });

    return { purchase: newPurchase, items: newItems };
  },

  async updatePurchaseStatus(id: string, status: string) {
    const existing = await db.purchases.get(id);
    if (!existing) throw new Error('Purchase not found');

    const updatedPurchase = { ...existing, status };

    // Note: The backend currently doesn't process UPDATE_PURCHASE_STATUS.
    // Since we now create it as CONFIRMED, this might not be needed for syncing, 
    // but we keep the local update logic working if UI triggers it.
    
    await db.transaction('rw', [db.purchases], async () => {
      await db.purchases.put(updatedPurchase);
      // Removed outbox since backend doesn't support individual status updates for purchases
    });

    return updatedPurchase;
  },

  async receivePurchase(
    purchaseId: string,
    receiptData: { date: string; receiptNumber?: string },
    receivedItems: { purchaseItemId: string; quantity: string }[] // items being received NOW
  ) {
    const purchase = await db.purchases.get(purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    const purchaseItems = await db.purchaseItems.where('purchaseId').equals(purchaseId).toArray();
    
    // Validate quantities
    const itemsUpdates: typeof purchaseItems = [];
    const stockMovements: import('./db').LocalStockMovement[] = [];
    const receiptItems: import('./db').LocalPurchaseReceiptItem[] = [];

    const newReceipt: import('./db').LocalPurchaseReceipt = {
      id: uuidv4(),
      purchaseId,
      warehouseId: purchase.warehouseId,
      receiptNumber: receiptData.receiptNumber,
      date: receiptData.date,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    };

    // Build the aggregate payload for the backend
    const receivePurchasePayload = {
      id: newReceipt.id,
      purchaseId,
      receiptNumber: newReceipt.receiptNumber,
      date: newReceipt.date,
      items: receivedItems
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'RECEIVE_PURCHASE',
      operationType: 'INSERT' as const,
      payload: receivePurchasePayload,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    for (const rItem of receivedItems) {
      const pItem = purchaseItems.find(i => i.id === rItem.purchaseItemId);
      if (!pItem) throw new Error(\`Purchase item \${rItem.purchaseItemId} not found\`);

      const currentReceived = parseFloat(pItem.receivedQuantity || '0');
      const receivingNow = parseFloat(rItem.quantity || '0');
      
      if (receivingNow <= 0) continue; // Only process positive quantities

      const orderedQty = parseFloat(pItem.quantity || '0');
      const newReceived = currentReceived + receivingNow;

      if (newReceived > orderedQty) {
         throw new Error(\`Cannot receive more than ordered for item \${pItem.variantId}\`);
      }

      // 1. Update purchase item
      const updatedPItem = { ...pItem, receivedQuantity: newReceived.toString() };
      itemsUpdates.push(updatedPItem);

      // 2. Create receipt item
      const newReceiptItem: import('./db').LocalPurchaseReceiptItem = {
        id: uuidv4(),
        receiptId: newReceipt.id,
        purchaseItemId: pItem.id,
        variantId: pItem.variantId,
        quantity: receivingNow.toString(),
      };
      receiptItems.push(newReceiptItem);

      // 3. Create stock movement (Local only, backend generates its own to prevent duplication)
      const newStockMovement: import('./db').LocalStockMovement = {
        id: uuidv4(),
        operationId: newReceipt.id,
        warehouseId: purchase.warehouseId,
        variantId: pItem.variantId,
        type: 'PURCHASE_RECEIPT',
        quantity: receivingNow.toString(), // positive for receipt
        date: receiptData.date,
      };
      stockMovements.push(newStockMovement);
    }

    if (receiptItems.length === 0) {
      throw new Error('No valid items to receive');
    }

    // Determine new purchase status
    let allFullyReceived = true;
    for (const pItem of purchaseItems) {
      const updated = itemsUpdates.find(i => i.id === pItem.id) || pItem;
      if (parseFloat(updated.receivedQuantity || '0') < parseFloat(updated.quantity || '0')) {
        allFullyReceived = false;
        break;
      }
    }

    const updatedPurchase = { 
      ...purchase, 
      status: allFullyReceived ? 'RECEIVED' : 'PARTIAL' 
    };

    await db.transaction('rw', [
      db.purchases, 
      db.purchaseItems, 
      db.purchaseReceipts, 
      db.purchaseReceiptItems, 
      db.stockMovements, 
      db.outbox
    ], async () => {
      await db.purchases.put(updatedPurchase);
      await db.purchaseItems.bulkPut(itemsUpdates);
      await db.purchaseReceipts.put(newReceipt);
      await db.purchaseReceiptItems.bulkPut(receiptItems);
      await db.stockMovements.bulkPut(stockMovements);
      
      // ONLY emit the RECEIVE_PURCHASE aggregate event to outbox
      await db.outbox.add(outboxOp);
    });

    return { 
      purchase: updatedPurchase, 
      receipt: newReceipt, 
      receiptItems, 
      stockMovements 
    };
  }
};
`;

const regex = /export const PurchaseRepository = \{[\s\S]*?\n\};\n/m;
content = content.replace(regex, newPurchaseRepo + '\n');
fs.writeFileSync('src/lib/repositories.ts', content);
