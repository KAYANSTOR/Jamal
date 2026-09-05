import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import type { LocalStockMovement, LocalMaterialIssue, LocalWarehouse } from '../../lib/db';
import { FileText, Calendar, Building2, User, Hash } from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface MaterialReturnDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnSession: {
    referenceId: string;
    date: string;
    warehouseId: string;
    items: LocalStockMovement[];
  } | null;
  issues: LocalMaterialIssue[];
  warehouses: LocalWarehouse[];
}

export function MaterialReturnDetailsDialog({ open, onOpenChange, returnSession, issues, warehouses }: MaterialReturnDetailsDialogProps) {
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const departments = useLiveQuery(() => db.departments.toArray()) || [];

  if (!returnSession) return null;

  const issue = issues.find(i => i.id === returnSession.referenceId);
  const warehouse = warehouses.find(w => w.id === returnSession.warehouseId);
  const department = departments.find(d => d.id === issue?.departmentId);

  const getProductName = (variantId: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return 'غير معروف';
    const product = products.find(p => p.id === variant.productId);
    return product ? `${product.name} - ${variant.name}` : variant.name;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader className="border-b border-[var(--color-border)] pb-4 mb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="text-[var(--color-primary)]" size={24} />
              تفاصيل مرتجع مواد
            </DialogTitle>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">
              مكتمل
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Hash size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">رقم السند الأصلي</p>
                <p className="font-medium text-[var(--color-foreground)]">{issue?.issueNumber || 'غير معروف'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Calendar size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">تاريخ الإرجاع</p>
                <p className="font-medium text-[var(--color-foreground)]" dir="ltr">
                  {format(new Date(returnSession.date), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Building2 size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">القسم (المعيد)</p>
                <p className="font-medium text-[var(--color-foreground)]">{department?.name || 'غير معروف'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Building2 size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">مخزن الإرجاع</p>
                <p className="font-medium text-[var(--color-foreground)]">{warehouse?.name || 'غير معروف'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] md:col-span-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <User size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">المستلم الأصلي</p>
                <p className="font-medium text-[var(--color-foreground)]">{issue?.issuedBy || 'غير معروف'}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">تفاصيل المواد المرتجعة</h3>
            <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-muted)]/50 border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium text-[var(--color-muted-foreground)]">الصنف</th>
                    <th className="px-4 py-3 text-start font-medium text-[var(--color-muted-foreground)]">رقم الصنف (SKU)</th>
                    <th className="px-4 py-3 text-end font-medium text-[var(--color-muted-foreground)]">الكمية المرتجعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {returnSession.items.map(item => {
                    const variant = variants.find(v => v.id === item.variantId);
                    return (
                      <tr key={item.id} className="hover:bg-[var(--color-muted)]/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {getProductName(item.variantId)}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-muted-foreground)]" dir="ltr">
                          {variant?.sku || '-'}
                        </td>
                        <td className="px-4 py-3 text-end font-bold text-[var(--color-primary)]">
                          +{item.quantity}
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
