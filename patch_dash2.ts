import fs from 'fs';

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Fix Product search
content = content.replace(
  "p.category.toLowerCase().includes(q)",
  "p.name.toLowerCase().includes(q)"
);

// Fix Warehouse search
content = content.replace(
  "(w.location && w.location.toLowerCase().includes(q))",
  "false"
);

// Fix category display
content = content.replace(
  '<div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{p.category}</div>',
  '<div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{p.sku || ""}</div>'
);

// Fix location display
content = content.replace(
  '<div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{w.location || \'بدون عنوان\'}</div>',
  '<div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">مخزن</div>'
);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
