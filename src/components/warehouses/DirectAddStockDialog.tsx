import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalWarehouse } from '../../lib/db';
import { Plus, Zap, PackageSearch } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../../lib/utils';

interface DirectAddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: LocalWarehouse | null;
}

type AddMode = 'existing' | 'smart';
type ProductTemplate = 'general' | 'beads' | 'fabric';

export function DirectAddStockDialog({ open, onOpenChange, warehouse }: DirectAddStockDialogProps) {
  const [mode, setMode] = useState<AddMode>('smart');
  
  // Existing Mode State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  
  // Smart Mode State
  const [template, setTemplate] = useState<ProductTemplate>('beads');
  const [productName, setProductName] = useState('');
  
  // Smart Fields - Beads
  const [color, setColor] = useState('');
  const [weight, setWeight] = useState('');
  
  // Smart Fields - Fabric
  const [fabricType, setFabricType] = useState('');
  const [length, setLength] = useState('');

  // Shared State
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const products = useLiveQuery(() => db.products.toArray()) || [];
  const variants = useLiveQuery(() => 
    selectedProductId ? db.variants.where('productId').equals(selectedProductId).toArray() : []
  , [selectedProductId]) || [];

  const handleSave = async () => {
    if (!warehouse) return;
    
    if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
      alert('الرجاء إدخال كمية صحيحة.');
      return;
    }

    let finalVariantId = selectedVariantId;

    if (mode === 'smart') {
      if (!productName.trim()) {
        alert('الرجاء إدخال اسم الصنف.');
        return;
      }

      // 1. Create Product
      const newProductId = 'PRD-' + uuidv4().substring(0, 8).toUpperCase();
      await db.products.add({
        id: newProductId,
        name: productName,
        createdAt: new Date().toISOString(),
      });

      // 2. Determine Variant Name & Attributes
      let variantName = productName;
      let attributesObj: any = { template };
      
      if (template === 'beads') {
        const parts = [productName];
        if (color) { parts.push(color); attributesObj.color = color; }
        if (weight) { parts.push(weight); attributesObj.weight = weight; }
        variantName = parts.join(' - ');
      } else if (template === 'fabric') {
        const parts = [productName];
        if (fabricType) { parts.push(fabricType); attributesObj.fabricType = fabricType; }
        if (length) { parts.push(length); attributesObj.length = length; }
        variantName = parts.join(' - ');
      }

      // 3. Create Variant
      finalVariantId = 'VAR-' + uuidv4().substring(0, 8).toUpperCase();
      await db.variants.add({
        id: finalVariantId,
        productId: newProductId,
        name: variantName,
        attributes: JSON.stringify(attributesObj)
      });
    } else {
      // Existing mode validation
      if (!selectedVariantId) {
        alert('الرجاء اختيار الصنف.');
        return;
      }
    }

    // 4. Create Stock Movement
    const movementId = 'MOV-' + uuidv4().substring(0, 8).toUpperCase();
    await db.stockMovements.add({
      id: movementId,
      operationId: movementId,
      warehouseId: warehouse.id,
      variantId: finalVariantId,
      type: 'ADJUSTMENT_IN',
      quantity: quantity,
      date: new Date().toISOString(),
      notes: notes || (mode === 'smart' ? 'إضافة ذكية مباشرة للمخزن' : 'إضافة مباشرة من شاشة المخزن')
    });

    // Reset & Close
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProductId('');
    setSelectedVariantId('');
    setProductName('');
    setColor('');
    setWeight('');
    setFabricType('');
    setLength('');
    setQuantity('');
    setNotes('');
  };

  if (!warehouse) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if(!val) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة بضاعة للمخزن: {warehouse.name}</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 p-1 bg-[var(--color-muted)] rounded-lg mt-2">
          <button 
            onClick={() => setMode('smart')} 
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all", 
              mode === 'smart' ? "bg-white shadow-[var(--shadow-sm)] text-[var(--color-primary-dark)]" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            )}
          >
            <Zap size={16} />
            إضافة ذكية (صنف جديد)
          </button>
          <button 
            onClick={() => setMode('existing')} 
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all", 
              mode === 'existing' ? "bg-white shadow-[var(--shadow-sm)] text-[var(--color-primary-dark)]" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            )}
          >
            <PackageSearch size={16} />
            من الأصناف الحالية
          </button>
        </div>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          {mode === 'smart' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <Label>نوع الصنف (القالب)</Label>
                <Select 
                  value={template} 
                  onChange={(e) => setTemplate(e.target.value as ProductTemplate)}
                  className="bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20"
                >
                  <option value="beads">💎 فصوص وخرز</option>
                  <option value="fabric">🧵 أقمشة</option>
                  <option value="general">📦 منتج عام</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>اسم الصنف الأساسي <span className="text-[var(--color-danger)]">*</span></Label>
                <Input 
                  placeholder={template === 'beads' ? 'مثال: خرز كريستال' : template === 'fabric' ? 'مثال: قماش حرير' : 'اسم المنتج...'} 
                  value={productName} 
                  onChange={e => setProductName(e.target.value)} 
                />
              </div>

              {template === 'beads' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اللون (اختياري)</Label>
                    <Input 
                      placeholder="مثال: أحمر" 
                      value={color} 
                      onChange={e => setColor(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الوزن / المقاس (اختياري)</Label>
                    <Input 
                      placeholder="مثال: 50 جرام" 
                      value={weight} 
                      onChange={e => setWeight(e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {template === 'fabric' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>النوع / النقشة (اختياري)</Label>
                    <Input 
                      placeholder="مثال: سادة، مشجر" 
                      value={fabricType} 
                      onChange={e => setFabricType(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الطول (اختياري)</Label>
                    <Input 
                      placeholder="مثال: 20 متر" 
                      value={length} 
                      onChange={e => setLength(e.target.value)} 
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <Label>المنتج الأساسي <span className="text-[var(--color-danger)]">*</span></Label>
                <Select 
                  value={selectedProductId} 
                  onChange={(e) => { 
                    setSelectedProductId(e.target.value); 
                    setSelectedVariantId(''); 
                  }}
                >
                  <option value="">اختر المنتج...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>

              {selectedProductId && (
                <div className="space-y-2">
                  <Label>الصنف / التعبئة <span className="text-[var(--color-danger)]">*</span></Label>
                  <Select 
                    value={selectedVariantId} 
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                  >
                    <option value="">اختر الصنف...</option>
                    {variants.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="h-px w-full bg-[var(--color-border)] my-2"></div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الكمية المضافة <span className="text-[var(--color-danger)]">*</span></Label>
              <Input 
                type="number" 
                placeholder="مثال: 100" 
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
                min="1"
                className="font-bold text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Input 
                placeholder="سبب الإضافة..." 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="me-2">إلغاء</Button>
          <Button onClick={handleSave} className="gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border-0">
            <Plus size={16} />
            {mode === 'smart' ? 'تعريف وإضافة الرصيد' : 'إضافة الرصيد'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
