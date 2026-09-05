import fs from 'fs';

let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

// Undo the wrapper
content = content.replace(
  '<div className="flex flex-col min-h-screen w-full bg-[var(--color-background)]">\n      <ConnectionStatusBar />\n      <div className="flex flex-1 w-full relative pb-16 lg:pb-0">',
  '<div className="flex min-h-screen w-full bg-[var(--color-background)] pb-16 lg:pb-0">'
);

content = content.replace(
  '      </main>\n      </div>\n    </div>\n  );\n}',
  '      </main>\n    </div>\n  );\n}'
);

// Add inside main
content = content.replace(
  '<main className="flex flex-1 flex-col overflow-hidden lg:ps-[84px]">\n        {/* Premium Header */}',
  '<main className="flex flex-1 flex-col overflow-hidden lg:ps-[84px]">\n        <ConnectionStatusBar />\n        {/* Premium Header */}'
);

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
