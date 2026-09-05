import { db, type LocalWarehouse } from './db';
import { v4 as uuidv4 } from 'uuid';

export const WarehouseRepository = {
  async addWarehouse(data: Omit<LocalWarehouse, 'id' | 'createdAt'>) {
    const newWarehouse: LocalWarehouse = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'warehouses',
      operationType: 'INSERT' as const,
      payload: newWarehouse,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.warehouses, db.outbox], async () => {
      await db.warehouses.put(newWarehouse);
      await db.outbox.add(outboxOp);
    });

    return newWarehouse;
  },

  async updateWarehouse(id: string, data: Partial<Omit<LocalWarehouse, 'id' | 'createdAt'>>) {
    const existing = await db.warehouses.get(id);
    if (!existing) throw new Error('Warehouse not found');

    const updatedWarehouse: LocalWarehouse = {
      ...existing,
      ...data,
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'warehouses',
      operationType: 'UPDATE' as const,
      payload: updatedWarehouse,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.warehouses, db.outbox], async () => {
      await db.warehouses.put(updatedWarehouse);
      await db.outbox.add(outboxOp);
    });

    return updatedWarehouse;
  },
};

export const ProductRepository = {
  async addProduct(
    productData: Omit<import('./db').LocalProduct, 'id' | 'createdAt'>,
    initialVariantData: Omit<import('./db').LocalVariant, 'id' | 'productId'>
  ) {
    const newProduct: import('./db').LocalProduct = {
      ...productData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    const newVariant: import('./db').LocalVariant = {
      ...initialVariantData,
      id: uuidv4(),
      productId: newProduct.id,
    };

    const productOp = {
      id: uuidv4(),
      entityType: 'products',
      operationType: 'INSERT' as const,
      payload: newProduct,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    const variantOp = {
      id: uuidv4(),
      entityType: 'variants',
      operationType: 'INSERT' as const,
      payload: newVariant,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.products, db.variants, db.outbox], async () => {
      await db.products.put(newProduct);
      await db.variants.put(newVariant);
      await db.outbox.add(productOp);
      await db.outbox.add(variantOp);
    });

    return { product: newProduct, variant: newVariant };
  },

  async updateProduct(id: string, data: Partial<Omit<import('./db').LocalProduct, 'id' | 'createdAt'>>) {
    const existing = await db.products.get(id);
    if (!existing) throw new Error('Product not found');

    const updatedProduct = {
      ...existing,
      ...data,
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'products',
      operationType: 'UPDATE' as const,
      payload: updatedProduct,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.products, db.outbox], async () => {
      await db.products.put(updatedProduct);
      await db.outbox.add(outboxOp);
    });

    return updatedProduct;
  },

  async addVariant(variantData: Omit<import('./db').LocalVariant, 'id'>) {
    const newVariant: import('./db').LocalVariant = {
      ...variantData,
      id: uuidv4(),
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'variants',
      operationType: 'INSERT' as const,
      payload: newVariant,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.variants, db.outbox], async () => {
      await db.variants.put(newVariant);
      await db.outbox.add(outboxOp);
    });

    return newVariant;
  },

  async updateVariant(id: string, data: Partial<Omit<import('./db').LocalVariant, 'id' | 'productId'>>) {
    const existing = await db.variants.get(id);
    if (!existing) throw new Error('Variant not found');

    const updatedVariant = {
      ...existing,
      ...data,
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'variants',
      operationType: 'UPDATE' as const,
      payload: updatedVariant,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.variants, db.outbox], async () => {
      await db.variants.put(updatedVariant);
      await db.outbox.add(outboxOp);
    });

    return updatedVariant;
  }
};


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
      if (!pItem) throw new Error(`Purchase item ${rItem.purchaseItemId} not found`);

      const currentReceived = parseFloat(pItem.receivedQuantity || '0');
      const receivingNow = parseFloat(rItem.quantity || '0');
      
      if (receivingNow <= 0) continue; // Only process positive quantities

      const orderedQty = parseFloat(pItem.quantity || '0');
      const newReceived = currentReceived + receivingNow;

      if (newReceived > orderedQty) {
         throw new Error(`Cannot receive more than ordered for item ${pItem.variantId}`);
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


export const SupplierRepository = {
  async addSupplier(data: Omit<import('./db').LocalSupplier, 'id' | 'createdAt'>) {
    const newSupplier: import('./db').LocalSupplier = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'suppliers',
      operationType: 'INSERT' as const,
      payload: newSupplier,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.suppliers, db.outbox], async () => {
      await db.suppliers.put(newSupplier);
      await db.outbox.add(outboxOp);
    });

    return newSupplier;
  },

  async updateSupplier(id: string, data: Partial<Omit<import('./db').LocalSupplier, 'id' | 'createdAt'>>) {
    const existing = await db.suppliers.get(id);
    if (!existing) throw new Error('Supplier not found');

    const updatedSupplier: import('./db').LocalSupplier = {
      ...existing,
      ...data,
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'suppliers',
      operationType: 'UPDATE' as const,
      payload: updatedSupplier,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.suppliers, db.outbox], async () => {
      await db.suppliers.put(updatedSupplier);
      await db.outbox.add(outboxOp);
    });

    return updatedSupplier;
  }
};

export const DepartmentRepository = {
  async addDepartment(data: Omit<import('./db').LocalDepartment, 'id' | 'createdAt'>) {
    const newDepartment: import('./db').LocalDepartment = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'departments',
      operationType: 'INSERT' as const,
      payload: newDepartment,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.departments, db.outbox], async () => {
      await db.departments.put(newDepartment);
      await db.outbox.add(outboxOp);
    });

    return newDepartment;
  },

  async updateDepartment(id: string, data: Partial<Omit<import('./db').LocalDepartment, 'id' | 'createdAt'>>) {
    const existing = await db.departments.get(id);
    if (!existing) throw new Error('Department not found');

    const updatedDepartment: import('./db').LocalDepartment = {
      ...existing,
      ...data,
    };

    const outboxOp = {
      id: uuidv4(),
      entityType: 'departments',
      operationType: 'UPDATE' as const,
      payload: updatedDepartment,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0
    };

    await db.transaction('rw', [db.departments, db.outbox], async () => {
      await db.departments.put(updatedDepartment);
      await db.outbox.add(outboxOp);
    });

    return updatedDepartment;
  }
};


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


export const StockTransferRepository = {
  async saveDraft(draft: Omit<import('./db').LocalStockTransferDraft, 'id'> | import('./db').LocalStockTransferDraft) {
    const id = (draft as any).id || `TRF-${Date.now()}`;
    await db.stockTransferDrafts.put({ ...draft, id });
    return id;
  },

  async deleteDraft(id: string) {
    await db.stockTransferDrafts.delete(id);
  },

  async sendTransfer(draftId: string, transferData: import('./db').LocalStockTransferDraft) {
    const id = draftId || `TRF-${Date.now()}`;
    
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
