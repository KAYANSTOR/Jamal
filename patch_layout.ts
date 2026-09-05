import fs from 'fs';

let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

// 1. Add imports
if (!content.includes('PWAInstallButton')) {
  content = content.replace(
    "import { getSettings } from '../../lib/settings';",
    "import { getSettings } from '../../lib/settings';\nimport { PWAInstallButton } from '../PWAInstallButton';\nimport { OfflineIndicator } from '../OfflineIndicator';"
  );
}

// 2. Add PWAInstallButton next to settings in header
content = content.replace(
  '<div className="flex items-center gap-4">',
  '<div className="flex items-center gap-4">\n            <PWAInstallButton />'
);

// 3. Add OfflineIndicator inside main
content = content.replace(
  '<main className="flex-1 overflow-auto p-4 md:p-8 bg-[var(--color-background)]">',
  '<main className="flex-1 overflow-auto p-4 md:p-8 bg-[var(--color-background)]">\n        <OfflineIndicator />'
);

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
