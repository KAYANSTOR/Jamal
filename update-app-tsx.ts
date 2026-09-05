import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('StockTransfers')) {
  // 1. Add import
  content = content.replace(
    "import { MaterialReturns } from './pages/MaterialReturns';",
    "import { MaterialReturns } from './pages/MaterialReturns';\nimport { StockTransfers } from './pages/StockTransfers';"
  );
  
  // 2. Add Route
  content = content.replace(
    "<Route path=\"/returns\" element={<MaterialReturns />} />",
    "<Route path=\"/returns\" element={<MaterialReturns />} />\n          <Route path=\"/transfers\" element={<StockTransfers />} />"
  );
  
  fs.writeFileSync('src/App.tsx', content);
}
