import fs from 'fs';

let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

// Import
if (!content.includes('ConnectionStatusBar')) {
  content = content.replace(
    "import { OfflineIndicator } from '../OfflineIndicator';",
    "import { OfflineIndicator } from '../OfflineIndicator';\nimport { ConnectionStatusBar } from '../ConnectionStatusBar';"
  );
}

// Open div
content = content.replace(
  '<div className="flex min-h-screen w-full bg-[var(--color-background)] pb-16 lg:pb-0">',
  '<div className="flex flex-col min-h-screen w-full bg-[var(--color-background)]">\n      <ConnectionStatusBar />\n      <div className="flex flex-1 w-full relative pb-16 lg:pb-0">'
);

// Close div
content = content.replace(
  '      </main>\n    </div>\n  );\n}',
  '      </main>\n      </div>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
