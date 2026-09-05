import Dexie, { type EntityTable } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

export interface LocalWarehouse {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export interface LocalCategory {
  id: string;
  name: string;
  description?: string;
}

export interface LocalUnit {
  id: string;
  name: string;
  symbol?: string;
}

export interface LocalProduct {
  id: string;
  name: string;
  categoryId?: string;
  description?: string;
  minStockLevel?: string;
  createdAt: string;
}

export interface LocalVariant {
  id: string;
  productId: string;
  unitId?: string;
  name: string;
  sku?: string;
  barcode?: string;
  attributes?: string;
}

export interface LocalStockTransferDraft {
  id: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  date: string;
  items: { variantId: string; quantity: string }[];
  notes?: string;
}

export interface LocalStockMovement {
  id: string;
  operationId: string;
  warehouseId: string;
  variantId: string;
  type: string;
  quantity: string;
  date: string;
  referenceId?: string;
  notes?: string;
}

export interface LocalSupplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export interface LocalPurchase {
  id: string;
  supplierId: string;
  warehouseId: string;
  invoiceNumber?: string;
  status: string;
  totalAmount: string;
  date: string;
  createdAt: string;
}

export interface LocalPurchaseItem {
  id: string;
  purchaseId: string;
  variantId: string;
  quantity: string;
  receivedQuantity: string;
  unitCost: string;
  totalCost: string;
}

export interface LocalPurchaseReceipt {
  id: string;
  purchaseId: string;
  warehouseId: string;
  receiptNumber?: string;
  date: string;
  status: string;
  createdAt: string;
}

export interface LocalPurchaseReceiptItem {
  id: string;
  receiptId: string;
  purchaseItemId: string;
  variantId: string;
  quantity: string;
}

export interface LocalSupplierLedger {
  id: string;
  supplierId: string;
  type: string;
  referenceId: string;
  amount: string;
  date: string;
}

export interface LocalSupplierPayment {
  id: string;
  supplierId: string;
  amount: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface LocalDepartment {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface LocalMaterialIssue {
  id: string;
  departmentId: string;
  warehouseId: string;
  issueNumber?: string;
  status: string;
  issuedBy: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface LocalMaterialIssueItem {
  id: string;
  issueId: string;
  variantId: string;
  quantity: string;
  returnedQuantity?: string;
  exchangedQuantity?: string;
}

export interface OutboxOperation {
  id: string;
  entityType: string;
  operationType: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'CONFLICT';
  createdAt: string;
  updatedAt?: string;
  retryCount: number;
  errorReason?: string;
}

const db = new Dexie('StockLedgerDB') as Dexie & {
  categories: EntityTable<LocalCategory, 'id'>;
  units: EntityTable<LocalUnit, 'id'>;
  warehouses: EntityTable<LocalWarehouse, 'id'>;
  products: EntityTable<LocalProduct, 'id'>;
  variants: EntityTable<LocalVariant, 'id'>;
  stockMovements: EntityTable<LocalStockMovement, 'id'>;
  suppliers: EntityTable<LocalSupplier, 'id'>;
  purchases: EntityTable<LocalPurchase, 'id'>;
  purchaseItems: EntityTable<LocalPurchaseItem, 'id'>;
  purchaseReceipts: EntityTable<LocalPurchaseReceipt, 'id'>;
  purchaseReceiptItems: EntityTable<LocalPurchaseReceiptItem, 'id'>;
  supplierLedger: EntityTable<LocalSupplierLedger, 'id'>;
  supplierPayments: EntityTable<LocalSupplierPayment, 'id'>;
  departments: EntityTable<LocalDepartment, 'id'>;
  materialIssues: EntityTable<LocalMaterialIssue, 'id'>;
  materialIssueItems: EntityTable<LocalMaterialIssueItem, 'id'>;
  outbox: EntityTable<OutboxOperation, 'id'>;
  stockTransferDrafts: EntityTable<LocalStockTransferDraft, 'id'>;
};

db.version(7).stores({
  stockTransferDrafts: 'id, sourceWarehouseId, destinationWarehouseId, date',
  categories: 'id, name',
  units: 'id, name',
  warehouses: 'id, name, status',
  products: 'id, name, categoryId',
  variants: 'id, productId',
  stockMovements: 'id, operationId, warehouseId, variantId, type, date',
  suppliers: 'id, name',
  purchases: 'id, supplierId, warehouseId, status, date',
  purchaseItems: 'id, purchaseId, variantId',
  purchaseReceipts: 'id, purchaseId, warehouseId, date',
  purchaseReceiptItems: 'id, receiptId, purchaseItemId',
  supplierLedger: 'id, supplierId, referenceId',
  supplierPayments: 'id, supplierId, date',
  departments: 'id, name',
  materialIssues: 'id, departmentId, warehouseId, status, date',
  materialIssueItems: 'id, issueId, variantId',
  outbox: 'id, status, entityType, createdAt, updatedAt'
});

export { db };

// ──────────────────────────────────────────────
// Robust Sync Engine — multi-device + auto reconnect
// ──────────────────────────────────────────────

const SYNC_INTERVAL_MS = 45_000; // periodic push+pull while online
const HEALTH_TIMEOUT_MS = 4_000;
const MAX_RETRY = 8;

function ensureDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = `DEV-${uuidv4().slice(0, 8)}`;
    localStorage.setItem('device_id', id);
  }
  return id;
}

function setLastSyncAt(iso: string) {
  localStorage.setItem('last_sync_at', iso);
}

function getLastSyncAt(): string | null {
  return localStorage.getItem('last_sync_at');
}

export const syncEngine = {
  isSyncing: false,
  isPulling: false,
  _started: false,
  _intervalId: null as ReturnType<typeof setInterval> | null,
  _onlineHandler: null as (() => void) | null,
  _offlineHandler: null as (() => void) | null,

  /** Real connectivity check (navigator.onLine alone is unreliable) */
  async isReallyOnline(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  },

  async addOperation(entityType: string, operationType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
    const op: OutboxOperation = {
      id: `OP-${uuidv4()}`,
      entityType,
      operationType,
      payload,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
    };

    await db.outbox.add(op);

    // Optimistic local write
    if (operationType === 'INSERT' || operationType === 'UPDATE') {
      if (entityType === 'stock_movements') {
        await db.stockMovements.put({ ...payload, operationId: op.id });
      } else if (entityType === 'warehouses') {
        await db.warehouses.put(payload);
      } else if (entityType === 'categories') {
        await db.categories.put(payload);
      } else if (entityType === 'units') {
        await db.units.put(payload);
      } else if (entityType === 'products') {
        await db.products.put(payload);
      } else if (entityType === 'productVariants') {
        await db.variants.put(payload);
      } else if (entityType === 'departments') {
        await db.departments.put(payload);
      } else if (entityType === 'CREATE_MATERIAL_ISSUE') {
        const { id, items, ...rest } = payload;
        await db.materialIssues.put({ id, status: 'POSTED', ...rest });
        for (const item of items) {
          await db.materialIssueItems.put({ ...item, issueId: id });
        }
      } else if (entityType === 'CREATE_PURCHASE') {
        const { id, items, ...rest } = payload;
        await db.purchases.put({ id, status: 'CONFIRMED', ...rest });
        for (const item of items) {
          await db.purchaseItems.put({ ...item, purchaseId: id, receivedQuantity: '0' });
        }
      } else if (entityType === 'RECEIVE_PURCHASE') {
        const { id, items, purchaseId, ...rest } = payload;
        await db.purchaseReceipts.put({ id, purchaseId, ...rest, status: 'POSTED' });
        for (const item of items) {
          await db.purchaseReceiptItems.put({ ...item, receiptId: id });
          const pItem = await db.purchaseItems.get(item.purchaseItemId);
          if (pItem) {
            const newReceived = (parseFloat(pItem.receivedQuantity) + parseFloat(item.quantity)).toString();
            await db.purchaseItems.update(pItem.id, { receivedQuantity: newReceived });
          }
        }
      } else if (entityType === 'CREATE_SUPPLIER_PAYMENT') {
        await db.supplierPayments.put(payload);
      } else if (entityType === 'RETURN_MATERIAL_ISSUE') {
        for (const item of payload.items) {
          const issueItem = await db.materialIssueItems.get(item.issueItemId);
          if (issueItem) {
            const newReturned = (parseFloat(issueItem.returnedQuantity || '0') + parseFloat(item.returnQuantity)).toString();
            await db.materialIssueItems.update(issueItem.id, { returnedQuantity: newReturned });
          }
        }
      } else if (entityType === 'EXCHANGE_MATERIAL_ISSUE') {
        for (const item of payload.items) {
          const issueItem = await db.materialIssueItems.get(item.issueItemId);
          if (issueItem) {
            const newExchanged = (parseFloat(issueItem.exchangedQuantity || '0') + parseFloat(item.exchangeQuantity)).toString();
            await db.materialIssueItems.update(issueItem.id, { exchangedQuantity: newExchanged });
          }
        }
      } else if (entityType === 'CANCEL_MATERIAL_ISSUE') {
        await db.materialIssues.update(payload.id, { status: 'CANCELLED' });
      }
    }

    // Fire-and-forget push attempt
    this.triggerSync();
    return op.id;
  },

  async recoverStuckOperations() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const stuckOps = await db.outbox
      .where('status')
      .equals('SYNCING')
      .and((op) => (op.updatedAt || op.createdAt) < fiveMinutesAgo)
      .toArray();

    if (stuckOps.length > 0) {
      console.warn(`[sync] Recovering ${stuckOps.length} stuck operations...`);
      await Promise.all(
        stuckOps.map((op) =>
          db.outbox.update(op.id, { status: 'PENDING', updatedAt: new Date().toISOString() })
        )
      );
    }
  },

