import fs from 'fs';

const content = `
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Warehouse as WarehouseIcon, MapPin, Package, AlertCircle, Calendar, Plus, Search } from 'lucide-react';
import { db, type LocalWarehouse, type LocalProduct, type LocalVariant, type LocalStockMovement } from '../../lib/db';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { DirectAddStockDialog } from './DirectAddStockDialog';

interface WarehouseDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: LocalWarehouse | null;
  stats: { totalItems: number; qty: number; lowStock: number; lastMove: Date | null };
}

export function WarehouseDetailsDialog({ open, onOpenChange, warehouse, stats }: WarehouseDetailsDialogProps) {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Fetch all products and variants to display names
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  
  // Fetch only movements for this warehouse
  const movements = useLiveQuery(() => 
    warehouse ? db.stockMovements.where('warehouseId').equals(warehouse.id).toArray() : []
  , [warehouse?.id]) || [];

  // Calculate balances
  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movements) {
      const qty = parseFloat(m.quantity);
      const isNegative = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
      const sign = isNegative ? -1 : 1;
      
      const current = map.get(m.variantId) || 0;
      map.set(m.variantId, current + (qty * sign));
    }
    
    // Combine with variant/product info
    const result = [];
    for (const [varId, qty] of map.entries()) {
      if (qty > 0) {
        const variant = variants.find(v => v.id === varId);
        const product = variant ? products.find(p => p.id === variant.productId) : null;
        
        result.push({
          variantId: varId,
          variantName: variant?.name || 'غير معروف',
          productName: product?.name || 'غير معروف',
          quantity: qty,
          sku: variant?.sku || ''
        });
      }
    }
    return result;
  }, [movements, variants, products]);

  const filteredBalances = balances.filter(b => 
    b.productName.toLowerCase().includes(search.toLowerCase()) || 
    b.variantName.toLowerCase().includes(search.toLowerCase()) ||
    b.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (!warehouse) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogClose onClick={() => onOpenChange(false)} />
          <DialogHeader className="pb-4 shrink-0">
            <div className="flex justify-between items-start pe-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)] rounded-xl">
                  <WarehouseIcon size={24} />
                </div>
                <div>
                  <DialogTitle className="text-xl mb-1">{warehouse.name}</DialogTitle>
                  <div className="flex items-center text-xs text-[var(--color-muted-foreground)]">
                    <MapPin size={12} className="me-1" />
                    النوع: {warehouse.type === 'MAIN' ? 'رئيسي' : warehouse.type === 'SUB' ? 'فرعي' : warehouse.type === 'STORE' ? 'متجر' : 'افتراضي'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={warehouse.status === 'ACTIVE' ? 'success' : warehouse.status === 'MAINTENANCE' ? 'warning' : 'secondary'}>
                  {warehouse.status === 'ACTIVE' ? 'نشط' : warehouse.status === 'MAINTENANCE' ? 'صيانة' : 'متوقف'}
                </Badge>
                <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white">
                  <Plus size={14} />
                  إضافة بضاعة
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 pe-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-surface)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border)]">
                <div className="flex items-center text-xs text-[var(--color-muted-foreground)]">
                  <Package size={14} className="me-1.5 text-[var(--color-primary)]" />
                  إجمالي القطع
                </div>
                <span className="text-xl font-bold text-[var(--color-foreground)]">{stats.qty.toLocaleString()}</span>
              </div>
              
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-surface)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border)]">
                <div className="flex items-center text-xs text-[var(--color-danger)]">
                  <AlertCircle size={14} className="me-1.5" />
                  نواقص
                </div>
                <span className="text-xl font-bold text-[var(--color-danger)]">{stats.lowStock.toLocaleString()}</span>
              </div>
              
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-surface)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border)]">
                <div className="flex items-center text-xs text-[var(--color-muted-foreground)]">
                  تاريخ الإنشاء
                </div>
                <span className="text-sm font-bold text-[var(--color-foreground)]" dir="ltr">
                  {warehouse.createdAt ? format(new Date(warehouse.createdAt), 'dd/MM/yyyy') : '-'}
                </span>
              </div>

              <div className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-surface)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border)]">
                <div className="flex items-center text-xs text-[var(--color-muted-foreground)]">
                  آخر حركة
                </div>
                <span className="text-sm font-bold text-[var(--color-foreground)]" dir="ltr">
                  {stats.lastMove ? format(stats.lastMove, 'dd/MM/yyyy HH:mm') : '-'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--color-foreground)] text-lg">محتويات المخزن الحالية</h3>
                <div className="relative w-64">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={14} />
                  <Input 
                    placeholder="بحث في الأصناف..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="ps-8 h-9 text-sm"
                  />
                </div>
              </div>
              
              <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-[var(--color-muted)]/50 text-[var(--color-muted-foreground)]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">المنتج الأساسي</th>
                        <th className="px-4 py-3 font-semibold">الصنف / التعبئة</th>
                        <th className="px-4 py-3 font-semibold">رقم الصنف (SKU)</th>
                        <th className="px-4 py-3 font-semibold text-left">الكمية المتوفرة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {filteredBalances.length > 0 ? (
                        filteredBalances.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[var(--color-muted)]/20 transition-colors">
                            <td className="px-4 py-3 font-medium text-[var(--color-foreground)]">{item.productName}</td>
                            <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{item.variantName}</td>
                            <td className="px-4 py-3 text-[var(--color-muted-foreground)] font-mono text-xs">{item.sku || '-'}</td>
                            <td className="px-4 py-3 text-left">
                              <Badge variant={item.quantity <= 10 ? 'danger' : 'secondary'} className="font-bold text-sm px-2 py-0.5">
                                {item.quantity.toLocaleString()}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-muted-foreground)]">
                            {search ? 'لا توجد أصناف مطابقة للبحث.' : 'المخزن فارغ حالياً.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <DirectAddStockDialog 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        warehouse={warehouse} 
      />
    </>
  );
}
`;

fs.writeFileSync('src/components/warehouses/WarehouseDetailsDialog.tsx', content);
