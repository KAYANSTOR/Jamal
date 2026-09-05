import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('./pages/Settings')) {
  content = content.replace(
    "import { PhysicalInventory } from './pages/PhysicalInventory';",
    "import { PhysicalInventory } from './pages/PhysicalInventory';\nimport { Settings } from './pages/Settings';"
  );
  
  content = content.replace(
    "<Route path=\"*\" element={<Dashboard />} />",
    "<Route path=\"/settings\" element={<Settings />} />\n        <Route path=\"*\" element={<Dashboard />} />"
  );
  fs.writeFileSync('src/App.tsx', content);
}
