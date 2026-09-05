import React, { useState, useMemo } from 'react';
import { db, syncEngine, LocalPurchase, LocalPurchaseItem } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ShoppingCart, Plus, Edit2, CheckCircle2, ChevronDown, ChevronUp, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from 'decimal.js';

export const Purchases = () => {
  const purchases = useLiveQuery(() => db.purchases.toArray());
  const purchaseItems = useLiveQuery(() => db.purchaseItems.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const warehouses = useLiveQuery(() => db.warehouses.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const variants = useLiveQuery(() => db.variants.toArray());
  const units = useLiveQuery(() => db.units.toArray());

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  
  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Items Form State
  const [activeItems, setActiveItems] = useState<any[]>([{ id: uuidv4(), variantId: '', quantity: '', unitCost: '' }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const validItems = activeItems.filter(item => item.variantId && item.quantity && item.unitCost);
    if (validItems.length === 0) {
      toast.error('يجب إضافة صنف واحد على الأقل وتعبئة الكمية والتكلفة');
      return;
    }

    try {
      const purchaseId = uuidv4();
      
      let totalAmount = new Decimal(0);
      const itemsToInsert = validItems.map(item => {
        const qty = new Decimal(item.quantity);
        const cost = new Decimal(item.unitCost);
        const total = qty.mul(cost);
        totalAmount = totalAmount.plus(total);
        return {
          id: item.id,
          purchaseId,
          variantId: item.variantId,
          quantity: qty.toString(),
          unitCost: cost.toString(),
          totalCost: total.toString()
        };
      });

      // Insert Purchase as a single unified operation
      await syncEngine.addOperation('CREATE_PURCHASE', 'INSERT', {
        id: purchaseId,
        supplierId,
        warehouseId,
        invoiceNumber,
        date: new Date(date).toISOString(),
        items: itemsToInsert.map(i => ({
          id: i.id,
          variantId: i.variantId,
          quantity: i.quantity,
          unitCost: i.unitCost
        }))
      });

      toast.success('تم تسجيل فاتورة الشراء بنجاح');
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const receivePurchase = async (purchase: LocalPurchase) => {
    if (purchase.status === 'RECEIVED' || purchase.status === 'CANCELLED') return;
    
    try {
      const items = await db.purchaseItems.where('purchaseId').equals(purchase.id).toArray();
      
      if (items.length === 0) {
        toast.error('لا توجد أصناف في هذه الفاتورة لاستلامها');
        return;
      }

      // We receive whatever is remaining
      const itemsToReceive = items.map(item => {
        const remaining = new Decimal(item.quantity).minus(new Decimal(item.receivedQuantity || '0'));
        return {
          id: uuidv4(),
          purchaseItemId: item.id,
          quantity: remaining.toString()
        };
      }).filter(i => new Decimal(i.quantity).gt(0));

      if (itemsToReceive.length === 0) {
         toast.error('جميع الأصناف مستلمة بالفعل');
         return;
      }

      await syncEngine.addOperation('RECEIVE_PURCHASE', 'INSERT', {
        id: uuidv4(),
        purchaseId: purchase.id,
        receiptNumber: `REC-${Math.floor(Math.random() * 10000)}`,
        date: new Date().toISOString(),
        items: itemsToReceive
      });

      toast.success('تم استلام البضاعة وتحديث المخزون بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء استلام البضاعة');
    }
  };

  const resetForm = () => {
    setSupplierId('');
    setWarehouseId('');
    setInvoiceNumber('');
    setDate(new Date().toISOString().split('T')[0]);
    setActiveItems([{ id: uuidv4(), variantId: '', quantity: '', unitCost: '' }]);
    setIsFormOpen(false);
  };

  const addItemField = () => {
    setActiveItems([...activeItems, { id: uuidv4(), variantId: '', quantity: '', unitCost: '' }]);
  };

  const removeItemField = (id: string) => {
    if (activeItems.length === 1) return;
    setActiveItems(activeItems.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: string) => {
    setActiveItems(activeItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const toggleExpand = (purchaseId: string) => {
    if (expandedPurchase === purchaseId) setExpandedPurchase(null);
    else setExpandedPurchase(purchaseId);
  };

  // Group variants by product for the select dropdown
  const groupedVariants = useMemo(() => {
    if (!products || !variants) return [];
    return products.map(p => ({
      ...p,
      variants: variants.filter(v => v.productId === p.id)
    })).filter(p => p.variants.length > 0);
  }, [products, variants]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <ShoppingCart className="text-primary-500" />
            المشتريات والاستلام
          </h1>
          <p className="text-neutral-500 text-sm mt-1">تسجيل فواتير الشراء، استلام البضاعة، وتحديث تكلفة المخزون</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إنشاء أمر شراء
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-xl font-bold mb-6 text-neutral-800 border-b border-neutral-100 pb-4">تسجيل فاتورة شراء جديدة</h2>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Header Data */}
            <div>
              <h3 className="text-sm font-bold text-primary-500 uppercase tracking-wider mb-4">البيانات الأساسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">المورد <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">المستودع المستلم <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  >
                    <option value="">-- اختر المستودع --</option>
                    {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">رقم الفاتورة (اختياري)</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">تاريخ الفاتورة</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                    />
                    <Calendar size={18} className="absolute left-3 top-3 text-neutral-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-primary-500 uppercase tracking-wider">الأصناف</h3>
                <button
                  type="button"
                  onClick={addItemField}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  <Plus size={16} /> إضافة صنف آخر
                </button>
              </div>
              
              <div className="space-y-4">
                {activeItems.map((item) => (
                  <div key={item.id} className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                    {activeItems.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeItemField(item.id)}
                        className="absolute top-2 left-2 text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-neutral-500 mb-1">الصنف <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={item.variantId}
                        onChange={(e) => updateItem(item.id, 'variantId', e.target.value)}
                        className="w-full border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">-- اختر الصنف --</option>
                        {groupedVariants.map(product => (
                          <optgroup key={product.id} label={product.name}>
                            {product.variants.map(variant => (
                              <option key={variant.id} value={variant.id}>
                                {product.name} - {variant.name} {variant.sku ? `(${variant.sku})` : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">الكمية <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        className="w-full border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">تكلفة الوحدة <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={item.unitCost}
                        onChange={(e) => updateItem(item.id, 'unitCost', e.target.value)}
                        className="w-full border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                        dir="ltr"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Client-side preview total */}
              <div className="mt-4 flex justify-end">
                <div className="bg-primary-50 text-primary-800 px-4 py-2 rounded-xl font-bold flex gap-4">
                  <span>الإجمالي التقديري:</span>
                  <span dir="ltr">
                    {activeItems.reduce((sum, item) => {
                      const q = parseFloat(item.quantity) || 0;
                      const c = parseFloat(item.unitCost) || 0;
                      return sum + (q * c);
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-neutral-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors font-medium text-sm"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-2.5 rounded-xl transition-colors font-medium text-sm shadow-sm"
              >
                حفظ الفاتورة
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {purchases === undefined ? (
          <div className="p-8 flex justify-center text-neutral-400">جاري التحميل...</div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
            <ShoppingCart size={48} className="mb-4 text-neutral-300" />
            <p className="font-medium text-lg text-neutral-700">لا توجد فواتير شراء</p>
            <p className="text-sm mt-1">ابدأ بإنشاء أول فاتورة لتوريد البضاعة للمستودع</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {purchases.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((purchase) => {
              const supplier = suppliers?.find(s => s.id === purchase.supplierId);
              const warehouse = warehouses?.find(w => w.id === purchase.warehouseId);
              const items = purchaseItems?.filter(i => i.purchaseId === purchase.id) || [];
              const isExpanded = expandedPurchase === purchase.id;
              const isReceived = purchase.status === 'RECEIVED';
              const isPartiallyReceived = purchase.status === 'PARTIALLY_RECEIVED';
              const isConfirmed = purchase.status === 'CONFIRMED';
              
              let statusBadge = null;
              if (isReceived) {
                statusBadge = <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded-full">مستلمة كلياً</span>;
              } else if (isPartiallyReceived) {
                statusBadge = <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">مستلمة جزئياً</span>;
              } else {
                statusBadge = <span className="text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">معتمدة</span>;
              }

              return (
                <div key={purchase.id} className="group">
                  <div 
                    onClick={() => toggleExpand(purchase.id)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-neutral-50' : 'hover:bg-neutral-50/50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${isReceived ? 'bg-green-50 text-green-600' : isPartiallyReceived ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isReceived ? <CheckCircle2 size={24} /> : <ShoppingCart size={24} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-800">
                          {supplier?.name || 'مورد غير معروف'} 
                          {purchase.invoiceNumber && <span className="text-neutral-400 text-sm font-normal mr-2">#{purchase.invoiceNumber}</span>}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 font-medium">
                          {statusBadge}
                          <span>•</span>
                          <span>{new Date(purchase.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{warehouse?.name || 'مستودع غير معروف'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-left font-bold text-lg text-neutral-800" dir="ltr">
                        {parseFloat(purchase.totalAmount).toLocaleString()}
                      </div>
                      <div className="text-neutral-400">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-neutral-50/50 p-6 border-t border-neutral-100">
                      <table className="w-full text-right text-sm bg-white rounded-xl overflow-hidden border border-neutral-100">
                        <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-100">
                          <tr>
                            <th className="py-3 px-4">الصنف</th>
                            <th className="py-3 px-4">الوحدة</th>
                            <th className="py-3 px-4">الكمية المطلوبة</th>
                            <th className="py-3 px-4">الكمية المستلمة</th>
                            <th className="py-3 px-4">المتبقي</th>
                            <th className="py-3 px-4">التكلفة</th>
                            <th className="py-3 px-4">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {items.map(item => {
                            const variant = variants?.find(v => v.id === item.variantId);
                            const product = products?.find(p => p.id === variant?.productId);
                            const unit = units?.find(u => u.id === variant?.unitId);
                            const received = new Decimal(item.receivedQuantity || '0');
                            const ordered = new Decimal(item.quantity);
                            const remaining = ordered.minus(received);
                            
                            return (
                              <tr key={item.id}>
                                <td className="py-3 px-4 font-medium text-neutral-700">
                                  {product?.name} - {variant?.name}
                                </td>
                                <td className="py-3 px-4 text-neutral-500">{unit?.name || '-'}</td>
                                <td className="py-3 px-4 font-medium" dir="ltr">{item.quantity}</td>
                                <td className="py-3 px-4 font-medium text-green-600" dir="ltr">{received.toString()}</td>
                                <td className="py-3 px-4 font-medium text-amber-600" dir="ltr">{remaining.toString()}</td>
                                <td className="py-3 px-4 text-neutral-500" dir="ltr">{parseFloat(item.unitCost).toLocaleString()}</td>
                                <td className="py-3 px-4 font-bold text-neutral-800" dir="ltr">{parseFloat(item.totalCost).toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      
                      {!isReceived && (
                        <div className="mt-4 flex justify-end gap-3">
                          <button
                            onClick={() => receivePurchase(purchase)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <CheckCircle2 size={18} />
                            استلام المتبقي (زيادة المخزون)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
