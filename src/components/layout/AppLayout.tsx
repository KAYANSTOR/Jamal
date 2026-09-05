import React from 'react';
import { cn } from '../../lib/utils';
import { Building2, Package, FileText, Settings, User, Users, Bell, Wifi, WifiOff, RefreshCw, Database, ShoppingCart, Activity, ArrowLeftRight, BarChart3, ClipboardCheck, Scale } from 'lucide-react';
import { Button } from '../ui/button';
import { Link, useLocation } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { getSettings } from '../../lib/settings';
import { PWAInstallButton } from '../PWAInstallButton';
import { OfflineIndicator } from '../OfflineIndicator';
import { ConnectionStatusBar } from '../ConnectionStatusBar';

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  headerSubtitle?: string;
  pageActions?: React.ReactNode;
}


function StockAlertsWidget() {
  const [settings, setSettings] = React.useState(getSettings());
  
  React.useEffect(() => {
    const handler = () => setSettings(getSettings());
    window.addEventListener('settings_updated', handler);
    return () => window.removeEventListener('settings_updated', handler);
  }, []);
  
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


export function AppLayout({ children, pageTitle, headerSubtitle, pageActions }: AppLayoutProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  // Mock statuses for the UI redesign
  const isOnline = true;
  const lastSync = "الآن";

    const navigation = [
    { name: 'الرئيسية', icon: Activity, href: '/' },
    { name: 'المخازن', icon: Database, href: '/warehouses' },
    { name: 'الأصناف', icon: Package, href: '/products' },
    { name: 'التقارير', icon: BarChart3, href: '/reports' },
    { name: 'الإعدادات', icon: Settings, href: '/settings' },
  ];

  return (
    <div className="flex min-h-screen w-full bg-[var(--color-background)] pb-16 lg:pb-0">
      {/* 
        Hardware-style Navigation Rail (Desktop) & Bottom Nav (Mobile)
        Always uses hardcoded dark theme style for the rail to match the "Control Panel" industrial look
      */}
      <aside
        className={cn(
          "fixed z-50 flex bg-[#18181B] text-[#FAFAFA]",
          // Mobile: Bottom Navigation
          "bottom-0 start-0 end-0 h-16 flex-row items-center justify-around border-t border-[#3F3F46] shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.3)]",
          // Desktop: Vertical Rail (RTL native via start-0, border-e)
          "lg:top-0 lg:bottom-0 lg:start-0 lg:w-[84px] lg:h-auto lg:flex-col lg:border-t-0 lg:border-e lg:border-[#3F3F46] lg:shadow-[4px_0_20px_rgba(0,0,0,0.3)] lg:justify-start lg:py-4"
        )}
      >
        {/* Logo - Desktop Only */}
        <div className="hidden lg:flex shrink-0 items-center justify-center border-b border-[#3F3F46]/50 w-full pb-6 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#A67C3A] to-[#C59D5F] text-white shadow-[0_4px_10px_rgba(197,157,95,0.3)]">
            <Package size={26} strokeWidth={2.5} />
          </div>
        </div>

        {/* Navigation Icons */}
        <nav className="flex flex-1 lg:w-full lg:flex-col lg:items-center lg:gap-5 lg:px-2 lg:overflow-y-auto w-full justify-evenly">
          {navigation.map((item) => {
            const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className="relative group outline-none flex justify-center"
              >
                <div 
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-[14px] transition-all duration-300",
                    isActive 
                      ? "bg-[#18181B] text-[#C59D5F] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.6),inset_-2px_-2px_6px_rgba(255,255,255,0.05)] border border-[#C59D5F]/20" 
                      : "bg-[#27272A] text-[#A1A1AA] shadow-[4px_4px_10px_rgba(0,0,0,0.4),-2px_-2px_10px_rgba(255,255,255,0.03)] border border-[#3F3F46]/30 group-hover:bg-[#3F3F46] group-hover:text-[#C59D5F] group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-[#C59D5F]"
                  )}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "drop-shadow-[0_0_8px_rgba(197,157,95,0.5)]" : ""} />
                </div>
                
                {/* Active Indicator (Desktop) */}
                {isActive && (
                  <div className="hidden lg:block absolute -start-2 lg:-start-3.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#C59D5F] rounded-e-full shadow-[0_0_8px_rgba(197,157,95,0.6)]"></div>
                )}
                {/* Active Indicator (Mobile) */}
                {isActive && (
                  <div className="lg:hidden absolute -top-2 start-1/2 -translate-x-1/2 w-5 h-1 bg-[#C59D5F] rounded-b-full shadow-[0_0_8px_rgba(197,157,95,0.6)]"></div>
                )}

                {/* Tooltip (Desktop Only) */}
                <div className="absolute start-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#27272A] text-white text-sm font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 hidden lg:block border border-[#3F3F46]">
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions - Desktop Only */}
        <div className="hidden lg:flex w-full flex-col items-center gap-4 pt-6 border-t border-[#3F3F46]/50 mt-auto">
          <div className="relative group outline-none flex justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#27272A] text-[#A1A1AA] shadow-[4px_4px_10px_rgba(0,0,0,0.4),-2px_-2px_10px_rgba(255,255,255,0.03)] border border-[#3F3F46]/30 hover:bg-[#3F3F46] hover:text-[#FAFAFA] transition-all cursor-pointer">
              {isOnline ? <Wifi size={18} className="text-[#10B981]" /> : <WifiOff size={18} className="text-[#EF4444]" />}
            </div>
            <div className="absolute start-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#27272A] text-white text-sm font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 border border-[#3F3F46]">
              {isOnline ? 'متصل' : 'غير متصل'} • {lastSync}
            </div>
          </div>
          
          <div className="relative group outline-none flex justify-center mt-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#18181B] text-[#C59D5F] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.05)] border border-[#C59D5F]/30 cursor-pointer">
              <User size={18} />
            </div>
            <div className="absolute start-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#27272A] text-white text-sm font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 border border-[#3F3F46]">
              مدير النظام
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden lg:ps-[84px]">
        <ConnectionStatusBar />
        {/* Premium Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <PWAInstallButton />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-[var(--color-foreground)]">
                {pageTitle}
              </h1>
              {headerSubtitle && (
                <span className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{headerSubtitle}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-[var(--radius-lg)] bg-[var(--color-muted)] border border-[var(--color-border)] shadow-[var(--shadow-neu-inner)]">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi size={14} className="text-[var(--color-success)]" />
                ) : (
                  <WifiOff size={14} className="text-[var(--color-danger)]" />
                )}
                <span className="text-xs font-medium text-[var(--color-foreground)]">
                  {isOnline ? 'متصل' : 'غير متصل'}
                </span>
              </div>
              <div className="w-px h-4 bg-[var(--color-border-strong)]"></div>
              <div className="flex items-center gap-1.5">
                <RefreshCw size={14} className="text-[var(--color-muted-foreground)]" />
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {lastSync}
                </span>
              </div>
            </div>

            <StockAlertsWidget />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {pageActions && (
            <div className="mb-6 flex flex-wrap items-center gap-3 justify-end">
              {pageActions}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
