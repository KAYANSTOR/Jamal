import fs from 'fs';
let content = fs.readFileSync('src/lib/db.ts', 'utf8');

if (!content.includes('notes?: string; // Stored as string')) {
  content = content.replace(
    'referenceId?: string;',
    'referenceId?: string;\n  notes?: string; // Stored as string to maintain Decimal precision'
  );
  fs.writeFileSync('src/lib/db.ts', content);
}
