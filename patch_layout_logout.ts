import fs from 'fs';
const path = '/app/applet/src/components/layout/AppLayout.tsx';
let content = fs.readFileSync(path, 'utf8');

const authImport = `import { ConnectionStatusBar } from '../ConnectionStatusBar';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';`;
content = content.replace("import { ConnectionStatusBar } from '../ConnectionStatusBar';", authImport);

const userIconDesktop = `<div className="relative group outline-none flex justify-center mt-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#18181B] text-[#C59D5F] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.05)] border border-[#C59D5F]/30 cursor-pointer" onClick={() => signOut(auth)}>
              <User size={18} />
            </div>
            <div className="absolute start-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#27272A] text-white text-sm font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 border border-[#3F3F46]">
              تسجيل الخروج
            </div>
          </div>`;

content = content.replace(/<div className="relative group outline-none flex justify-center mt-1">\s*<div className="flex h-11 w-11 items-center justify-center rounded-full bg-\[#18181B\] text-\[#C59D5F\].*?>\s*<User size=\{18\} \/>\s*<\/div>\s*<div className="absolute start-16 top-1\/2.*?">\s*مدير النظام\s*<\/div>\s*<\/div>/s, userIconDesktop);

fs.writeFileSync(path, content);
