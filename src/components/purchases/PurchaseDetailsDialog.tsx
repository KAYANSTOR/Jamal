import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalPurchase, type LocalSupplier, type LocalWarehouse } from '../../lib/db';
import { PurchaseRepository } from '../../lib/repositories';
import { format } from 'date-fns';
import { Loader2, Calendar, MapPin, Truck, CheckCircle2, Box } from 'lucide-react';

interface PurchaseDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: LocalPurchase | null;
  suppliers: LocalSupplier[];
  warehouses: LocalWarehouse[];
}

export function PurchaseDetailsDialog({ open, onOpenChange, purchase, suppliers, warehouses }: PurchaseDetailsDialogProps) {
  const [isReceiving, setIsReceiving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiveData, setReceiveData] = useState<{ [key: string]: string }>({});
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);

  const purchaseItems = useLiveQuery(
    () => purchase ? db.purchaseItems.where('purchaseId').equals(purchase.id).toArray() : [],
    [purchase?.id]
  ) || [];

  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const getVariantName = (vid: string) => {
    const variant = variants.find(v => v.id === vid);
    if (!variant) return 'غير معروف';
    const product = products.find(p => p.id === variant.productId);
    return product ? `${product.name} - ${variant.name}` : variant.name;
  };

  const supplier = suppliers.find(s => s.id === purchase?.supplierId);
  const warehouse = warehouses.find(w => w.id === purchase?.warehouseId);

  const handleConfirm = async () => {
    if (!purchase) return;
    setIsSubmitting(true);
    try {
      await PurchaseRepository.updatePurchaseStatus(purchase.id, 'CONFIRMED');
    } catch (err) {
      console.error('Failed to confirm purchase:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveToggle = () => {
    if (!isReceiving) {
      // Initialize receiveData
      const initial: { [key: string]: string } = {};
      purchaseItems.forEach(item => {
        const remaining = parseFloat(item.quantity) - parseFloat(item.receivedQuantity || '0');
        if (remaining > 0) {
          initial[item.id] = remaining.toString();
        }
      });
      setReceiveData(initial);
      setReceiptNumber('');
      setReceiptDate(new Date().toISOString().split('T')[0]);
    }
    setIsReceiving(!isReceiving);
  };

  const handleReceiveSubmit = async () => {
    if (!purchase) return;
    setIsSubmitting(true);
    try {
      const receivedItems = Object.entries(receiveData)
        .map(([purchaseItemId, qty]) => ({ purchaseItemId, quantity: qty }))
        .filter(item => parseFloat(item.quantity) > 0);

      if (receivedItems.length === 0) {
        alert('يجب إدخال كمية واحدة على الأقل للاستلام');
        setIsSubmitting(false);
        return;
      }

      await PurchaseRepository.receivePurchase(
        purchase.id,
        { date: receiptDate, receiptNumber },
        receivedItems
      );
      
      setIsReceiving(false);
    } catch (err: any) {
      console.error('Failed to receive purchase:', err);
      alert(err.message || 'حدث خطأ أثناء الاستلام');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!purchase) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">مسودة</Badge>;
      case 'CONFIRMED': return <Badge variant="primary" className="bg-[var(--color-primary)] text-white">مؤكد</Badge>;
      case 'PARTIAL': return <Badge variant="warning">استلام جزئي</Badge>;
      case 'RECEIVED': return <Badge variant="success">مستلم بالكامل</Badge>;
      case 'CANCELLED': return <Badge variant="danger">ملغي</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClick={() => onOpenChange(false)} />
        <DialogHeader className="border-b border-[var(--color-border)] pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl mb-2 flex items-center gap-2">
                تفاصيل أمر الشراء {purchase.invoiceNumber ? `(${purchase.invoiceNumber})` : ''}
                {getStatusBadge(purchase.status)}
              </DialogTitle>
              <div className="text-sm text-[var(--color-muted-foreground)] flex flex-wrap gap-4 mt-2">
                <span className="flex items-center gap-1.5"><Calendar size={14}/> {format(new Date(purchase.date), 'dd/MM/yyyy')}</span>
                <span className="flex items-center gap-1.5"><Truck size={14}/> {supplier?.name || 'مورد غير معروف'}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14}/> {warehouse?.name || 'مخزن غير معروف'}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
            <div className="p-3 bg-[var(--color-muted)]/30 border-b border-[var(--color-border)]">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Box size={16} className="text-[var(--color-primary)]" />
                الأصناف المطلوبة
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الصنف</TableHead>
                    <TableHead className="text-center">الكمية المطلوبة</TableHead>
                    <TableHead className="text-center">الكمية المستلمة</TableHead>
                    <TableHead className="text-center">المتبقي</TableHead>
                    {isReceiving && <TableHead className="text-center w-32 bg-[var(--color-primary)]/5">إدخال استلام</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseItems.map(item => {
                    const ordered = parseFloat(item.quantity) || 0;
                    const received = parseFloat(item.receivedQuantity || '0');
                    const remaining = ordered - received;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{getVariantName(item.variantId)}</TableCell>
                        <TableCell className="text-center">{ordered}</TableCell>
                        <TableCell className="text-center font-semibold text-[var(--color-success)]">{received}</TableCell>
                        <TableCell className="text-center font-semibold text-[var(--color-warning)]">{remaining > 0 ? remaining : 0}</TableCell>
                        {isReceiving && (
                          <TableCell className="bg-[var(--color-primary)]/5">
                            <Input
                              type="number"
                              min="0"
                              max={remaining}
                              step="any"
                              value={receiveData[item.id] || ''}
                              onChange={e => {
                                let val = e.target.value;
                                if (parseFloat(val) > remaining) val = remaining.toString();
                                setReceiveData({ ...receiveData, [item.id]: val });
                              }}
                              disabled={remaining <= 0}
                              className="h-8 text-center"
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {isReceiving && (
            <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-sm">بيانات إيصال الاستلام (Receipt)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block">رقم الإيصال / السند</label>
                  <Input 
                    placeholder="اختياري" 
                    value={receiptNumber}
                    onChange={e => setReceiptNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">تاريخ الاستلام</label>
                  <Input 
                    type="date" 
                    value={receiptDate}
                    onChange={e => setReceiptDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-[var(--color-border)]">
            <div>
              <span className="text-sm text-[var(--color-muted-foreground)]">إجمالي الطلب: </span>
              <span className="font-bold font-mono text-lg">{parseFloat(purchase.totalAmount).toLocaleString('ar-SA')}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => {
                if (isReceiving) {
                  setIsReceiving(false);
                } else {
                  onOpenChange(false);
                }
              }} disabled={isSubmitting}>
                {isReceiving ? 'إلغاء الاستلام' : 'إغلاق'}
              </Button>
              
              {purchase.status === 'DRAFT' && !isReceiving && (
                <Button onClick={handleConfirm} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 me-2"/> : <CheckCircle2 className="w-4 h-4 me-2"/>}
                  تأكيد الطلب
                </Button>
              )}

              {(purchase.status === 'CONFIRMED' || purchase.status === 'PARTIAL') && !isReceiving && (
                <Button variant="default" onClick={handleReceiveToggle}>
                  استلام بضاعة (Receive)
                </Button>
              )}

              {isReceiving && (
                <Button variant="default" onClick={handleReceiveSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 me-2"/> : null}
                  حفظ الاستلام
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
