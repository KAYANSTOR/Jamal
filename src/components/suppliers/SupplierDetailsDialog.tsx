import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import type { LocalSupplier } from '../../lib/db';
import { Mail, Phone, Calendar, User } from 'lucide-react';

interface SupplierDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: LocalSupplier | null;
}

export function SupplierDetailsDialog({ open, onOpenChange, supplier }: SupplierDetailsDialogProps) {
  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader className="border-b border-[var(--color-border)] pb-4 mb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <User className="text-[var(--color-primary)]" size={24} />
            {supplier.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4 bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Phone size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">رقم الهاتف</p>
                <p className="font-medium text-[var(--color-foreground)]" dir="ltr">
                  {supplier.phone || 'غير متوفر'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Mail size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">البريد الإلكتروني</p>
                <p className="font-medium text-[var(--color-foreground)]" dir="ltr">
                  {supplier.email || 'غير متوفر'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Calendar size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">تاريخ الإضافة</p>
                <p className="font-medium text-[var(--color-foreground)]">
                  <span dir="ltr">{format(new Date(supplier.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                </p>
              </div>
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
