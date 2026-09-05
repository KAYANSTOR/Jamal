import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Warehouse as WarehouseIcon, MapPin, Package, AlertCircle, Calendar } from 'lucide-react';
import type { LocalWarehouse } from '../../lib/db';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface WarehouseDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: LocalWarehouse | null;
  stats: { totalItems: number; qty: number; lowStock: number; lastMove: Date | null };
}

export function WarehouseDetailsDialog({ open, onOpenChange, warehouse, stats }: WarehouseDetailsDialogProps) {
  if (!warehouse) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader className="pb-4">
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
          <Badge variant={warehouse.status === 'ACTIVE' ? 'success' : warehouse.status === 'MAINTENANCE' ? 'warning' : 'secondary'}>
            {warehouse.status === 'ACTIVE' ? 'نشط' : warehouse.status === 'MAINTENANCE' ? 'صيانة' : 'متوقف'}
          </Badge>
        </div>
      </DialogHeader>
      
      <DialogContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-[var(--color-surface)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border)]">
            <div className="flex items-center text-sm text-[var(--color-muted-foreground)]">
              <Package size={16} className="me-2 text-[var(--color-primary)]" />
              الكمية الإجمالية
            </div>
            <span className="text-2xl font-bold text-[var(--color-foreground)]">{stats.qty.toLocaleString()}</span>
          </div>
          
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-[var(--color-surface)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border)]">
            <div className="flex items-center text-sm text-[var(--color-danger)]">
              <AlertCircle size={16} className="me-2" />
              أصناف منخفضة الرصيد
            </div>
            <span className="text-2xl font-bold text-[var(--color-danger)]">{stats.lowStock.toLocaleString()}</span>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="bg-[var(--color-muted)]/30 px-4 py-3 border-b border-[var(--color-border)] font-semibold text-sm">
            معلومات إضافية
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--color-muted-foreground)]">أنواع الأصناف (Variants):</span>
              <span className="font-semibold">{stats.totalItems.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--color-muted-foreground)]">تاريخ الإنشاء:</span>
              <span className="font-medium" dir="ltr">
                {warehouse.createdAt ? format(new Date(warehouse.createdAt), 'dd/MM/yyyy', { locale: arSA }) : 'غير معروف'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--color-muted-foreground)]">آخر حركة مخزنية:</span>
              <div className="flex items-center">
                <Calendar size={14} className="me-1.5 text-[var(--color-muted-foreground)]" />
                <span className="font-medium" dir="ltr">
                  {stats.lastMove ? format(stats.lastMove, 'dd/MM/yyyy HH:mm') : 'لا يوجد حركات'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
