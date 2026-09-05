import fs from 'fs';
const path = '/app/applet/src/components/layout/AppLayout.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `{/* Logo - Desktop Only */}
        <div className="hidden lg:flex shrink-0 items-center justify-center border-b border-[#3F3F46]/50 w-full pb-6 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#A67C3A] to-[#C59D5F] text-white shadow-[0_4px_10px_rgba(197,157,95,0.3)]">
            <Package size={26} strokeWidth={2.5} />
          </div>
        </div>`;

const replacement = `{/* Logo - Desktop Only */}
        <div className="hidden lg:flex shrink-0 items-center justify-center border-b border-[#3F3F46]/50 w-full pb-6 mb-2">
          <div className="relative group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#A67C3A] to-[#C59D5F] text-white shadow-[0_4px_10px_rgba(197,157,95,0.3)] cursor-pointer">
              <Building2 size={26} strokeWidth={2.5} />
            </div>
            {/* Tooltip for System Name */}
            <div className="absolute start-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#27272A] text-white text-sm font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 border border-[#3F3F46]">
              إدارة المؤسسة
            </div>
          </div>
        </div>`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
