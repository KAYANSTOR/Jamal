import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { ProductRepository } from '../../lib/repositories';
import { db, type LocalCategory, LocalUnit } from '../../lib/db';
import { Loader2, Plus, X } from 'lucide-react';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: LocalCategory[];
  units: LocalUnit[];
  onSuccess?: () => void;
}

export function ProductFormDialog({ open, onOpenChange, categories, units, onSuccess }: ProductFormDialogProps) {
  
  // Product Data
  const [productData, setProductData] = useState({
    name: '',
    categoryId: '',
    description: '',
    minStockLevel: '0'
  });

  // Initial Variant Data
  const [variantData, setVariantData] = useState({
    name: 'الافتراضي',
    sku: '',
    barcode: '',
    unitId: ''
  });

  // Dynamic JSON Attributes for Variant
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form
      setProductData({ name: '', categoryId: '', description: '', minStockLevel: '0' });
      setVariantData({ name: 'الافتراضي', sku: '', barcode: '', unitId: '' });
      setAttributes([]);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  const addAttribute = () => {
    setAttributes([...attributes, { key: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const updateAttribute = (index: number, field: 'key' | 'value', val: string) => {
    const newAttrs = [...attributes];
    newAttrs[index][field] = val;
    setAttributes(newAttrs);
  };

  const validate = async () => {
    const newErrors: Record<string, string> = {};
    
    // Product Validation
    if (!productData.name.trim()) newErrors.productName = 'اسم الصنف مطلوب';
    if (!productData.categoryId) newErrors.categoryId = 'يرجى اختيار تصنيف';
    if (isNaN(Number(productData.minStockLevel)) || Number(productData.minStockLevel) < 0) {
      newErrors.minStockLevel = 'الحد الأدنى يجب أن يكون رقماً صحيحاً';
    }

    // Variant Validation
    if (!variantData.name.trim()) newErrors.variantName = 'اسم النوع مطلوب (مثال: أحمر، صغير)';
    if (!variantData.unitId) newErrors.unitId = 'وحدة القياس مطلوبة';

    // Check SKU Uniqueness
    if (variantData.sku?.trim()) {
      const existingSku = await db.variants.where('sku').equals(variantData.sku.trim()).first();
      if (existingSku) newErrors.sku = 'رقم الصنف (SKU) مستخدم مسبقاً';
    }

    // Check Barcode Uniqueness
    if (variantData.barcode?.trim()) {
      const existingBarcode = await db.variants.where('barcode').equals(variantData.barcode.trim()).first();
      if (existingBarcode) newErrors.barcode = 'الباركود مستخدم مسبقاً';
    }
    
    // Attributes Validation
    attributes.forEach((attr, idx) => {
      if (attr.key.trim() && !attr.value.trim()) {
        newErrors[`attr_${idx}`] = 'يجب إدخال قيمة الخاصية';
      } else if (!attr.key.trim() && attr.value.trim()) {
        newErrors[`attr_${idx}`] = 'يجب إدخال اسم الخاصية';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validate();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      // Prepare JSON attributes
      const attrsObj: Record<string, string> = {};
      attributes.forEach(attr => {
        if (attr.key.trim() && attr.value.trim()) {
          attrsObj[attr.key.trim()] = attr.value.trim();
        }
      });

      const finalVariantData = {
        ...variantData,
        attributes: Object.keys(attrsObj).length > 0 ? JSON.stringify(attrsObj) : undefined
      };

      await ProductRepository.addProduct(productData, finalVariantData);
      
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save product', err);
      setErrors({ submit: 'حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader>
        <DialogTitle>إضافة صنف جديد (Product & Variant)</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
        <DialogContent className="space-y-6">
          {errors.submit && (
            <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-md text-[var(--color-danger)] text-sm">
              {errors.submit}
            </div>
          )}

          {/* Product Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-[var(--color-foreground)] border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[var(--color-primary)] rounded-full inline-block"></span>
              البيانات الأساسية للصنف (Master)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="productName">اسم الصنف <span className="text-[var(--color-danger)]">*</span></Label>
                <Input 
                  id="productName" 
                  placeholder="مثال: ورق طباعة A4، كابل شبكة..." 
                  value={productData.name}
                  onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                  error={!!errors.productName}
                  autoFocus
                />
                {errors.productName && <p className="text-xs text-[var(--color-danger)]">{errors.productName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">التصنيف <span className="text-[var(--color-danger)]">*</span></Label>
                <Select 
                  id="category" 
                  value={productData.categoryId}
                  onChange={(e) => setProductData({ ...productData, categoryId: e.target.value })}
                  error={!!errors.categoryId}
                >
                  <option value="">اختر التصنيف...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
                {errors.categoryId && <p className="text-xs text-[var(--color-danger)]">{errors.categoryId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStock">الحد الأدنى للمخزون</Label>
                <Input 
                  id="minStock" 
                  type="number"
                  min="0"
                  value={productData.minStockLevel}
                  onChange={(e) => setProductData({ ...productData, minStockLevel: e.target.value })}
                  error={!!errors.minStockLevel}
                />
                {errors.minStockLevel && <p className="text-xs text-[var(--color-danger)]">{errors.minStockLevel}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">وصف الصنف (اختياري)</Label>
                <Input 
                  id="description" 
                  placeholder="وصف إضافي للمادة..." 
                  value={productData.description}
                  onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Initial Variant Section */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-bold text-[var(--color-foreground)] border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[var(--color-primary)] rounded-full inline-block"></span>
              بيانات النوع الأول (Initial Variant)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variantName">اسم النوع <span className="text-[var(--color-danger)]">*</span></Label>
                <Input 
                  id="variantName" 
                  placeholder="مثال: الافتراضي، لون أحمر..." 
                  value={variantData.name}
                  onChange={(e) => setVariantData({ ...variantData, name: e.target.value })}
                  error={!!errors.variantName}
                />
                {errors.variantName && <p className="text-xs text-[var(--color-danger)]">{errors.variantName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">وحدة القياس <span className="text-[var(--color-danger)]">*</span></Label>
                <Select 
                  id="unit" 
                  value={variantData.unitId}
                  onChange={(e) => setVariantData({ ...variantData, unitId: e.target.value })}
                  error={!!errors.unitId}
                >
                  <option value="">اختر الوحدة...</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name} {u.symbol ? `(${u.symbol})` : ''}</option>
                  ))}
                </Select>
                {errors.unitId && <p className="text-xs text-[var(--color-danger)]">{errors.unitId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className={errors.sku ? 'text-[var(--color-danger)]' : ''}>رقم الصنف (SKU)</Label>
                <Input 
                  id="sku" 
                  placeholder="رقم مرجعي مميز"
                  value={variantData.sku}
                  onChange={(e) => setVariantData({ ...variantData, sku: e.target.value })}
                  error={!!errors.sku}
                />
                {errors.sku && <p className="text-xs text-[var(--color-danger)]">{errors.sku}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode" className={errors.barcode ? 'text-[var(--color-danger)]' : ''}>الباركود (Barcode)</Label>
                <Input 
                  id="barcode" 
                  placeholder="امسح الباركود أو أدخله يدوياً"
                  value={variantData.barcode}
                  onChange={(e) => setVariantData({ ...variantData, barcode: e.target.value })}
                  error={!!errors.barcode}
                />
                {errors.barcode && <p className="text-xs text-[var(--color-danger)]">{errors.barcode}</p>}
              </div>
            </div>
            
            {/* Attributes List */}
            <div className="mt-4 border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-surface)]">
              <div className="flex justify-between items-center mb-3">
                <Label>الخصائص الإضافية (Attributes)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAttribute} className="h-8">
                  <Plus size={14} className="me-1" /> إضافة خاصية
                </Button>
              </div>
              
              {attributes.length === 0 ? (
                <p className="text-xs text-[var(--color-muted-foreground)] text-center py-2">
                  لا توجد خصائص إضافية مضافة (مثل اللون، المقاس، الموديل)
                </p>
              ) : (
                <div className="space-y-2">
                  {attributes.map((attr, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input 
                          placeholder="الخاصية (مثال: اللون)" 
                          value={attr.key}
                          onChange={(e) => updateAttribute(idx, 'key', e.target.value)}
                          error={!!errors[`attr_${idx}`] && !attr.key.trim()}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <Input 
                          placeholder="القيمة (مثال: أحمر)" 
                          value={attr.value}
                          onChange={(e) => updateAttribute(idx, 'value', e.target.value)}
                          error={!!errors[`attr_${idx}`] && !attr.value.trim()}
                          className="h-8 text-xs"
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="icon" 
                        className="h-8 w-8 shrink-0 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 hover:border-[var(--color-danger)]/30"
                        onClick={() => removeAttribute(idx)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                  {Object.keys(errors).some(k => k.startsWith('attr_')) && (
                    <p className="text-xs text-[var(--color-danger)]">يرجى تعبئة جميع الحقول المضافة</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-[var(--color-muted)]/50 p-3 text-xs text-[var(--color-muted-foreground)] rounded-md border border-[var(--color-border)] mt-2">
            <p>يتم حفظ بيانات الصنف والنوع محلياً أولاً ومزامنتها تلقائياً عند توفر الاتصال.</p>
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
              'إضافة الصنف'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
