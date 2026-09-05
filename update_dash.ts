import fs from 'fs';

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Add Input import
if (!content.includes("import { Input } from '../components/ui/input';")) {
  content = content.replace(
    "import { Button } from '../components/ui/button';",
    "import { Button } from '../components/ui/button';\nimport { Input } from '../components/ui/input';"
  );
}

// 2. Add Search, X icons
content = content.replace(
  "Undo2\n} from 'lucide-react';",
  "Undo2, Search, X\n} from 'lucide-react';"
);

// 3. Add states for search
const stateHookStr = `  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);`;

content = content.replace("  const navigate = useNavigate();", stateHookStr);

// 4. Add searchResults memo right before chartData
const searchMemoStr = `
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { products: [], warehouses: [] };
    const q = searchQuery.toLowerCase();
    
    const matchedProducts = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedWarehouses = warehouses.filter(w => 
      w.name.toLowerCase().includes(q) || 
      (w.location && w.location.toLowerCase().includes(q))
    ).slice(0, 5);

    return { products: matchedProducts, warehouses: matchedWarehouses };
  }, [searchQuery, products, warehouses]);

  // Chart data: past 7 days`;

content = content.replace("  // Chart data: past 7 days", searchMemoStr);

// 5. Add search bar UI inside the layout, before TOP METRICS
const searchUI = `
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
                                 <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{p.category}</div>
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
                                 <div className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{w.location || 'بدون عنوان'}</div>
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

        {/* TOP METRICS */}`;

content = content.replace(
  '<div className="flex flex-col gap-8 pb-10">\n        \n        {/* TOP METRICS */}',
  searchUI
);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