  /**
   * Push local outbox to cloud.
   * Returns true if at least one op was successfully synced.
   */
  async triggerSync(force = false): Promise<boolean> {
    if (this.isSyncing && !force) return false;

    const online = await this.isReallyOnline();
    if (!online) return false;

    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    this.isSyncing = true;
    let anySuccess = false;

    try {
      await this.recoverStuckOperations();

      const pendingOps = await db.outbox
        .where('status')
        .anyOf('PENDING', 'FAILED')
        .and((op) => op.retryCount < MAX_RETRY)
        .toArray();

      if (pendingOps.length === 0) {
        return false;
      }

      const now = new Date().toISOString();
      await Promise.all(
        pendingOps.map((op) =>
          db.outbox.update(op.id, {
            status: 'SYNCING',
            updatedAt: now,
            retryCount: op.retryCount + 1,
          })
        )
      );

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceId: ensureDeviceId(),
          operations: pendingOps,
        }),
      });

      if (!response.ok) {
        // Put them back to FAILED so retry logic kicks in
        await Promise.all(
          pendingOps.map((op) =>
            db.outbox.update(op.id, {
              status: 'FAILED',
              updatedAt: new Date().toISOString(),
              errorReason: `HTTP ${response.status}`,
            })
          )
        );
        throw new Error(`Sync API failed: ${response.status}`);
      }

      const { results } = await response.json();

      for (const res of results) {
        if (res.status === 'success' || res.status === 'already_synced') {
          await db.outbox.delete(res.id);
          anySuccess = true;
        } else if (res.status === 'conflict') {
          await db.outbox.update(res.id, {
            status: 'CONFLICT',
            errorReason: res.reason || res.message,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await db.outbox.update(res.id, {
            status: 'FAILED',
            errorReason: res.message || res.reason,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      if (anySuccess) {
        setLastSyncAt(new Date().toISOString());
      }
    } catch (err) {
      console.error('[sync] Push failed:', err);
    } finally {
      this.isSyncing = false;

      // Exponential backoff for remaining failed items
      const failedOps = await db.outbox.where('status').equals('FAILED').toArray();
      if (failedOps.length > 0) {
        const minRetry = Math.min(...failedOps.map((o) => o.retryCount));
        const delay = Math.min(1000 * Math.pow(2, minRetry), 60_000);
        setTimeout(() => this.triggerSync(), delay);
      }
    }

    return anySuccess;
  },

  /**
   * Pull full snapshot from cloud and replace local tables.
   * Safe to call after push so other devices' changes appear.
   */
  async pullFromCloud(): Promise<boolean> {
    if (this.isPulling) return false;

    const online = await this.isReallyOnline();
    if (!online) return false;

    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    this.isPulling = true;
    try {
      const response = await fetch('/api/pull', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        console.warn('[sync] Pull failed:', response.status);
        return false;
      }

      const data = await response.json();

      await db.transaction(
        'rw',
        [
          db.warehouses,
          db.products,
          db.variants,
          db.stockMovements,
          db.categories,
          db.units,
          db.suppliers,
          db.purchases,
          db.purchaseItems,
          db.purchaseReceipts,
          db.purchaseReceiptItems,
          db.supplierLedger,
          db.supplierPayments,
          db.departments,
          db.materialIssues,
          db.materialIssueItems,
        ],
        async () => {
          await db.warehouses.clear();
          if (data.warehouses?.length) await db.warehouses.bulkAdd(data.warehouses);

          await db.categories.clear();
          if (data.categories?.length) await db.categories.bulkAdd(data.categories);

          await db.units.clear();
          if (data.units?.length) await db.units.bulkAdd(data.units);

          await db.products.clear();
          if (data.products?.length) await db.products.bulkAdd(data.products);

          await db.variants.clear();
          if (data.productVariants?.length) await db.variants.bulkAdd(data.productVariants);

          await db.stockMovements.clear();
          if (data.stockMovements?.length) await db.stockMovements.bulkAdd(data.stockMovements);

          await db.suppliers.clear();
          if (data.suppliers?.length) await db.suppliers.bulkAdd(data.suppliers);

          await db.purchases.clear();
          if (data.purchases?.length) await db.purchases.bulkAdd(data.purchases);

          await db.purchaseItems.clear();
          if (data.purchaseItems?.length) await db.purchaseItems.bulkAdd(data.purchaseItems);

          await db.purchaseReceipts.clear();
          if (data.purchaseReceipts?.length) await db.purchaseReceipts.bulkAdd(data.purchaseReceipts);

          await db.purchaseReceiptItems.clear();
          if (data.purchaseReceiptItems?.length) await db.purchaseReceiptItems.bulkAdd(data.purchaseReceiptItems);

          await db.supplierLedger.clear();
          if (data.supplierLedger?.length) await db.supplierLedger.bulkAdd(data.supplierLedger);

          await db.supplierPayments.clear();
          if (data.supplierPayments?.length) await db.supplierPayments.bulkAdd(data.supplierPayments);

          await db.departments.clear();
          if (data.departments?.length) await db.departments.bulkAdd(data.departments);

          await db.materialIssues.clear();
          if (data.materialIssues?.length) await db.materialIssues.bulkAdd(data.materialIssues);

          await db.materialIssueItems.clear();
          if (data.materialIssueItems?.length) await db.materialIssueItems.bulkAdd(data.materialIssueItems);
        }
      );

      setLastSyncAt(new Date().toISOString());
      window.dispatchEvent(new CustomEvent('sync_pulled'));
      return true;
    } catch (error) {
      console.error('[sync] Pull failed:', error);
      return false;
    } finally {
      this.isPulling = false;
    }
  },

  /** Alias kept for backward compatibility */
  async initialPull() {
    return this.pullFromCloud();
  },

  /**
   * Full cycle used on reconnect and on interval:
   * 1. Push local outbox
   * 2. Pull remote changes (so other devices appear)
   */
  async fullSync() {
    const online = await this.isReallyOnline();
    if (!online) return;

    await this.triggerSync(true);
    // Always pull after push so multi-device data is refreshed
    await this.pullFromCloud();
  },

  /** Start background listeners + periodic sync. Call once after login. */
  start() {
    if (this._started) return;
    this._started = true;

    ensureDeviceId();

    // Auto-sync when browser reports online again
    this._onlineHandler = () => {
      console.log('[sync] Online event → fullSync');
      // Small delay so network is actually ready
      setTimeout(() => this.fullSync(), 800);
    };
    this._offlineHandler = () => {
      console.log('[sync] Offline event');
    };

    window.addEventListener('online', this._onlineHandler);
    window.addEventListener('offline', this._offlineHandler);

    // Periodic sync while the app is open
    this._intervalId = setInterval(() => {
      if (navigator.onLine) {
        this.fullSync();
      }
    }, SYNC_INTERVAL_MS);

    // Immediate attempt
    this.fullSync();
  },

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    if (this._onlineHandler) {
      window.removeEventListener('online', this._onlineHandler);
      this._onlineHandler = null;
    }
    if (this._offlineHandler) {
      window.removeEventListener('offline', this._offlineHandler);
      this._offlineHandler = null;
    }
    this._started = false;
  },

  getLastSyncAt,
};

// Keep the old global listener as a safety net (start() is preferred)
window.addEventListener('online', () => {
  setTimeout(() => syncEngine.fullSync(), 500);
});
