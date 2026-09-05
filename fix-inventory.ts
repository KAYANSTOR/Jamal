import fs from 'fs';

let content = fs.readFileSync('src/pages/PhysicalInventory.tsx', 'utf8');

content = content.replace(
  '<Button variant="outline" className="print:hidden">',
  '<Button variant="outline" className="print:hidden" onClick={() => window.print()}>'
);

fs.writeFileSync('src/pages/PhysicalInventory.tsx', content);
