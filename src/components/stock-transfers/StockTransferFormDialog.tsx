import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { StockTransferRepository } from '../../lib/repositories';
import { db, type LocalWarehouse, type LocalStockTransferDraft } from '../../lib/db';
import { Loader2, Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface StockTransferFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: LocalWarehouse[];
  draft?: LocalStockTransferDraft | null;
  onSuccess?: () => void;
}

export function StockTransferFormDialog({ open, onOpenChange, warehouses, draft, onSuccess }: StockTransferFormDialogProps) {
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ id: string; variantId: string; quantity: string }[]>([]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const stockMovements = useLiveQuery(() => db.stockMovements.toArray()) || [];

  useEffect(() => {
    if (open) {
      if (draft) {
        setSourceWarehouseId(draft.sourceWarehouseId);
        setDestinationWarehouseId(draft.destinationWarehouseId);
        setDate(draft.date);
        setNotes(draft.notes || '');
        setItems(draft.items.map(i => ({ id: Math.random().toString(), variantId: i.variantId, quantity: i.quantity })));
      } else {
        setSourceWarehouseId('');
        setDestinationWarehouseId('');
        setDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setItems([]);
      }
      setErrors({});
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  }, [open, draft]);

  // Calculate local stock for validation
  const getAvailableStock = (warehouseId: string, variantId: string) => {
    if (!warehouseId || !variantId) return 0;
    let balance = 0;
    
    // Simple local stock calculation (same as elsewhere)
    for (const m of stockMovements) {
      if (m.warehouseId === warehouseId && m.variantId === variantId) {
        const qty = parseFloat(m.quantity || '0');
        if (['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT'].includes(m.type)) {
          balance -= qty;
        } else {
          balance += qty;
        }
      }
    }
    return balance;
  };

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(), variantId: '', quantity: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: 'variantId' | 'quantity', value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    if (errors[`item_${id}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`item_${id}_${field}`];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!sourceWarehouseId) newErrors.sourceWarehouseId = 'مطلوب';
    if (!destinationWarehouseId) newErrors.destinationWarehouseId = 'مطلوب';
    if (sourceWarehouseId === destinationWarehouseId && sourceWarehouseId) {
      newErrors.destinationWarehouseId = 'لا يمكن التحويل لنفس المخزن';
    }
    if (!date) newErrors.date = 'مطلوب';
    
    if (items.length === 0) {
      newErrors.items = 'يجب إضافة صنف واحد على الأقل';
    }

    const usedVariants = new Set<string>();

    items.forEach((item, index) => {
      if (!item.variantId) {
        newErrors[`item_${item.id}_variantId`] = 'مطلوب';
      } else {
        if (usedVariants.has(item.variantId)) {
          newErrors[`item_${item.id}_variantId`] = 'تم اختيار هذا الصنف مسبقاً';
        }
        usedVariants.add(item.variantId);
      }

      const qty = parseFloat(item.quantity);
      if (!item.quantity || isNaN(qty) || qty <= 0) {
        newErrors[`item_${item.id}_quantity`] = 'مطلوب';
      } else if (item.variantId && sourceWarehouseId) {
        const available = getAvailableStock(sourceWarehouseId, item.variantId);
        if (qty > available) {
          newErrors[`item_${item.id}_quantity`] = `المتوفر: ${available}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getTransferData = () => ({
    sourceWarehouseId,
    destinationWarehouseId,
    date,
    notes,
    items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity }))
  });

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setIsSavingDraft(true);
    try {
      await StockTransferRepository.saveDraft({
        ...(draft ? { id: draft.id } : {}),
        ...getTransferData()
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setErrors({ submit: err.message || 'حدث خطأ' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSend = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await StockTransferRepository.sendTransfer(draft?.id || '', { id: draft?.id || '', ...getTransferData() });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setErrors({ submit: err.message || 'حدث خطأ' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowLeftRight className="text-[var(--color-primary)]" size={24} />
            {draft ? 'تعديل تحويل مسودة' : 'تحويل مخزني جديد'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {errors.submit && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">من مخزن <span className="text-[var(--color-danger)]">*</span></Label>
              <Select 
                id="source" 
                value={sourceWarehouseId}
                onChange={(e) => {
                  setSourceWarehouseId(e.target.value);
                  setErrors({ ...errors, sourceWarehouseId: '' });
                }}
                error={!!errors.sourceWarehouseId}
              >
                <option value="">اختر المخزن المصدر...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
              {errors.sourceWarehouseId && <p className="text-xs text-[var(--color-danger)]">{errors.sourceWarehouseId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dest">إلى مخزن <span className="text-[var(--color-danger)]">*</span></Label>
              <Select 
                id="dest" 
                value={destinationWarehouseId}
                onChange={(e) => {
                  setDestinationWarehouseId(e.target.value);
                  setErrors({ ...errors, destinationWarehouseId: '' });
                }}
                error={!!errors.destinationWarehouseId}
              >
                <option value="">اختر المخزن المستلم...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
              {errors.destinationWarehouseId && <p className="text-xs text-[var(--color-danger)]">{errors.destinationWarehouseId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">تاريخ التحويل <span className="text-[var(--color-danger)]">*</span></Label>
              <Input 
                id="date" 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                error={!!errors.date}
              />
              {errors.date && <p className="text-xs text-[var(--color-danger)]">{errors.date}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Input 
                id="notes" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية حول التحويل..."
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">الأصناف المحولة</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus size={16} className="me-2" />
                إضافة صنف
              </Button>
            </div>
            
            {errors.items && <p className="text-sm text-[var(--color-danger)]">{errors.items}</p>}

            {items.length > 0 ? (
              <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-muted)]/50">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium text-[var(--color-muted-foreground)]">الصنف</th>
                      <th className="px-3 py-2 text-start font-medium text-[var(--color-muted-foreground)] w-32">المتوفر</th>
                      <th className="px-3 py-2 text-start font-medium text-[var(--color-primary)] w-32">الكمية للتحويل</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {items.map((item) => {
                      const available = getAvailableStock(sourceWarehouseId, item.variantId);
                      
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <Select
                              value={item.variantId}
                              onChange={(e) => handleUpdateItem(item.id, 'variantId', e.target.value)}
                              error={!!errors[`item_${item.id}_variantId`]}
                            >
                              <option value="">اختر الصنف...</option>
                              {variants.map(v => {
                                const product = products.find(p => p.id === v.productId);
                                return (
                                  <option key={v.id} value={v.id}>
                                    {product?.name} - {v.name} ({v.sku})
                                  </option>
                                );
                              })}
                            </Select>
                            {errors[`item_${item.id}_variantId`] && (
                              <p className="text-xs text-[var(--color-danger)] mt-1">{errors[`item_${item.id}_variantId`]}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {item.variantId && sourceWarehouseId ? available : '-'}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                              error={!!errors[`item_${item.id}_quantity`]}
                            />
                            {errors[`item_${item.id}_quantity`] && (
                              <p className="text-xs text-[var(--color-danger)] mt-1">{errors[`item_${item.id}_quantity`]}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Button 
                              type="button" 
                              variant="secondary" 
                              size="icon"
                              className="h-8 w-8 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-[var(--color-muted)]/30 rounded-lg border border-dashed border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-muted-foreground)] mb-2">لم يتم إضافة أي أصناف بعد</p>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  إضافة صنف للتحويل
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-4 border-t border-[var(--color-border)] gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isSavingDraft}
            >
              إلغاء
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleSaveDraft}
                disabled={isSubmitting || isSavingDraft}
              >
                {isSavingDraft ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : null}
                حفظ كمسودة
              </Button>
              <Button 
                type="button" 
                variant="default" 
                onClick={handleSend}
                disabled={isSubmitting || isSavingDraft}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  'اعتماد وإرسال التحويل'
                )}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
