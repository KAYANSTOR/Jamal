import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Scale, Save, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { InventoryRepository } from '../lib/repositories';

export function OpeningBalances() {
  const [warehouseId, setWarehouseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('رصيد افتتاحي');
  
  const [items, setItems] = useState<{ variantId: string, quantity: string, cost: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];
  const variants = useLiveQuery(() => db.variants.toArray()) || [];

  const handleAddItem = () => {
    setItems([...items, { variantId: '', quantity: '1', cost: '0' }]);
  };

  const handleUpdateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!warehouseId) return alert('الرجاء اختيار المخزن');
    if (items.length === 0) return alert('الرجاء إضافة أصناف للرصيد');
    if (items.some(i => !i.variantId || parseFloat(i.quantity) <= 0)) return alert('الرجاء تعبئة جميع الحقول بشكل صحيح');
    
    // Prevent duplicates in same request
    const uniqueVariants = new Set(items.map(i => i.variantId));
    if (uniqueVariants.size !== items.length) {
      return alert('يوجد صنف مكرر، الرجاء دمج الكميات أو إزالة التكرار');
    }

    try {
      setIsSubmitting(true);
      await InventoryRepository.postOpeningBalance(warehouseId, items, new Date(date).toISOString(), notes);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setItems([]);
        setWarehouseId('');
      }, 3000);
    } catch (e) {
      alert('حدث خطأ أثناء حفظ الرصيد الافتتاحي');
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout 
      pageTitle="الأرصدة الافتتاحية"
      headerSubtitle="إدخال أرصدة بداية المدة للمخازن"
    >
      {success && (
        <div className="mb-6 bg-[var(--color-success)]/10 border border-[var(--color-success)] text-[var(--color-success-dark)] p-4 rounded-[var(--radius-lg)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={24} />
          <div>
            <h3 className="font-bold">تم ترحيل الرصيد الافتتاحي بنجاح!</h3>
            <p className="text-sm opacity-90">تمت إضافة الحركات إلى Outbox ليتم مزامنتها مع الخادم.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] sticky top-6">
            <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scale size={20} className="text-[var(--color-primary)]" />
                بيانات السند
              </CardTitle>
              <CardDescription>حدد المخزن وتاريخ إدخال الأرصدة</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-foreground)]">المخزن</label>
                <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-full">
                  <option value="">-- اختر المخزن --</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-foreground)]">تاريخ الرصيد الافتتاحي</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-foreground)]">ملاحظات</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
              <CardTitle className="text-lg">الأصناف والكميات</CardTitle>
              <Button variant="secondary" size="sm" onClick={handleAddItem}>
                <Plus size={16} className="me-2" />
                إضافة صنف
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[var(--color-surface)]">
                    <TableRow>
                      <TableHead>الصنف (Variant)</TableHead>
                      <TableHead className="w-[120px]">الكمية</TableHead>
                      <TableHead className="w-[120px]">التكلفة (للوحدة)</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-[var(--color-muted-foreground)]">
                          اضغط على إضافة صنف للبدء في تسجيل الرصيد الافتتاحي
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select 
                              value={item.variantId} 
                              onChange={(e) => handleUpdateItem(index, 'variantId', e.target.value)}
                              className="w-full"
                            >
                              <option value="">-- اختر الصنف --</option>
                              {variants.map(v => (
                                <option key={v.id} value={v.id}>{v.name} ({v.sku || 'بدون رمز'})</option>
                              ))}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              min="0" 
                              step="any"
                              value={item.quantity} 
                              onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                              dir="ltr"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              min="0" 
                              step="any"
                              value={item.cost} 
                              onChange={(e) => handleUpdateItem(index, 'cost', e.target.value)}
                              dir="ltr"
                            />
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRemoveItem(index)}
                              className="text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {items.length > 0 && (
                <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex justify-end">
                  <Button 
                    variant="default" 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !warehouseId || items.length === 0}
                    className="w-full sm:w-auto"
                  >
                    <Save size={18} className="me-2" />
                    ترحيل الرصيد الافتتاحي
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
