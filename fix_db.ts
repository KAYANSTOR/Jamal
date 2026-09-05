import fs from 'fs';
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

// The sed command replaced ALL "date: string;" with "date: string;\n  referenceId?: string;"
// Let's remove all referenceId?: string; then add it ONLY to LocalStockMovement

content = content.replace(/\n  referenceId\?: string;/g, '');

const index = content.indexOf('export interface LocalStockMovement {');
const endIndex = content.indexOf('}', index);

if (index !== -1 && endIndex !== -1) {
  const substr = content.substring(index, endIndex);
  if (!substr.includes('referenceId?: string;')) {
    const replaced = substr.replace('date: string;', 'date: string;\n  referenceId?: string;');
    content = content.substring(0, index) + replaced + content.substring(endIndex);
  }
}

fs.writeFileSync('src/lib/db.ts', content);
