import React, { useState, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { BarChart3, Printer, Download, Search, Filter, Warehouse, Package, ArrowLeftRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { exportElementToPDF } from '../lib/pdfExport';
import { arSA } from 'date-fns/locale';

type ReportTab = 'BALANCES' | 'MOVEMENTS' | 'PURCHASES';

export function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('BALANCES');
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  
  // Data
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const stockMovements = useLiveQuery(() => db.stockMovements.orderBy('date').reverse().toArray()) || [];
  
  const getWarehouseName = (id: string) => warehouses.find(w => w.id === id)?.name || 'غير معروف';
  const getVariantName = (id: string) => variants.find(v => v.id === id)?.name || 'صنف غير معروف';
  
  // Compute Balances
  const balances = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const w of warehouses) map[w.id] = {};
    
    for (const m of stockMovements) {
      if (!map[m.warehouseId]) map[m.warehouseId] = {};
      const qty = parseFloat(m.quantity);
      const isNegative = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
      const sign = isNegative ? -1 : 1;
      
      map[m.warehouseId][m.variantId] = (map[m.warehouseId][m.variantId] || 0) + (qty * sign);
    }
    return map;
  }, [stockMovements, warehouses]);

  // Flatten balances for table
  const flattenedBalances = useMemo(() => {
    const list: any[] = [];
    Object.keys(balances).forEach(whId => {
      if (warehouseFilter !== 'ALL' && whId !== warehouseFilter) return;
      Object.keys(balances[whId]).forEach(varId => {
        const qty = balances[whId][varId];
        if (qty !== 0) {
          const varName = getVariantName(varId);
          if (searchQuery && !varName.toLowerCase().includes(searchQuery.toLowerCase())) return;
          
          list.push({
            warehouseId: whId,
            variantId: varId,
            variantName: varName,
            qty
          });
        }
      });
    });
    return list;
  }, [balances, warehouseFilter, searchQuery, variants]);

  
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    await exportElementToPDF('report-container', {
      filename: `Report-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      margin: 15
    });
  };


  return (
    <AppLayout 
      pageTitle="مركز التقارير"
      headerSubtitle="تقارير المخزون والحركات الشاملة"
      pageActions={
        <>
        <Button variant="outline" onClick={handlePrint}>
          <Printer size={18} className="me-2" />
          طباعة
        </Button>
        <Button variant="default" onClick={handleExportPDF}>
          <Download size={18} className="me-2" />
          تصدير PDF
        </Button>
        </>
      }
    >
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 print:hidden">
        <Button 
          variant={activeTab === 'BALANCES' ? 'default' : 'secondary'} 
          onClick={() => setActiveTab('BALANCES')}
          className="rounded-full"
        >
          <Package size={16} className="me-2" />
          أرصدة المخزون
        </Button>
        <Button 
          variant={activeTab === 'MOVEMENTS' ? 'default' : 'secondary'} 
          onClick={() => setActiveTab('MOVEMENTS')}
          className="rounded-full"
        >
          <ArrowLeftRight size={16} className="me-2" />
          حركات تفصيلية
        </Button>
      </div>

      <Card id="report-container" className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-8 bg-[var(--color-background)]">
        {/* System Branding Header for PDF Export */}
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

        <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30 print:bg-transparent print:border-b-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">
                {activeTab === 'BALANCES' ? 'تقرير أرصدة المخزون الحالية' : 'تقرير الحركات التفصيلية'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'BALANCES' 
                  ? 'يعرض الكميات المتوفرة حالياً في كل مخزن' 
                  : 'سجل كامل بكافة الحركات الداخلة والخارجة'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 print:hidden" data-html2canvas-ignore="true">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
                <Input 
                  placeholder="بحث..." 
                  className="w-48 ps-9" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select 
                value={warehouseFilter} 
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="w-40"
              >
                <option value="ALL">جميع المخازن</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {activeTab === 'BALANCES' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--color-surface)]">
                  <TableRow>
                    <TableHead>المخزن</TableHead>
                    <TableHead>معرف الصنف</TableHead>
                    <TableHead>اسم الصنف</TableHead>
                    <TableHead className="text-end">الرصيد الحالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flattenedBalances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-[var(--color-muted-foreground)]">
                        لا توجد أرصدة متوفرة تطابق معايير البحث
                      </TableCell>
                    </TableRow>
                  ) : (
                    flattenedBalances.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Warehouse size={16} className="text-[var(--color-primary)]" />
                            {getWarehouseName(b.warehouseId)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{b.variantId.substring(0,8).toUpperCase()}</TableCell>
                        <TableCell>{b.variantName}</TableCell>
                        <TableCell className="text-end font-mono font-bold text-lg" dir="ltr">{b.qty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {activeTab === 'MOVEMENTS' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--color-surface)]">
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>نوع الحركة</TableHead>
                    <TableHead>المخزن</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>الملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovements
                    .filter(m => (warehouseFilter === 'ALL' || m.warehouseId === warehouseFilter) && 
                                 (!searchQuery || getVariantName(m.variantId).toLowerCase().includes(searchQuery.toLowerCase())))
                    .slice(0, 100) // limit for performance in demo
                    .map((m) => {
                      const isNeg = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
                      let notes = m.notes;
                      try { notes = JSON.parse(m.notes || '{}').notes || m.notes; } catch(e){}
                      return (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">
                          {format(new Date(m.date), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-full text-slate-700">
                            {m.type}
                          </span>
                        </TableCell>
                        <TableCell>{getWarehouseName(m.warehouseId)}</TableCell>
                        <TableCell>{getVariantName(m.variantId)}</TableCell>
                        <TableCell className="font-mono text-end" dir="ltr">
                          <span className={isNeg ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}>
                            {isNeg ? '-' : '+'}{m.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-[var(--color-muted-foreground)]">
                          {notes}
                        </TableCell>
                      </TableRow>
                    )})}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root, .print\\:hidden {
            display: none !important;
          }
          .Card {
            box-shadow: none !important;
            border: none !important;
          }
          .Card * {
            visibility: visible;
          }
          .Card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </AppLayout>
  );
}
