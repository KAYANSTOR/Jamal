import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { MaterialReturnRepository } from '../../lib/repositories';
import { db, type LocalMaterialIssue, type LocalMaterialIssueItem } from '../../lib/db';
import { Loader2, ArrowLeftRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface MaterialReturnFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: LocalMaterialIssue[];
  onSuccess?: () => void;
}

export function MaterialReturnFormDialog({ open, onOpenChange, issues, onSuccess }: MaterialReturnFormDialogProps) {
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnItems, setReturnItems] = useState<{ issueItemId: string; returnQuantity: string; variantId: string }[]>([]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];
  
  const selectedIssue = issues.find(i => i.id === selectedIssueId);
  const issueItems = useLiveQuery(
    () => selectedIssueId ? db.materialIssueItems.where('issueId').equals(selectedIssueId).toArray() : [],
    [selectedIssueId]
  ) || [];

  const getProductName = (variantId: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return 'غير معروف';
    const product = products.find(p => p.id === variant.productId);
    return product ? `${product.name} - ${variant.name}` : variant.name;
  };

  useEffect(() => {
    if (open) {
      setSelectedIssueId('');
      setReturnDate(new Date().toISOString().split('T')[0]);
      setReturnItems([]);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (issueItems.length > 0) {
      // Initialize returnItems with 0 quantity
      setReturnItems(issueItems.map(item => ({
        issueItemId: item.id,
        variantId: item.variantId,
        returnQuantity: ''
      })));
    } else {
      setReturnItems([]);
    }
  }, [issueItems]);

  const handleUpdateItem = (issueItemId: string, value: string) => {
    setReturnItems(prev => prev.map(item => 
      item.issueItemId === issueItemId ? { ...item, returnQuantity: value } : item
    ));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedIssueId) newErrors.issueId = 'يجب اختيار سند الصرف';
    if (!returnDate) newErrors.date = 'يجب إدخال التاريخ';
    
    let hasAnyReturn = false;
    
    returnItems.forEach(rItem => {
      const qty = parseFloat(rItem.returnQuantity);
      if (qty > 0) {
        hasAnyReturn = true;
        const iItem = issueItems.find(i => i.id === rItem.issueItemId);
        if (iItem) {
          const issued = parseFloat(iItem.quantity || '0');
          const alreadyReturned = parseFloat(iItem.returnedQuantity || '0');
          const alreadyExchanged = parseFloat(iItem.exchangedQuantity || '0');
          const remaining = issued - alreadyReturned - alreadyExchanged;
          
          if (qty > remaining) {
            newErrors[`item_${rItem.issueItemId}`] = `الكمية المرتجعة أكبر من المتبقي (${remaining})`;
          }
        }
      } else if (qty < 0) {
        newErrors[`item_${rItem.issueItemId}`] = 'الكمية لا يمكن أن تكون سالبة';
      }
    });

    if (!hasAnyReturn && selectedIssueId) {
      newErrors.items = 'يجب إدخال كمية مرتجعة واحدة على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!selectedIssue) return;

    // Filter out zero or empty returns
    const itemsToReturn = returnItems.filter(item => parseFloat(item.returnQuantity) > 0);

    setIsSubmitting(true);
    try {
      await MaterialReturnRepository.returnMaterialIssue(
        selectedIssueId,
        returnDate,
        itemsToReturn,
        selectedIssue.warehouseId
      );
      
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to save material return:', err);
      setErrors({ submit: err.message || 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only allow returning from POSTED issues
  const postedIssues = issues.filter(i => i.status === 'POSTED');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>إنشاء مرتجع مواد جديد</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {errors.submit && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue">سند الصرف الأصلي <span className="text-[var(--color-danger)]">*</span></Label>
              <Select 
                id="issue" 
                value={selectedIssueId}
                onChange={(e) => {
                  setSelectedIssueId(e.target.value);
                  setErrors({ ...errors, issueId: '' });
                }}
                error={!!errors.issueId}
              >
                <option value="">اختر سند الصرف...</option>
                {postedIssues.map(issue => (
                  <option key={issue.id} value={issue.id}>
                    {issue.issueNumber ? `سند ${issue.issueNumber}` : `سند ${issue.id.substring(0, 8)}`} - مستلم: {issue.issuedBy}
                  </option>
                ))}
              </Select>
              {errors.issueId && <p className="text-xs text-[var(--color-danger)]">{errors.issueId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">تاريخ الإرجاع <span className="text-[var(--color-danger)]">*</span></Label>
              <Input 
                id="date" 
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                error={!!errors.date}
              />
              {errors.date && <p className="text-xs text-[var(--color-danger)]">{errors.date}</p>}
            </div>
          </div>

          {selectedIssueId && (
            <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
              <Label className="text-base font-semibold">تحديد الكميات المرتجعة</Label>
              
              {errors.items && <p className="text-sm text-[var(--color-danger)]">{errors.items}</p>}

              {issueItems.length > 0 && (
                <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--color-muted)]/50">
                      <tr>
                        <th className="px-3 py-2 text-start font-medium text-[var(--color-muted-foreground)]">الصنف</th>
                        <th className="px-3 py-2 text-center font-medium text-[var(--color-muted-foreground)] w-24">المصروف</th>
                        <th className="px-3 py-2 text-center font-medium text-[var(--color-muted-foreground)] w-24">مرتجع سابقاً</th>
                        <th className="px-3 py-2 text-center font-medium text-[var(--color-muted-foreground)] w-24">المتبقي</th>
                        <th className="px-3 py-2 text-start font-medium text-[var(--color-primary)] w-32">إرجاع الآن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {issueItems.map((item) => {
                        const issued = parseFloat(item.quantity || '0');
                        const returned = parseFloat(item.returnedQuantity || '0');
                        const exchanged = parseFloat(item.exchangedQuantity || '0');
                        const remaining = issued - returned - exchanged;
                        
                        const rItem = returnItems.find(ri => ri.issueItemId === item.id);
                        const rValue = rItem?.returnQuantity || '';

                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-2">
                              <span className="font-medium">{getProductName(item.variantId)}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {issued}
                            </td>
                            <td className="px-3 py-2 text-center text-[var(--color-muted-foreground)]">
                              {returned + exchanged > 0 ? returned + exchanged : '-'}
                            </td>
                            <td className="px-3 py-2 text-center font-bold">
                              {remaining}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                min="0"
                                max={remaining}
                                step="0.1"
                                placeholder="0"
                                value={rValue}
                                onChange={(e) => handleUpdateItem(item.id, e.target.value)}
                                disabled={remaining <= 0}
                                error={!!errors[`item_${item.id}`]}
                              />
                              {errors[`item_${item.id}`] && (
                                <p className="text-xs text-[var(--color-danger)] mt-1">{errors[`item_${item.id}`]}</p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
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
              disabled={isSubmitting || !selectedIssueId}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  جاري الترحيل...
                </>
              ) : (
                'اعتماد المرتجع وإعادة للمخزون'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
