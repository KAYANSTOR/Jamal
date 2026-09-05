import fs from 'fs';
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
content = content.replace(
  '<div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{p.sku || ""}</div>',
  '<div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">منتج</div>'
);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
