import fs from 'fs';

let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

const importSettings = `import { useLiveQuery } from 'dexie-react-hooks';\nimport { db } from '../../lib/db';\nimport { getSettings } from '../../lib/settings';`;

if (!content.includes('getSettings')) {
  content = content.replace("import { Link, useLocation } from 'react-router';", "import { Link, useLocation } from 'react-router';\n" + importSettings);
}

const smartBellComponent = `
function StockAlertsWidget() {
  const settings = getSettings();
  
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const stockMovements = useLiveQuery(() => db.stockMovements.toArray()) || [];

  const alerts = React.useMemo(() => {
    if (!settings.enableLowStockAlerts) return [];
    
    // Group balances by variant
    const variantBalances: Record<string, number> = {};
    for (const m of stockMovements) {
      const qty = parseFloat(m.quantity);
      const isNegative = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
      const sign = isNegative ? -1 : 1;
      variantBalances[m.variantId] = (variantBalances[m.variantId] || 0) + (qty * sign);
    }

    // Roll up to product level, or we can check per variant.
    // The minStockLevel is currently on LocalProduct.
    const productBalances: Record<string, number> = {};
    for (const v of variants) {
      productBalances[v.productId] = (productBalances[v.productId] || 0) + (variantBalances[v.id] || 0);
    }

    const lowStockAlerts = [];
    for (const p of products) {
      if (p.minStockLevel) {
        const threshold = parseFloat(p.minStockLevel) * (settings.lowStockThresholdMultiplier || 1);
        const currentBal = productBalances[p.id] || 0;
        if (currentBal <= threshold) {
          lowStockAlerts.push({ product: p, balance: currentBal, threshold });
        }
      }
    }
    return lowStockAlerts;
  }, [settings, products, variants, stockMovements]);

  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button variant="secondary" size="icon" className="relative rounded-full" onClick={() => setIsOpen(!isOpen)}>
        <Bell size={18} className="text-[var(--color-foreground)]" />
        {alerts.length > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[var(--color-surface)]">
            {alerts.length}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 mt-2 w-80 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-elevated)] z-50 overflow-hidden">
            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
              <h4 className="font-bold text-sm">تنبيهات المخزون ({alerts.length})</h4>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {!settings.enableLowStockAlerts ? (
                <div className="p-4 text-center text-sm text-[var(--color-muted-foreground)]">التنبيهات معطلة من الإعدادات</div>
              ) : alerts.length === 0 ? (
                <div className="p-4 text-center text-sm text-[var(--color-muted-foreground)]">لا توجد تنبيهات لنقص المخزون</div>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} className="p-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]/10">
                    <p className="text-sm font-medium">{a.product.name}</p>
                    <div className="flex justify-between items-center mt-1 text-xs text-[var(--color-danger)]">
                      <span>الرصيد: {a.balance}</span>
                      <span>حد الطلب: {a.threshold}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t border-[var(--color-border)] text-center">
              <Link to="/settings" onClick={() => setIsOpen(false)} className="text-xs text-[var(--color-primary)] hover:underline">
                إعدادات التنبيهات
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
`;

if (!content.includes('function StockAlertsWidget')) {
  content = content.replace("export function AppLayout", smartBellComponent + "\n\nexport function AppLayout");
}

const oldBellCode = `<Button variant="secondary" size="icon" className="relative rounded-full">\n              <Bell size={18} className="text-[var(--color-foreground)]" />\n              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[var(--color-danger)] ring-2 ring-[var(--color-surface)]"></span>\n            </Button>`;

const alternativeBellCode = `<Button variant="secondary" size="icon" className="relative rounded-full">
              <Bell size={18} className="text-[var(--color-foreground)]" />
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[var(--color-danger)] ring-2 ring-[var(--color-surface)]"></span>
            </Button>`;

if (content.includes(oldBellCode)) {
  content = content.replace(oldBellCode, `<StockAlertsWidget />`);
} else if (content.includes(alternativeBellCode)) {
  content = content.replace(alternativeBellCode, `<StockAlertsWidget />`);
} else {
  // Try regex based replacement
  content = content.replace(/<Button variant="secondary" size="icon" className="relative rounded-full">[\s\S]*?<\/Button>/, '<StockAlertsWidget />');
}

fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
