import fs from 'fs';

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Replace the recent activities card with CentralActivityLog
const startStr = "<Card className=\"shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)]\">";
const searchStr = "أحدث العمليات";

// We know it starts at the last `<Card` before the end of the AppLayout
const startIdx = content.lastIndexOf(startStr);
const endIdx = content.indexOf("</AppLayout>", startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + "      <CentralActivityLog />\n    " + content.slice(endIdx);
}

// Add import if not exists
if (!content.includes('CentralActivityLog')) {
  content = "import { CentralActivityLog } from '../components/dashboard/CentralActivityLog';\n" + content;
}

// Clean up unused stuff like `recentActivity`, `isNegativeMovement`, `getOpTypeLabel` since they are no longer used in Dashboard
content = content.replace(/const recentActivity = movements\.slice\(0, 10\);/g, '');
content = content.replace(/const getOpTypeLabel = \(type: string\) => {[^}]*};/gs, '');
content = content.replace(/const isNegativeMovement = \(type: string\) => {[^}]*};/gs, '');

fs.writeFileSync('src/pages/Dashboard.tsx', content);
