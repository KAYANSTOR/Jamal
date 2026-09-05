import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { 
  Search, Filter, ShoppingCart, Package, Building2, 
  ArrowLeftRight, Undo2, Settings2, CreditCard, BoxSelect, 
  RefreshCcw, AlertCircle, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { cn } from '../../lib/utils';

type ActivityCategory = 'PURCHASE' | 'RECEIPT' | 'ISSUE' | 'RETURN' | 'TRANSFER' | 'ADJUSTMENT' | 'PAYMENT' | 'OTHER';

interface ActivityItem {
  id: string;
  category: ActivityCategory;
  title: string;
  subtitle: string;
  date: Date;
  status?: string;
  icon: React.ReactNode;
  colorClass: string;
}

export function CentralActivityLog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ActivityCategory | 'ALL'>('ALL');
  const [limit, setLimit] = useState(10);

  // Fetch local data (Offline-First)
  const purchases = useLiveQuery(() => db.purchases.toArray()) || [];
  const receipts = useLiveQuery(() => db.purchaseReceipts.toArray()) || [];
  const issues = useLiveQuery(() => db.materialIssues.toArray()) || [];
  const movements = useLiveQuery(() => db.stockMovements.toArray()) || [];
  const payments = useLiveQuery(() => db.supplierPayments.toArray()) || [];
  
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];
  const departments = useLiveQuery(() => db.departments.toArray()) || [];

  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'مورد غير معروف';
  const getWarehouseName = (id: string) => warehouses.find(w => w.id === id)?.name || 'مخزن غير معروف';
  const getDepartmentName = (id: string) => departments.find(d => d.id === id)?.name || 'قسم غير معروف';

  // Process and unify all activities
  const activities = useMemo(() => {
    const list: ActivityItem[] = [];

    // 1. Purchases
    for (const p of purchases) {
      list.push({
        id: p.id,
        category: 'PURCHASE',
        title: `أمر شراء من: ${getSupplierName(p.supplierId)}`,
        subtitle: p.invoiceNumber ? `رقم الفاتورة: ${p.invoiceNumber}` : 'أمر شراء جديد',
        date: new Date(p.date),
        status: p.status,
        icon: <ShoppingCart size={16} />,
        colorClass: 'text-blue-500 bg-blue-500/10'
      });
    }

    // 2. Receipts
    for (const r of receipts) {
      list.push({
        id: r.id,
        category: 'RECEIPT',
        title: `استلام مشتريات للمخزن: ${getWarehouseName(r.warehouseId)}`,
        subtitle: `مرتبط بأمر شراء: ${r.purchaseId.substring(0, 8).toUpperCase()}`,
        date: new Date(r.date),
        status: r.status,
        icon: <Package size={16} />,
        colorClass: 'text-emerald-500 bg-emerald-500/10'
      });
    }

    // 3. Issues
    for (const i of issues) {
      list.push({
        id: i.id,
        category: 'ISSUE',
        title: `صرف مواد لقسم: ${getDepartmentName(i.departmentId)}`,
        subtitle: `من مخزن: ${getWarehouseName(i.warehouseId)}`,
        date: new Date(i.date),
        status: i.status,
        icon: <BoxSelect size={16} />,
        colorClass: 'text-orange-500 bg-orange-500/10'
      });
    }

    // 4. Payments
    for (const p of payments) {
      list.push({
        id: p.id,
        category: 'PAYMENT',
        title: `دفعة مالية للمورد: ${getSupplierName(p.supplierId)}`,
        subtitle: `المبلغ: ${p.amount}`,
        date: new Date(p.date),
        status: 'COMPLETED',
        icon: <CreditCard size={16} />,
        colorClass: 'text-purple-500 bg-purple-500/10'
      });
    }

    // 5. Movements (Transfers, Returns, Adjustments)
    // We group transfers to avoid duplicate logs per item
    const processedTransfers = new Set<string>();
    const processedReturns = new Set<string>();

    for (const m of movements) {
      if (m.type === 'TRANSFER_OUT' && m.referenceId && !processedTransfers.has(m.referenceId)) {
        processedTransfers.add(m.referenceId);
        
        let destName = 'غير معروف';
        try {
          const notes = JSON.parse(m.notes || '{}');
          destName = getWarehouseName(notes.destId);
        } catch(e) {}

        list.push({
          id: m.referenceId,
          category: 'TRANSFER',
          title: `تحويل مخزني إلى: ${destName}`,
          subtitle: `من مخزن: ${getWarehouseName(m.warehouseId)}`,
          date: new Date(m.date),
          status: 'SENT',
          icon: <ArrowLeftRight size={16} />,
          colorClass: 'text-indigo-500 bg-indigo-500/10'
        });
      }
      else if (m.type === 'INTERNAL_ISSUE_RETURN' && m.referenceId && !processedReturns.has(m.referenceId)) {
        processedReturns.add(m.referenceId);
        list.push({
          id: m.operationId, // Use operationId to distinguish if multiple returns happen for same reference
          category: 'RETURN',
          title: `مرتجع مواد للمخزن: ${getWarehouseName(m.warehouseId)}`,
          subtitle: `من سند صرف: ${m.referenceId.substring(0,8).toUpperCase()}`,
          date: new Date(m.date),
          status: 'COMPLETED',
          icon: <Undo2 size={16} />,
          colorClass: 'text-rose-500 bg-rose-500/10'
        });
      }
      else if (['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE'].includes(m.type)) {
        list.push({
          id: m.id,
          category: 'ADJUSTMENT',
          title: `تسوية جردية - ${m.type === 'DAMAGE' ? 'تالف' : 'تسوية'}`,
          subtitle: `في مخزن: ${getWarehouseName(m.warehouseId)}`,
          date: new Date(m.date),
          status: 'COMPLETED',
          icon: <Settings2 size={16} />,
          colorClass: 'text-amber-500 bg-amber-500/10'
        });
      }
    }

    // Sort by date descending
    list.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return list;
  }, [purchases, receipts, issues, movements, payments, suppliers, warehouses, departments]);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = filterCategory === 'ALL' || activity.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const displayedActivities = filteredActivities.slice(0, limit);

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    switch(status) {
      case 'DRAFT': return <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600">مسودة</span>;
      case 'POSTED': 
      case 'RECEIVED':
      case 'COMPLETED':
      case 'CONFIRMED': return <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-emerald-100 text-emerald-700">مكتمل</span>;
      case 'SENT': return <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">مرسل</span>;
      case 'CANCELLED': return <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-rose-100 text-rose-700">ملغي</span>;
      default: return <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getCategoryLabel = (cat: ActivityCategory) => {
    switch(cat) {
      case 'PURCHASE': return 'مشتريات';
      case 'RECEIPT': return 'استلام';
      case 'ISSUE': return 'صرف';
      case 'RETURN': return 'مرتجع';
      case 'TRANSFER': return 'تحويل';
      case 'ADJUSTMENT': return 'تسوية/جرد';
      case 'PAYMENT': return 'مصروفات/دفع';
      default: return 'أخرى';
    }
  };

  return (
    <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)]">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border)] pb-6 bg-[var(--color-muted)]/30">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <RefreshCcw className="text-[var(--color-primary)]" size={20} />
            سجل العمليات المركزي
          </CardTitle>
          <CardDescription className="mt-1">
            أحدث الحركات والتغييرات لكافة أقسام النظام (تعمل في وضع Offline)
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
            <Input 
              placeholder="بحث في السجل..." 
              className="w-full sm:w-64 ps-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value as ActivityCategory | 'ALL')}
            className="w-full sm:w-40"
          >
            <option value="ALL">جميع الأقسام</option>
            <option value="PURCHASE">المشتريات</option>
            <option value="RECEIPT">الاستلامات</option>
            <option value="ISSUE">صرف المواد</option>
            <option value="RETURN">المرتجعات</option>
            <option value="TRANSFER">التحويلات</option>
            <option value="ADJUSTMENT">الجرد والتسويات</option>
            <option value="PAYMENT">المصروفات/المدفوعات</option>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[var(--color-surface)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px]"></TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>تفاصيل العملية</TableHead>
                <TableHead>المرجع</TableHead>
                <TableHead>التاريخ والوقت</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] mb-3">
                        <FileText size={24} />
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--color-foreground)]">لا توجد عمليات</h3>
                      <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                        {searchQuery || filterCategory !== 'ALL' 
                          ? 'لا توجد نتائج تطابق بحثك' 
                          : 'لم يتم تسجيل أي عمليات في النظام حتى الآن'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedActivities.map((row) => (
                  <TableRow key={row.id} className="group hover:bg-[var(--color-muted)]/30 transition-colors">
                    <TableCell>
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", row.colorClass)}>
                        {row.icon}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-sm text-[var(--color-foreground)]">
                        {getCategoryLabel(row.category)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-[var(--color-foreground)]">{row.title}</span>
                        <span className="text-xs text-[var(--color-muted-foreground)]">{row.subtitle}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-[var(--color-muted-foreground)]" dir="ltr">
                        {row.id.substring(0, 8).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-sm">
                        <span className="text-[var(--color-foreground)]">{format(row.date, 'dd MMM yyyy', { locale: arSA })}</span>
                        <span className="text-xs text-[var(--color-muted-foreground)]">{format(row.date, 'HH:mm')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(row.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredActivities.length > limit && (
          <div className="p-4 border-t border-[var(--color-border)] flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => setLimit(prev => prev + 10)}
              className="w-full sm:w-auto min-w-[200px]"
            >
              عرض المزيد من العمليات
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
