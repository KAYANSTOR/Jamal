import fs from 'fs';

let content = fs.readFileSync('src/components/dashboard/CentralActivityLog.tsx', 'utf8');

content = content.replace(/\.\.\/ui/g, '../../components/ui');
fs.writeFileSync('src/components/dashboard/CentralActivityLog.tsx', content);

let dashContent = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
if (!dashContent.includes('import { CentralActivityLog }')) {
  dashContent = "import { CentralActivityLog } from '../components/dashboard/CentralActivityLog';\n" + dashContent;
  fs.writeFileSync('src/pages/Dashboard.tsx', dashContent);
}
