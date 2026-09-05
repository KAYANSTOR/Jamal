import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import type { LocalMaterialIssue, LocalMaterialIssueItem, LocalDepartment, LocalWarehouse } from '../../lib/db';
import { FileText, Building2, User, Calendar, MapPin, Hash } from 'lucide-react';
import { db } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface MaterialIssueDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: LocalMaterialIssue | null;
  departments: LocalDepartment[];
  warehouses: LocalWarehouse[];
}

export function MaterialIssueDetailsDialog({ open, onOpenChange, issue, departments, warehouses }: MaterialIssueDetailsDialogProps) {
  const items = useLiveQuery(
    () => issue ? db.materialIssueItems.where('issueId').equals(issue.id).toArray() : [],
    [issue?.id]
  ) || [];

  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];

  if (!issue) return null;

  const department = departments.find(d => d.id === issue.departmentId);
  const warehouse = warehouses.find(w => w.id === issue.warehouseId);

  const getProductName = (variantId: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return 'غير معروف';
    const product = products.find(p => p.id === variant.productId);
    return product ? `${product.name} - ${variant.name}` : variant.name;
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'POSTED': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">معتمد ومرحل</span>;
      case 'CANCELLED': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)]">ملغي</span>;
      default: return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">{status}</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader className="border-b border-[var(--color-border)] pb-4 mb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="text-[var(--color-primary)]" size={24} />
              تفاصيل سند الصرف
            </DialogTitle>
            {getStatusBadge(issue.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Hash size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">رقم السند</p>
                <p className="font-medium text-[var(--color-foreground)]">{issue.issueNumber || 'بدون رقم'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Calendar size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">التاريخ</p>
                <p className="font-medium text-[var(--color-foreground)]" dir="ltr">
                  {format(new Date(issue.date), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Building2 size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">القسم الموجه إليه</p>
                <p className="font-medium text-[var(--color-foreground)]">{department?.name || 'غير معروف'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <MapPin size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">مخزن الصرف</p>
                <p className="font-medium text-[var(--color-foreground)]">{warehouse?.name || 'غير معروف'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] md:col-span-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <User size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">المستلم / المسؤول</p>
                <p className="font-medium text-[var(--color-foreground)]">{issue.issuedBy}</p>
              </div>
            </div>
            
            {issue.notes && (
              <div className="md:col-span-2 p-4 rounded-lg bg-[var(--color-muted)]/50 border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-1">ملاحظات</p>
                <p className="text-sm">{issue.notes}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">تفاصيل المواد المصروفة</h3>
            <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-muted)]/50 border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium text-[var(--color-muted-foreground)]">الصنف</th>
                    <th className="px-4 py-3 text-start font-medium text-[var(--color-muted-foreground)]">رقم الصنف (SKU)</th>
                    <th className="px-4 py-3 text-end font-medium text-[var(--color-muted-foreground)]">الكمية</th>
                    <th className="px-4 py-3 text-end font-medium text-[var(--color-muted-foreground)]">المرتجع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map(item => {
                    const variant = variants.find(v => v.id === item.variantId);
                    return (
                      <tr key={item.id} className="hover:bg-[var(--color-muted)]/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {getProductName(item.variantId)}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-muted-foreground)]" dir="ltr">
                          {variant?.sku || '-'}
                        </td>
                        <td className="px-4 py-3 text-end font-bold text-[var(--color-foreground)]">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-end text-[var(--color-muted-foreground)]">
                          {item.returnedQuantity || '0'}
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
