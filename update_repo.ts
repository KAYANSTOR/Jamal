import fs from 'fs';

let content = fs.readFileSync('src/lib/repositories.ts', 'utf8');

const receivePurchaseCode = `
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

    const ops: any[] = [
      {
        id: uuidv4(),
        entityType: 'purchase_receipts',
        operationType: 'INSERT',
        payload: newReceipt,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0
      }
    ];

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

      ops.push({
        id: uuidv4(),
        entityType: 'purchase_items',
        operationType: 'UPDATE',
        payload: updatedPItem,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0
      });

      // 2. Create receipt item
      const newReceiptItem: import('./db').LocalPurchaseReceiptItem = {
        id: uuidv4(),
        receiptId: newReceipt.id,
        purchaseItemId: pItem.id,
        variantId: pItem.variantId,
        quantity: receivingNow.toString(),
      };
      receiptItems.push(newReceiptItem);

      ops.push({
        id: uuidv4(),
        entityType: 'purchase_receipt_items',
        operationType: 'INSERT',
        payload: newReceiptItem,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0
      });

      // 3. Create stock movement
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

      ops.push({
        id: uuidv4(),
        entityType: 'stock_movements',
        operationType: 'INSERT',
        payload: newStockMovement,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0
      });
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

    ops.push({
      id: uuidv4(),
      entityType: 'purchases',
      operationType: 'UPDATE',
      payload: updatedPurchase,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    });

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
      await db.outbox.bulkAdd(ops);
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

content = content.replace(/};\s*$/, receivePurchaseCode);
fs.writeFileSync('src/lib/repositories.ts', content);
