import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DepartmentRepository } from '../../lib/repositories';
import type { LocalDepartment } from '../../lib/db';
import { Loader2 } from 'lucide-react';

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: LocalDepartment | null;
  onSuccess?: () => void;
}

export function DepartmentFormDialog({ open, onOpenChange, department, onSuccess }: DepartmentFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (department) {
        setFormData({
          name: department.name,
          description: department.description || ''
        });
      } else {
        setFormData({
          name: '',
          description: ''
        });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, department]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'اسم القسم مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (department) {
        await DepartmentRepository.updateDepartment(department.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        });
      } else {
        await DepartmentRepository.addDepartment({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        });
      }
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save department:', err);
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
          <DialogTitle>{department ? 'تعديل بيانات القسم' : 'إضافة قسم جديد'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {errors.submit && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
              {errors.submit}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className={errors.name ? 'text-[var(--color-danger)]' : ''}>
              اسم القسم / مركز الاستخدام <span className="text-[var(--color-danger)]">*</span>
            </Label>
            <Input 
              id="name" 
              placeholder="مثال: قسم الصيانة، المطبخ الرئيسي..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!errors.name}
            />
            {errors.name && <p className="text-xs text-[var(--color-danger)]">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف (اختياري)</Label>
            <Input 
              id="description" 
              placeholder="وصف مختصر للقسم..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
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
