import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import type { LocalWarehouse } from '../../lib/db';
import { ArrowLeftRight, Calendar, Building2, Hash, FileText } from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface StockTransferDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: any | null; // Virtual Transfer object
  warehouses: LocalWarehouse[];
}

export function StockTransferDetailsDialog({ open, onOpenChange, transfer, warehouses }: StockTransferDetailsDialogProps) {
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];

  if (!transfer) return null;

  const sourceWarehouse = warehouses.find(w => w.id === transfer.sourceWarehouseId);
  const destinationWarehouse = warehouses.find(w => w.id === transfer.destinationWarehouseId);

  const getProductName = (variantId: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return 'غير معروف';
    const product = products.find(p => p.id === variant.productId);
    return product ? `${product.name} - ${variant.name}` : variant.name;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'DRAFT': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">مسودة</span>;
      case 'SENT': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">مرسل</span>;
      case 'RECEIVED': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">مستلم</span>;
      case 'CANCELLED': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)]">ملغي</span>;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader className="border-b border-[var(--color-border)] pb-4 mb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <ArrowLeftRight className="text-[var(--color-primary)]" size={24} />
              تفاصيل تحويل مخزني
            </DialogTitle>
            {getStatusBadge(transfer.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Hash size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">رقم التحويل</p>
                <p className="font-medium text-[var(--color-foreground)]" dir="ltr">{transfer.id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Calendar size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">تاريخ التحويل</p>
                <p className="font-medium text-[var(--color-foreground)]" dir="ltr">
                  {format(new Date(transfer.date), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Building2 size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">من مخزن</p>
                <p className="font-medium text-[var(--color-foreground)]">{sourceWarehouse?.name || 'غير معروف'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Building2 size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">إلى مخزن</p>
                <p className="font-medium text-[var(--color-foreground)]">{destinationWarehouse?.name || 'غير معروف'}</p>
              </div>
            </div>

            {transfer.notes && (
              <div className="md:col-span-2 p-4 rounded-lg bg-[var(--color-muted)]/50 border border-[var(--color-border)] flex gap-3">
                <FileText size={18} className="text-[var(--color-muted-foreground)] shrink-0" />
                <div>
                  <p className="text-sm text-[var(--color-muted-foreground)] mb-1">ملاحظات</p>
                  <p className="text-sm">{transfer.notes}</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">تفاصيل الأصناف</h3>
            <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-muted)]/50 border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium text-[var(--color-muted-foreground)]">الصنف</th>
                    <th className="px-4 py-3 text-start font-medium text-[var(--color-muted-foreground)]">رقم الصنف (SKU)</th>
                    <th className="px-4 py-3 text-end font-medium text-[var(--color-muted-foreground)]">الكمية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {transfer.items.map((item: any, i: number) => {
                    const variant = variants.find(v => v.id === item.variantId);
                    return (
                      <tr key={i} className="hover:bg-[var(--color-muted)]/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {getProductName(item.variantId)}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-muted-foreground)]" dir="ltr">
                          {variant?.sku || '-'}
                        </td>
                        <td className="px-4 py-3 text-end font-bold text-[var(--color-foreground)]">
                          {item.quantity}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
