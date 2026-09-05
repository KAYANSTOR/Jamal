import fs from 'fs';
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

const interfaceStr = `
export interface LocalStockTransferDraft {
  id: string; // TRF-...
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  date: string;
  items: { variantId: string; quantity: string }[];
  notes?: string;
}
`;

content = content.replace('export interface LocalStockMovement', interfaceStr + '\nexport interface LocalStockMovement');

content = content.replace(
  'outbox: EntityTable<OutboxOperation, \'id\'>;',
  'outbox: EntityTable<OutboxOperation, \'id\'>;\n  stockTransferDrafts: EntityTable<LocalStockTransferDraft, \'id\'>;'
);

content = content.replace(
  'db.version(6).stores({',
  'db.version(7).stores({\n  stockTransferDrafts: \'id, sourceWarehouseId, destinationWarehouseId, date\','
);

fs.writeFileSync('src/lib/db.ts', content);
