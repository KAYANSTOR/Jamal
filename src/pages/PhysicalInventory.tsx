import React, { useState, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ClipboardCheck, Save, Search, Settings2, FileDown, CheckCircle2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { InventoryRepository } from '../lib/repositories';

export function PhysicalInventory() {
  const [warehouseId, setWarehouseId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const stockMovements = useLiveQuery(() => db.stockMovements.where('warehouseId').equals(warehouseId).toArray(), [warehouseId]) || [];

  // Book balances computed from local DB
  const bookBalances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of stockMovements) {
      const qty = parseFloat(m.quantity);
      const isNegative = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
      const sign = isNegative ? -1 : 1;
      map[m.variantId] = (map[m.variantId] || 0) + (qty * sign);
    }
    return map;
  }, [stockMovements]);

  // Actual counts state
  const [actualCounts, setActualCounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCountChange = (variantId: string, value: string) => {
    setActualCounts(prev => ({ ...prev, [variantId]: value }));
  };

  const inventoryLines = useMemo(() => {
    if (!warehouseId) return [];
    
    // Include all variants that have a book balance OR an actual count entered
    const includedVariants = new Set([...Object.keys(bookBalances), ...Object.keys(actualCounts)]);
    
    const lines = Array.from(includedVariants).map(varId => {
      const bookQty = bookBalances[varId] || 0;
      const actualInput = actualCounts[varId];
      const actualQty = actualInput !== undefined && actualInput !== '' ? parseFloat(actualInput) : bookQty;
      const difference = actualQty - bookQty;
      
      const variantName = variants.find(v => v.id === varId)?.name || 'غير معروف';
      
      return {
        variantId: varId,
        variantName,
        bookQty: bookQty.toString(),
        actualInput: actualInput || '',
        actualQty: actualQty.toString(),
        difference: difference.toString(),
        type: difference > 0 ? 'IN' as const : 'OUT' as const
      };
    });
    
    if (searchQuery) {
      return lines.filter(l => l.variantName.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    return lines;
  }, [warehouseId, bookBalances, actualCounts, variants, searchQuery]);

  const totalVariances = inventoryLines.filter(l => parseFloat(l.difference) !== 0).length;

  const handleSubmit = async () => {
    if (!warehouseId) return;
    const adjustments = inventoryLines.filter(l => parseFloat(l.difference) !== 0);
    
    if (adjustments.length === 0) {
      return alert('لا توجد فروقات جردية لترحيلها. الأرصدة مطابقة.');
    }

    if (!window.confirm(`سيتم ترحيل عدد ${adjustments.length} فروقات جردية (تسوية). هل أنت متأكد؟`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      await InventoryRepository.postInventoryAdjustment(warehouseId, adjustments, new Date().toISOString(), 'تسوية جرد دوري');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setActualCounts({}); // Reset counts after successful sync
      }, 3000);
    } catch (error) {
      alert('حدث خطأ أثناء ترحيل التسوية');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout 
      pageTitle="الجرد والتسويات"
      headerSubtitle="إجراء الجرد الفعلي ومطابقة الأرصدة"
    >
      {success && (
        <div className="mb-6 bg-[var(--color-success)]/10 border border-[var(--color-success)] text-[var(--color-success-dark)] p-4 rounded-[var(--radius-lg)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={24} />
          <div>
            <h3 className="font-bold">تم ترحيل الفروقات الجردية بنجاح!</h3>
            <p className="text-sm opacity-90">تم إنشاء حركات التسوية (ADJUSTMENT) وإرسالها للمزامنة.</p>
          </div>
        </div>
      )}

      <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-6">
        <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck size={20} className="text-[var(--color-primary)]" />
              جلسة الجرد
            </CardTitle>
            <CardDescription>اختر المخزن لبدء إدخال الجرد الفعلي</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={warehouseId} onChange={(e) => {
              setWarehouseId(e.target.value);
              setActualCounts({}); // Reset on warehouse change
            }} className="w-[200px]">
              <option value="">-- اختر المخزن --</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
            <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
              <FileDown size={18} className="me-2" />
              تحميل نموذج جرد
            </Button>
          </div>
        </CardHeader>
      </Card>

      {warehouseId && (
        <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)]">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
                <Input 
                  placeholder="بحث في الأصناف..." 
                  className="w-64 ps-9" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            {totalVariances > 0 && (
              <div className="bg-[var(--color-warning)]/10 text-[var(--color-warning-dark)] px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium flex items-center gap-2">
                <Settings2 size={16} />
                يوجد {totalVariances} صنف بوجود فروقات تحتاج لتسوية
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[var(--color-surface)]">
                  <TableRow>
                    <TableHead>معرف الصنف</TableHead>
                    <TableHead>اسم الصنف</TableHead>
                    <TableHead className="w-[120px] text-end">الرصيد الدفتري</TableHead>
                    <TableHead className="w-[180px]">الجرد الفعلي</TableHead>
                    <TableHead className="w-[120px] text-end">الفرق (تسوية)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryLines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-[var(--color-muted-foreground)]">
                        لا توجد أرصدة سابقة في هذا المخزن. <br/>
                        يمكنك إضافة أرصدة افتتاحية من شاشة "الأرصدة الافتتاحية".
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventoryLines.map((line) => {
                      const diff = parseFloat(line.difference);
                      const hasDiff = diff !== 0;
                      
                      return (
                        <TableRow key={line.variantId} className={hasDiff ? 'bg-[var(--color-warning)]/5' : ''}>
                          <TableCell className="font-mono text-xs">{line.variantId.substring(0,8).toUpperCase()}</TableCell>
                          <TableCell className="font-medium">{line.variantName}</TableCell>
                          <TableCell className="text-end font-mono" dir="ltr">{line.bookQty}</TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              step="any"
                              placeholder={line.bookQty}
                              value={line.actualInput}
                              onChange={(e) => handleCountChange(line.variantId, e.target.value)}
                              dir="ltr"
                              className={hasDiff ? 'border-[var(--color-warning)]' : ''}
                            />
                          </TableCell>
                          <TableCell className="text-end font-mono font-bold" dir="ltr">
                            {hasDiff ? (
                              <span className={diff > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            ) : (
                              <span className="text-[var(--color-muted-foreground)]">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex justify-end">
              <Button 
                variant="default" 
                onClick={handleSubmit} 
                disabled={isSubmitting || inventoryLines.length === 0}
                className="w-full sm:w-auto"
              >
                <Save size={18} className="me-2" />
                ترحيل تسويات الجرد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
}
