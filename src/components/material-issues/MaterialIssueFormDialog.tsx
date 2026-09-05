import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { MaterialIssueRepository } from '../../lib/repositories';
import type { LocalDepartment, LocalWarehouse, LocalProduct, LocalVariant, LocalCategory, LocalUnit } from '../../lib/db';
import { db } from '../../lib/db';
import { Loader2, Plus, X, Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface MaterialIssueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: LocalDepartment[];
  warehouses: LocalWarehouse[];
  onSuccess?: () => void;
}

export function MaterialIssueFormDialog({ open, onOpenChange, departments, warehouses, onSuccess }: MaterialIssueFormDialogProps) {
  // Needs variants, products, categories, units, and balances
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const balances = useLiveQuery(() => db.stockMovements.toArray()) || [];
  
  // Compute available stock per variant & warehouse
  // Key: `${warehouseId}-${variantId}`
  const stockBalances: Record<string, number> = {};
  balances.forEach(m => {
    const qty = parseFloat(m.quantity);
    const isNegative = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
    const sign = isNegative ? -1 : 1;
    const key = `${m.warehouseId}-${m.variantId}`;
    stockBalances[key] = (stockBalances[key] || 0) + (qty * sign);
  });

  const getProductName = (variantId: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return 'غير معروف';
    const product = products.find(p => p.id === variant.productId);
    return product ? `${product.name} - ${variant.name}` : variant.name;
  };

  const [issueData, setIssueData] = useState({
    departmentId: '',
    warehouseId: '',
    issueNumber: '',
    date: new Date().toISOString().split('T')[0],
    issuedBy: '',
    notes: ''
  });

  const [items, setItems] = useState<{ variantId: string; quantity: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (open) {
      setIssueData({
        departmentId: '',
        warehouseId: '',
        issueNumber: '',
        date: new Date().toISOString().split('T')[0],
        issuedBy: '',
        notes: ''
      });
      setItems([]);
      setErrors({});
      setIsSubmitting(false);
      setSearchTerm('');
    }
  }, [open]);

  const handleAddItem = (variantId: string) => {
    if (!issueData.warehouseId) {
      setErrors({ warehouseId: 'يجب اختيار المخزن أولاً لمعرفة الرصيد' });
      return;
    }
    if (items.find(i => i.variantId === variantId)) return;
    setItems([...items, { variantId, quantity: '1' }]);
    setSearchTerm('');
    setErrors({ ...errors, warehouseId: '' });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleUpdateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!issueData.departmentId) newErrors.departmentId = 'يجب اختيار القسم';
    if (!issueData.warehouseId) newErrors.warehouseId = 'يجب اختيار المخزن';
    if (!issueData.date) newErrors.date = 'يجب إدخال التاريخ';
    if (!issueData.issuedBy.trim()) newErrors.issuedBy = 'يجب إدخال اسم المستلم/المسؤول';
    if (items.length === 0) newErrors.items = 'يجب إضافة صنف واحد على الأقل';
    
    // Check available stock
    items.forEach((item, index) => {
      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        newErrors[`item_${index}`] = 'الكمية يجب أن تكون أكبر من صفر';
      } else {
        const key = `${issueData.warehouseId}-${item.variantId}`;
        const available = stockBalances[key] || 0;
        if (qty > available) {
          newErrors[`item_${index}`] = `الكمية المطلوبة أكبر من المتاح (${available})`;
        }
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
      await MaterialIssueRepository.addMaterialIssue(
        {
          departmentId: issueData.departmentId,
          warehouseId: issueData.warehouseId,
          issueNumber: issueData.issueNumber || undefined,
          date: issueData.date,
          issuedBy: issueData.issuedBy.trim(),
          notes: issueData.notes.trim() || undefined
        },
        items.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity
        }))
      );
      
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to save material issue:', err);
      setErrors({ submit: err.message || 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVariants = variants.filter(v => {
    if (!searchTerm) return false;
    const pName = getProductName(v.id).toLowerCase();
    const search = searchTerm.toLowerCase();
    return pName.includes(search) || v.sku?.toLowerCase().includes(search);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>إنشاء سند صرف مواد جديد</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {errors.submit && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">القسم / مركز التكلفة <span className="text-[var(--color-danger)]">*</span></Label>
              <Select 
                id="department" 
                value={issueData.departmentId}
                onChange={(e) => setIssueData({ ...issueData, departmentId: e.target.value })}
                error={!!errors.departmentId}
              >
                <option value="">اختر القسم...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
              {errors.departmentId && <p className="text-xs text-[var(--color-danger)]">{errors.departmentId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse">المخزن (المصدر) <span className="text-[var(--color-danger)]">*</span></Label>
              <Select 
                id="warehouse" 
                value={issueData.warehouseId}
                onChange={(e) => {
                  setIssueData({ ...issueData, warehouseId: e.target.value });
                  setErrors({ ...errors, warehouseId: '' });
                }}
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
              <Label htmlFor="issuedBy">المسؤول / المستلم <span className="text-[var(--color-danger)]">*</span></Label>
              <Input 
                id="issuedBy" 
                placeholder="اسم الشخص المستلم للمواد"
                value={issueData.issuedBy}
                onChange={(e) => setIssueData({ ...issueData, issuedBy: e.target.value })}
                error={!!errors.issuedBy}
              />
              {errors.issuedBy && <p className="text-xs text-[var(--color-danger)]">{errors.issuedBy}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">التاريخ <span className="text-[var(--color-danger)]">*</span></Label>
              <Input 
                id="date" 
                type="date"
                value={issueData.date}
                onChange={(e) => setIssueData({ ...issueData, date: e.target.value })}
                error={!!errors.date}
              />
              {errors.date && <p className="text-xs text-[var(--color-danger)]">{errors.date}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="issueNumber">رقم المستند (اختياري)</Label>
              <Input 
                id="issueNumber" 
                placeholder="رقم المرجع أو المستند الورقي"
                value={issueData.issueNumber}
                onChange={(e) => setIssueData({ ...issueData, issueNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">الملاحظات</Label>
            <Input 
              id="notes" 
              placeholder="أي تفاصيل أو ملاحظات إضافية حول سبب الصرف..."
              value={issueData.notes}
              onChange={(e) => setIssueData({ ...issueData, notes: e.target.value })}
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">الأصناف المصروفة <span className="text-[var(--color-danger)]">*</span></Label>
            </div>
            
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
              <Input 
                placeholder="ابحث باسم الصنف أو الباركود لإضافته..." 
                className="ps-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!issueData.warehouseId}
              />
              {!issueData.warehouseId && (
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  الرجاء اختيار المخزن أولاً للبحث في الأصناف
                </p>
              )}
              
              {searchTerm && filteredVariants.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredVariants.map(v => {
                    const key = `${issueData.warehouseId}-${v.id}`;
                    const available = stockBalances[key] || 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        className="w-full text-start px-4 py-2 hover:bg-[var(--color-muted)] flex items-center justify-between disabled:opacity-50"
                        onClick={() => handleAddItem(v.id)}
                        disabled={available <= 0}
                      >
                        <div>
                          <span className="font-medium text-sm">{getProductName(v.id)}</span>
                          {v.sku && <span className="text-xs text-[var(--color-muted-foreground)] ms-2">({v.sku})</span>}
                        </div>
                        <div className="text-xs text-[var(--color-muted-foreground)]">
                          المتاح: <span className={available > 0 ? "text-[var(--color-success)] font-bold" : "text-[var(--color-danger)]"}>{available}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {errors.items && <p className="text-sm text-[var(--color-danger)]">{errors.items}</p>}

            {items.length > 0 && (
              <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-muted)]/50">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium text-[var(--color-muted-foreground)]">الصنف</th>
                      <th className="px-3 py-2 text-start font-medium text-[var(--color-muted-foreground)]">المتاح</th>
                      <th className="px-3 py-2 text-start font-medium text-[var(--color-muted-foreground)] w-32">الكمية</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {items.map((item, index) => {
                      const key = `${issueData.warehouseId}-${item.variantId}`;
                      const available = stockBalances[key] || 0;
                      return (
                        <tr key={index}>
                          <td className="px-3 py-2">
                            <span className="font-medium">{getProductName(item.variantId)}</span>
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                            {available}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                              error={!!errors[`item_${index}`]}
                            />
                            {errors[`item_${index}`] && (
                              <p className="text-xs text-[var(--color-danger)] mt-1">{errors[`item_${index}`]}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-end w-12">
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-8 w-8 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <X size={14} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-4 border-t border-[var(--color-border)]">
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
                  جاري الحفظ والترحيل...
                </>
              ) : (
                'صرف وترحيل المخزون'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
