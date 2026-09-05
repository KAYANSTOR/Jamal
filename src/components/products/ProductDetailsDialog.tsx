import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Package, ScanBarcode, CheckCircle2, Layers } from 'lucide-react';
import type { LocalProduct, LocalVariant, LocalUnit } from '../../lib/db';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface ProductDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: LocalProduct;
  categoryName: string;
  variants: LocalVariant[];
  units: LocalUnit[];
  variantBalances: Record<string, number>;
}

export function ProductDetailsDialog({ 
  open, 
  onOpenChange, 
  product, 
  categoryName,
  variants,
  units,
  variantBalances
}: ProductDetailsDialogProps) {
  
  const getUnitName = (id?: string) => {
    if (!id) return '-';
    const unit = units.find(u => u.id === id);
    return unit ? `${unit.name} ${unit.symbol ? `(${unit.symbol})` : ''}` : '-';
  };

  const parseAttributes = (attrsStr?: string) => {
    if (!attrsStr) return null;
    try {
      const parsed = JSON.parse(attrsStr);
      if (Object.keys(parsed).length === 0) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogClose onClick={() => onOpenChange(false)} />
      <DialogHeader className="pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-start gap-4 pe-6">
          <div className="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)] rounded-xl mt-1">
            <Package size={28} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <DialogTitle className="text-xl mb-1">{product.name}</DialogTitle>
              <Badge variant="secondary" className="bg-[var(--color-muted)]">
                {categoryName}
              </Badge>
            </div>
            {product.description && (
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{product.description}</p>
            )}
            <div className="flex items-center text-xs text-[var(--color-muted-foreground)] mt-3">
              <span className="bg-[var(--color-surface)] px-2 py-1 rounded border border-[var(--color-border)] shadow-[var(--shadow-neu-inner)]">
                الحد الأدنى: <strong className="text-[var(--color-foreground)]">{product.minStockLevel || '0'}</strong>
              </span>
              <span className="ms-3 text-[var(--color-muted-foreground)] opacity-70" dir="ltr">
                {product.createdAt ? format(new Date(product.createdAt), 'dd/MM/yyyy', { locale: arSA }) : ''}
              </span>
            </div>
          </div>
        </div>
      </DialogHeader>
      
      <DialogContent className="space-y-6 max-h-[80vh] overflow-y-auto">
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-[var(--color-foreground)] flex items-center gap-2">
            <Layers size={16} className="text-[var(--color-primary)]" />
            أنواع الصنف (Variants)
          </h4>
          
          <div className="grid grid-cols-1 gap-4">
            {variants.length === 0 ? (
              <div className="text-center py-6 border border-[var(--color-border)] border-dashed rounded-xl bg-[var(--color-muted)]/30">
                <p className="text-sm text-[var(--color-muted-foreground)]">لا توجد أنواع مضافة لهذا الصنف</p>
              </div>
            ) : (
              variants.map(variant => {
                const qty = variantBalances[variant.id] || 0;
                const attributes = parseAttributes(variant.attributes);
                
                return (
                  <div key={variant.id} className="rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-soft)] bg-[var(--color-surface)]">
                    <div className="flex justify-between items-center p-3 bg-[var(--color-muted)]/30 border-b border-[var(--color-border)]">
                      <h5 className="font-semibold text-[var(--color-foreground)] text-sm">{variant.name}</h5>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-muted-foreground)]">الرصيد الكلي:</span>
                        <Badge variant={qty > 0 ? 'default' : 'secondary'} className={qty > 0 ? 'bg-[var(--color-primary)] text-white' : ''}>
                          {qty.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-foreground)] text-xs">وحدة القياس:</span>
                          <span className="font-medium text-[var(--color-foreground)]">{getUnitName(variant.unitId)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-foreground)] text-xs">SKU:</span>
                          <span className="font-mono text-xs">{variant.sku || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--color-muted-foreground)] text-xs">الباركود:</span>
                          <div className="flex items-center gap-1">
                            <ScanBarcode size={12} className="text-[var(--color-muted-foreground)]" />
                            <span className="font-mono text-xs">{variant.barcode || '-'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t sm:border-t-0 sm:border-s border-[var(--color-border)] pt-3 sm:pt-0 sm:ps-4">
                        <span className="text-[var(--color-muted-foreground)] text-xs block mb-2">الخصائص الإضافية:</span>
                        {!attributes ? (
                          <span className="text-xs text-[var(--color-muted-foreground)] opacity-70">لا توجد</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(attributes).map(([k, v]) => (
                              <div key={k} className="inline-flex items-center text-xs bg-[var(--color-muted)]/50 border border-[var(--color-border)] rounded px-1.5 py-0.5">
                                <span className="text-[var(--color-muted-foreground)] me-1">{k}:</span>
                                <span className="font-medium text-[var(--color-foreground)]">{v as string}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
