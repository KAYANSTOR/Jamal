import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { SupplierRepository } from '../../lib/repositories';
import type { LocalSupplier } from '../../lib/db';
import { Loader2 } from 'lucide-react';

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: LocalSupplier | null;
  onSuccess?: () => void;
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSuccess }: SupplierFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (supplier) {
        setFormData({
          name: supplier.name,
          phone: supplier.phone || '',
          email: supplier.email || ''
        });
      } else {
        setFormData({
          name: '',
          phone: '',
          email: ''
        });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, supplier]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'اسم المورد مطلوب';
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صالح';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (supplier) {
        await SupplierRepository.updateSupplier(supplier.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined
        });
      } else {
        await SupplierRepository.addSupplier({
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined
        });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save supplier:', err);
      setErrors({ submit: 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{supplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {errors.submit && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
              {errors.submit}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className={errors.name ? 'text-[var(--color-danger)]' : ''}>
              اسم المورد <span className="text-[var(--color-danger)]">*</span>
            </Label>
            <Input 
              id="name" 
              placeholder="مثال: شركة التوريدات العربية"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!errors.name}
            />
            {errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input 
              id="phone" 
              dir="ltr"
              className="text-end"
              placeholder="+966 50 000 0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className={errors.email ? 'text-[var(--color-danger)]' : ''}>
              البريد الإلكتروني
            </Label>
            <Input 
              id="email" 
              type="email"
              dir="ltr"
              className="text-end"
              placeholder="contact@supplier.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={!!errors.email}
            />
            {errors.email && <p className="text-xs text-[var(--color-danger)]">{errors.email}</p>}
          </div>
          
          <DialogFooter className="pt-4">
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
                'حفظ البيانات'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
