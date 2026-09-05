import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { WarehouseRepository } from '../../lib/repositories';
import type { LocalWarehouse } from '../../lib/db';
import { Loader2 } from 'lucide-react';

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: LocalWarehouse | null;
  onSuccess?: () => void;
}

export function WarehouseFormDialog({ open, onOpenChange, warehouse, onSuccess }: WarehouseFormDialogProps) {
  const isEditing = !!warehouse;
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'MAIN',
    status: 'ACTIVE'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (warehouse) {
        setFormData({
          name: warehouse.name,
          type: warehouse.type,
          status: warehouse.status
        });
      } else {
        setFormData({ name: '', type: 'MAIN', status: 'ACTIVE' });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, warehouse]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'اسم المخزن مطلوب';
    } else if (formData.name.length < 3) {
      newErrors.name = 'اسم المخزن يجب أن يكون 3 أحرف على الأقل';
    }
    
    if (!formData.type) newErrors.type = 'نوع المخزن مطلوب';
    if (!formData.status) newErrors.status = 'حالة المخزن مطلوبة';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && warehouse) {
        await WarehouseRepository.updateWarehouse(warehouse.id, formData);
      } else {
        await WarehouseRepository.addWarehouse(formData);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save warehouse', err);
      setErrors({ submit: 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>{isEditing ? 'تعديل بيانات المخزن' : 'إضافة مخزن جديد'}</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit}>
        <DialogContent className="space-y-4">
          {errors.submit && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
              {errors.submit}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className={errors.name ? 'text-[var(--color-danger)]' : ''}>
              اسم المخزن <span className="text-[var(--color-danger)]">*</span>
            </Label>
            <Input 
              id="name" 
              placeholder="مثال: المخزن الرئيسي، فرع الشمال..." 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!errors.name}
              autoFocus
            />
            {errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">النوع</Label>
              <Select 
                id="type" 
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                error={!!errors.type}
              >
                <option value="MAIN">رئيسي (Main)</option>
                <option value="SUB">فرعي (Sub)</option>
                <option value="STORE">متجر (Store)</option>
                <option value="VIRTUAL">افتراضي (Virtual)</option>
              </Select>
              {errors.type && <p className="text-xs text-[var(--color-danger)]">{errors.type}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">الحالة</Label>
              <Select 
                id="status" 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                error={!!errors.status}
              >
                <option value="ACTIVE">نشط</option>
                <option value="INACTIVE">متوقف</option>
                <option value="MAINTENANCE">تحت الصيانة</option>
              </Select>
              {errors.status && <p className="text-xs text-[var(--color-danger)]">{errors.status}</p>}
            </div>
          </div>
          
          <div className="bg-[var(--color-muted)]/50 p-3 text-xs text-[var(--color-muted-foreground)] rounded-md border border-[var(--color-border)] mt-2">
            <p>يتم حفظ البيانات محلياً أولاً ومزامنتها تلقائياً عند توفر الاتصال.</p>
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
              isEditing ? 'حفظ التعديلات' : 'إضافة المخزن'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
