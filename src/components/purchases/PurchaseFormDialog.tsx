import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { PurchaseRepository } from '../../lib/repositories';
import type { LocalSupplier, LocalWarehouse } from '../../lib/db';
import { db } from '../../lib/db';
import { Loader2, Plus, X, Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface PurchaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: LocalSupplier[];
  warehouses: LocalWarehouse[];
  onSuccess?: () => void;
}

export function PurchaseFormDialog({ open, onOpenChange, suppliers, warehouses, onSuccess }: PurchaseFormDialogProps) {
  
  // Need variants to select items
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const getVariantName = (vid: string) => {
    const variant = variants.find(v => v.id === vid);
    if (!variant) return 'غير معروف';
    const product = products.find(p => p.id === variant.productId);
    return product ? `${product.name} - ${variant.name}` : variant.name;
  };

  const [purchaseData, setPurchaseData] = useState({
    supplierId: '',
    warehouseId: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState<{ variantId: string; quantity: string; unitCost: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPurchaseData({
        supplierId: '',
        warehouseId: '',
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
      });
      setItems([]);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  const addItem = () => {
    setItems([...items, { variantId: '', quantity: '1', unitCost: '0' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, val: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = val;
    setItems(newItems);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!purchaseData.supplierId) newErrors.supplierId = 'يجب اختيار المورد';
    if (!purchaseData.warehouseId) newErrors.warehouseId = 'يجب اختيار المخزن';
    if (!purchaseData.date) newErrors.date = 'يجب إدخال التاريخ';

    if (items.length === 0) {
      newErrors.items = 'يجب إضافة صنف واحد على الأقل';
    }

    items.forEach((item, idx) => {
      if (!item.variantId) newErrors[`item_${idx}_variant`] = 'مطلوب';
      if (isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        newErrors[`item_${idx}_qty`] = 'غير صالح';
      }
      if (isNaN(Number(item.unitCost)) || Number(item.unitCost) < 0) {
        newErrors[`item_${idx}_cost`] = 'غير صالح';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let totalAmount = 0;
      const parsedItems = items.map(item => {
        const qty = parseFloat(item.quantity);
        const cost = parseFloat(item.unitCost);
        const total = qty * cost;
        totalAmount += total;
        return {
          variantId: item.variantId,
          quantity: item.quantity,
          receivedQuantity: '0',
          unitCost: item.unitCost,
          totalCost: total.toString()
        };
      });

      await PurchaseRepository.addPurchaseOrder(
        {
          ...purchaseData,
          status: 'DRAFT', // Always start as DRAFT until confirmed
          totalAmount: totalAmount.toString(),
        },
        parsedItems
      );
      
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save purchase', err);
      setErrors({ submit: 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalOrderValue = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.unitCost) || 0;
    return sum + (qty * cost);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>أمر شراء جديد (Purchase Order)</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
        <DialogContent className="space-y-6 overflow-y-auto">
          {errors.submit && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">المورد <span className="text-[var(--color-danger)]">*</span></Label>
              <Select 
                id="supplier" 
                value={purchaseData.supplierId}
                onChange={(e) => setPurchaseData({ ...purchaseData, supplierId: e.target.value })}
                error={!!errors.supplierId}
              >
                <option value="">اختر المورد...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              {errors.supplierId && <p className="text-xs text-[var(--color-danger)]">{errors.supplierId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse">المخزن المستلم <span className="text-[var(--color-danger)]">*</span></Label>
              <Select 
                id="warehouse" 
                value={purchaseData.warehouseId}
                onChange={(e) => setPurchaseData({ ...purchaseData, warehouseId: e.target.value })}
                error={!!errors.warehouseId}
              >
                <option value="">اختر المخزن...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
              {errors.warehouseId && <p className="text-xs text-[var(--color-danger)]">{errors.warehouseId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice">رقم الفاتورة (اختياري)</Label>
              <Input 
                id="invoice" 
                placeholder="رقم مرجعي"
                value={purchaseData.invoiceNumber}
                onChange={(e) => setPurchaseData({ ...purchaseData, invoiceNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">تاريخ الشراء <span className="text-[var(--color-danger)]">*</span></Label>
              <Input 
                id="date" 
                type="date"
                value={purchaseData.date}
                onChange={(e) => setPurchaseData({ ...purchaseData, date: e.target.value })}
                error={!!errors.date}
              />
              {errors.date && <p className="text-xs text-[var(--color-danger)]">{errors.date}</p>}
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-[var(--color-foreground)] flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[var(--color-primary)] rounded-full inline-block"></span>
                الأصناف (Items)
              </h4>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus size={14} className="me-1" /> إضافة صنف
              </Button>
            </div>
            
            {errors.items && <p className="text-xs text-[var(--color-danger)]">{errors.items}</p>}

            {items.length === 0 ? (
              <div className="text-center py-6 border border-[var(--color-border)] border-dashed rounded-xl bg-[var(--color-muted)]/30">
                <p className="text-sm text-[var(--color-muted-foreground)]">يرجى إضافة أصناف لأمر الشراء</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start gap-2 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-neu-inner)]">
                    <div className="w-full sm:flex-1 space-y-1">
                      <Label className="text-xs text-[var(--color-muted-foreground)]">الصنف والنوع</Label>
                      <Select 
                        value={item.variantId}
                        onChange={(e) => updateItem(idx, 'variantId', e.target.value)}
                        error={!!errors[`item_${idx}_variant`]}
                      >
                        <option value="">اختر الصنف...</option>
                        {variants.map(v => (
                          <option key={v.id} value={v.id}>{getVariantName(v.id)}</option>
                        ))}
                      </Select>
                    </div>
                    
                    <div className="flex w-full sm:w-auto gap-2">
                      <div className="flex-1 sm:w-24 space-y-1">
                        <Label className="text-xs text-[var(--color-muted-foreground)]">الكمية</Label>
                        <Input 
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          error={!!errors[`item_${idx}_qty`]}
                        />
                      </div>
                      <div className="flex-1 sm:w-28 space-y-1">
                        <Label className="text-xs text-[var(--color-muted-foreground)]">تكلفة الوحدة</Label>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => updateItem(idx, 'unitCost', e.target.value)}
                          error={!!errors[`item_${idx}_cost`]}
                        />
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-auto flex items-end justify-between sm:justify-start pt-1 sm:pt-0 gap-3 mt-1 sm:mt-6">
                      <div className="text-sm font-semibold whitespace-nowrap px-2">
                        {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0)).toLocaleString('ar-SA')}
                      </div>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="icon" 
                        className="h-9 w-9 shrink-0 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                        onClick={() => removeItem(idx)}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center p-3 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-lg text-[var(--color-primary-dark)]">
                  <span className="font-bold">الإجمالي الكلي:</span>
                  <span className="font-bold font-mono text-lg">{totalOrderValue.toLocaleString('ar-SA')}</span>
                </div>
              </div>
            )}
          </div>
          
        </DialogContent>
        
        <DialogFooter>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button 
            type="submit" 
            variant="default" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              'حفظ أمر الشراء كمسودة'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
