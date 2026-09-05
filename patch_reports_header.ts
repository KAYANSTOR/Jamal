import fs from 'fs';

let content = fs.readFileSync('src/pages/Reports.tsx', 'utf8');

const headerHTML = `        {/* System Branding Header for PDF Export */}
        <div className="pdf-only flex items-center justify-between p-8 border-b-2 border-slate-200 mb-6 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 text-white rounded-xl">
              <Package size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">نظام إدارة المخزون المتقدم</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">تقرير نظام معتمد - {format(new Date(), 'dd MMMM yyyy', { locale: arSA })}</p>
            </div>
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-slate-800">مؤسسة الأعمال المتقدمة</div>
            <div className="text-xs text-slate-500 mt-1">الرقم الضريبي: 300000000000003</div>
          </div>
        </div>

        <CardHeader`;

content = content.replace('        <CardHeader', headerHTML);

fs.writeFileSync('src/pages/Reports.tsx', content);
