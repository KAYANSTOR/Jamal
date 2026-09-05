import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import type { LocalDepartment } from '../../lib/db';
import { Building2, Calendar, FileText } from 'lucide-react';

interface DepartmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: LocalDepartment | null;
}

export function DepartmentDetailsDialog({ open, onOpenChange, department }: DepartmentDetailsDialogProps) {
  if (!department) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader className="border-b border-[var(--color-border)] pb-4 mb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Building2 className="text-[var(--color-primary)]" size={24} />
            {department.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4 bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)]">
            
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <FileText size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-0.5">الوصف</p>
                <p className="font-medium text-[var(--color-foreground)]">
                  {department.description || 'لا يوجد وصف'}
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
                  <span dir="ltr">{format(new Date(department.createdAt), 'dd/MM/yyyy HH:mm')}</span>
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
