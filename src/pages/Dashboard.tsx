import React, { useState, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format, subDays } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useNavigate } from 'react-router';
import { CentralActivityLog } from '../components/dashboard/CentralActivityLog';
import { 
  ArrowUpRight, ArrowDownRight, Package, AlertCircle, 
  ShoppingCart, FileText, ArrowLeftRight, Activity, Plus, Database, Warehouse as WarehouseIcon,
  Users, Building2, ClipboardCheck, Scale, Undo2, Search, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export function Dashboard() {
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  
  // Local-First Data Fetching
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const stockMovements = useLiveQuery(() => db.stockMovements.toArray()) || [];
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  // Calculate Balances & Alerts
  const { totalQty, lowStockItems, todayOperations } = useMemo(() => {
    const variantBalances: Record<string, number> = {};
    let todayOps = 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    stockMovements.forEach(m => {
      const qty = parseFloat(m.quantity);
      const isNegative = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
      const sign = isNegative ? -1 : 1;
      variantBalances[m.variantId] = (variantBalances[m.variantId] || 0) + (qty * sign);
      
      if (m.date.startsWith(todayStr)) {
        todayOps++;
      }
    });

    let total = 0;
    const productBalances: Record<string, number> = {};
    variants.forEach(v => {
      const bal = variantBalances[v.id] || 0;
      productBalances[v.productId] = (productBalances[v.productId] || 0) + bal;
      if (bal > 0) total += bal;
    });

    const alerts = [];
    products.forEach(p => {
      if (p.minStockLevel) {
        const threshold = parseFloat(p.minStockLevel);
        const currentBal = productBalances[p.id] || 0;
        if (currentBal <= threshold) {
          alerts.push({ product: p, balance: currentBal, threshold });
        }
      } else {
         const currentBal = productBalances[p.id] || 0;
         if (currentBal > 0 && currentBal <= 5) {
            alerts.push({ product: p, balance: currentBal, threshold: 5 });
         }
      }
    });

    return { totalQty: total, lowStockItems: alerts, todayOperations: todayOps };
  }, [products, variants, stockMovements]);


  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { products: [], warehouses: [] };
    const q = searchQuery.toLowerCase();
    
    const matchedProducts = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.name.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedWarehouses = warehouses.filter(w => 
      w.name.toLowerCase().includes(q) || 
      false
    ).slice(0, 5);

    return { products: matchedProducts, warehouses: matchedWarehouses };
  }, [searchQuery, products, warehouses]);

  // Chart data: past 7 days
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      
      let inQty = 0;
      let outQty = 0;
      
      stockMovements.forEach(m => {
        if (m.date.startsWith(dateStr)) {
          const qty = parseFloat(m.quantity);
          const isNegative = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
          if (isNegative) outQty += qty;
          else inQty += qty;
        }
      });
      
      data.push({
        date: format(d, 'dd MMM', { locale: arSA }),
        'وارد': inQty,
        'منصرف': outQty
      });
    }
    return data;
  }, [stockMovements]);

  const currentDate = format(new Date(), 'EEEE، dd MMMM yyyy', { locale: arSA });

  const metrics = [
    { title: 'إجمالي الكميات', value: totalQty.toLocaleString(), icon: <Database size={20} className="text-[var(--color-primary)]" />, trend: 'إجمالي الأرصدة المتاحة' },
    { title: 'المخازن النشطة', value: warehouses.length, icon: <WarehouseIcon size={20} className="text-emerald-500" />, trend: 'موزعة في النظام' },
    { title: 'نواقص المخزون', value: lowStockItems.length, icon: <AlertCircle size={20} className="text-rose-500" />, trend: 'أصناف تحتاج إعادة طلب' },
    { title: 'حركات اليوم', value: todayOperations, icon: <Activity size={20} className="text-blue-500" />, trend: 'عملية مسجلة هذا اليوم' },
  ];

  return (
    <AppLayout 
      pageTitle="لوحة القيادة" 
      headerSubtitle={currentDate}
    >
      
      <div className="flex flex-col gap-8 pb-10">
        
        {/* SMART SEARCH */}
        <div className="relative z-50">
          <div className="relative group">
            <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] group-focus-within:text-[var(--color-primary)] transition-colors" size={20} />
            <Input 
              placeholder="البحث الذكي: ابحث عن المنتجات، المخازن، أو الأقسام..." 
              className="w-full ps-12 pe-12 py-7 text-base rounded-2xl shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] bg-[var(--color-surface)]"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" className="absolute end-2 top-1/2 -translate-y-1/2 hover:bg-[var(--color-muted)] rounded-xl" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </Button>
            )}
          </div>

          {showResults && searchQuery && (
             <Card className="absolute top-full left-0 right-0 mt-3 shadow-[var(--shadow-elevation)] border-0 ring-1 ring-[var(--color-border)] overflow-hidden rounded-2xl animate-in fade-in slide-in-from-top-4 duration-200">
               <div className="max-h-[400px] overflow-y-auto p-2">
                  {searchResults.products.length > 0 && (
                     <div className="mb-2">
                        <div className="text-xs font-bold text-[var(--color-muted-foreground)] px-3 pb-2 pt-2 uppercase tracking-wider">الأصناف والمنتجات</div>
                        {searchResults.products.map(p => (
                           <div key={p.id} className="flex items-center gap-4 p-3 hover:bg-[var(--color-muted)]/50 rounded-xl cursor-pointer transition-colors" onMouseDown={() => navigate('/products')}>
                              <div className="p-2.5 bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)] rounded-xl">
                                 <Package size={18} />
                              </div>
                              <div>
                                 <div className="font-semibold text-sm text-[var(--color-foreground)]">{p.name}</div>
                                 <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">منتج</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
                  {searchResults.warehouses.length > 0 && (
                     <div>
                        <div className="text-xs font-bold text-[var(--color-muted-foreground)] px-3 pb-2 pt-2 uppercase tracking-wider">المخازن</div>
                        {searchResults.warehouses.map(w => (
                           <div key={w.id} className="flex items-center gap-4 p-3 hover:bg-[var(--color-muted)]/50 rounded-xl cursor-pointer transition-colors" onMouseDown={() => navigate('/warehouses')}>
                              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                 <WarehouseIcon size={18} />
                              </div>
                              <div>
                                 <div className="font-semibold text-sm text-[var(--color-foreground)]">{w.name}</div>
                                 <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">مخزن</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
                  {searchResults.products.length === 0 && searchResults.warehouses.length === 0 && (
                     <div className="p-8 text-center flex flex-col items-center justify-center">
                        <Search size={32} className="text-[var(--color-muted-foreground)] opacity-50 mb-3" />
                        <div className="text-sm font-semibold text-[var(--color-foreground)]">لا توجد نتائج تطابق بحثك</div>
                        <div className="text-xs text-[var(--color-muted-foreground)] mt-1">حاول استخدام كلمات مفتاحية أخرى</div>
                     </div>
                  )}
               </div>
             </Card>
          )}
        </div>

        {/* TOP METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, i) => (
            <Card key={i} className="border-0 shadow-sm ring-1 ring-[var(--color-border)] hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[var(--color-muted-foreground)]">{m.title}</p>
                    <p className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">{m.value}</p>
                  </div>
                  <div className="p-3 bg-[var(--color-muted)]/30 rounded-2xl">
                    {m.icon}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-muted-foreground)]">{m.trend}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* OPERATIONS GRID */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity size={20} className="text-[var(--color-primary)]" />
            بوابة العمليات والموارد
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <Button 
              variant="outline" 
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 hover:border-[var(--color-primary)]/50 transition-all group"
              onClick={() => navigate('/purchases')}
            >
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600 group-hover:scale-110 transition-transform">
                <ShoppingCart size={24} />
              </div>
              <span className="font-semibold text-sm">المشتريات</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 hover:border-[var(--color-primary)]/50 transition-all group"
              onClick={() => navigate('/issues')}
            >
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-600 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <span className="font-semibold text-sm">صرف داخلي</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 hover:border-[var(--color-primary)]/50 transition-all group"
              onClick={() => navigate('/returns')}
            >
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform">
                <Undo2 size={24} />
              </div>
              <span className="font-semibold text-sm">المرتجعات</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 hover:border-[var(--color-primary)]/50 transition-all group"
              onClick={() => navigate('/transfers')}
            >
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-600 group-hover:scale-110 transition-transform">
                <ArrowLeftRight size={24} />
              </div>
              <span className="font-semibold text-sm">تحويل بين المخازن</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 hover:border-[var(--color-primary)]/50 transition-all group"
              onClick={() => navigate('/inventory-count')}
            >
              <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-600 group-hover:scale-110 transition-transform">
                <ClipboardCheck size={24} />
              </div>
              <span className="font-semibold text-sm">الجرد والتسويات</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 hover:border-[var(--color-primary)]/50 transition-all group"
              onClick={() => navigate('/opening-balances')}
            >
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-600 group-hover:scale-110 transition-transform">
                <Scale size={24} />
              </div>
              <span className="font-semibold text-sm">أرصدة افتتاحية</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 hover:border-[var(--color-primary)]/50 transition-all group"
              onClick={() => navigate('/suppliers')}
            >
              <div className="p-3 rounded-full bg-teal-500/10 text-teal-600 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <span className="font-semibold text-sm">الموردين</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 px-4 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]/50 hover:border-[var(--color-primary)]/50 transition-all group"
              onClick={() => navigate('/departments')}
            >
              <div className="p-3 rounded-full bg-orange-500/10 text-orange-600 group-hover:scale-110 transition-transform">
                <Building2 size={24} />
              </div>
              <span className="font-semibold text-sm">الأقسام</span>
            </Button>

          </div>
        </div>


        {/* MIDDLE BENTO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CHART AREA */}
          <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-[var(--color-border)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">حركة المخزون</CardTitle>
              <CardDescription>الكميات الواردة والمنصرفة خلال الأسبوع الماضي</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="4 4" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#111', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="وارد" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                    <Area type="monotone" dataKey="منصرف" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* LOW STOCK ALERT */}
          <div className="flex flex-col">
            <Card className="border-0 shadow-sm ring-1 ring-[var(--color-border)] flex-grow flex flex-col">
              <CardHeader className="pb-3 border-b border-[var(--color-border)]">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-500" />
                  نواقص تحتاج الانتباه
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-grow overflow-y-auto">
                {lowStockItems.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[var(--color-muted-foreground)]">
                    جميع الأرصدة في المستويات الآمنة
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]">
                    {lowStockItems.slice(0, 6).map((item, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-[var(--color-muted)]/20 transition-colors">
                        <div>
                          <p className="font-semibold text-sm text-[var(--color-foreground)]">{item.product.name}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">الرصيد: {item.balance} / الحد: {item.threshold}</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate('/purchases')}>
                          شراء
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* BOTTOM BENTO */}
        <div className="w-full">
          <CentralActivityLog />
        </div>

      </div>
    </AppLayout>
  );
}
