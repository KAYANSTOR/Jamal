import fs from 'fs';
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

// check if stockTransfers exists
console.log(content.includes('stockTransfers'));
