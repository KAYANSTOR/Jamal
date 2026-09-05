import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('/reports')) {
  content = content.replace(
    "import { StockTransfers } from './pages/StockTransfers';",
    "import { StockTransfers } from './pages/StockTransfers';\nimport { Reports } from './pages/Reports';\nimport { OpeningBalances } from './pages/OpeningBalances';\nimport { PhysicalInventory } from './pages/PhysicalInventory';"
  );
  
  content = content.replace(
    "<Route path=\"/transfers\" element={<StockTransfers />} />",
    "<Route path=\"/transfers\" element={<StockTransfers />} />\n        <Route path=\"/reports\" element={<Reports />} />\n        <Route path=\"/opening-balances\" element={<OpeningBalances />} />\n        <Route path=\"/inventory-count\" element={<PhysicalInventory />} />"
  );
  fs.writeFileSync('src/App.tsx', content);
}
