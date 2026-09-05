import React, { useState } from 'react';
import { db, syncEngine, LocalMaterialIssue } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { PackageMinus, Plus, CheckCircle2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from 'decimal.js';

export const MaterialIssues = () => {
  const materialIssues = useLiveQuery(() => db.materialIssues.toArray());
  const materialIssueItems = useLiveQuery(() => db.materialIssueItems.toArray());
  const departments = useLiveQuery(() => db.departments.toArray());
  const warehouses = useLiveQuery(() => db.warehouses.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const variants = useLiveQuery(() => db.variants.toArray());
  const units = useLiveQuery(() => db.units.toArray());

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  
  // Form State
  const [departmentId, setDepartmentId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [issuedBy, setIssuedBy] = useState('');
  const [notes, setNotes] = useState('');
  
  // Items Form State
  const [activeItems, setActiveItems] = useState<any[]>([{ id: uuidv4(), variantId: '', quantity: '' }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const validItems = activeItems.filter(item => item.variantId && item.quantity);
    if (validItems.length === 0) {
      toast.error('يجب إضافة صنف واحد على الأقل وتحديد الكمية');
      return;
    }

    try {
      const issueId = uuidv4();
      
      const itemsToInsert = validItems.map(item => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity
      }));

      // Insert Issue as a single unified operation
      await syncEngine.addOperation('CREATE_MATERIAL_ISSUE', 'INSERT', {
        id: issueId,
        departmentId,
        warehouseId,
        issuedBy,
        notes,
        date: new Date(date).toISOString(),
        items: itemsToInsert
      });

      toast.success('تم تسجيل سند الصرف بنجاح وتحديث المخزون');
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error('حدث خطأ أثناء الحفظ (قد تكون الكمية غير متوفرة)');
    }
  };

  const resetForm = () => {
    setDepartmentId('');
    setWarehouseId('');
    setIssuedBy('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setActiveItems([{ id: uuidv4(), variantId: '', quantity: '' }]);
    setIsFormOpen(false);
  };

  const addItemRow = () => {
    setActiveItems([...activeItems, { id: uuidv4(), variantId: '', quantity: '' }]);
  };

  const updateItem = (id: string, field: string, value: string) => {
    setActiveItems(activeItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItemRow = (id: string) => {
    if (activeItems.length > 1) {
      setActiveItems(activeItems.filter(item => item.id !== id));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIssue(expandedIssue === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">الصرف الداخلي</h1>
          <p className="text-neutral-500 mt-1">إدارة أوامر صرف المواد للأقسام الداخلية (المفصصة، الخياطة وغيرها).</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إنشاء سند صرف
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-neutral-800 mb-6">سند صرف داخلي جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">المستودع (المصدر) *</label>
                <select
                  required
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">اختر المستودع</option>
                  {warehouses?.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">القسم (جهة الاستخدام) *</label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">اختر القسم</option>
                  {departments?.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">التاريخ *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">المسؤول عن الاستلام *</label>
                <input
                  type="text"
                  required
                  value={issuedBy}
                  onChange={(e) => setIssuedBy(e.target.value)}
                  placeholder="اسم الموظف المستلم"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-sm">
                <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4 w-1/2">الصنف</th>
                    <th className="py-3 px-4 w-1/4">الكمية</th>
                    <th className="py-3 px-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {activeItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="p-2">
                        <select
                          required
                          value={item.variantId}
                          onChange={(e) => updateItem(item.id, 'variantId', e.target.value)}
                          className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none"
                        >
                          <option value="">اختر الصنف</option>
                          {products?.map(product => {
                            const productVariantsList = variants?.filter(v => v.productId === product.id) || [];
                            return (
                              <optgroup key={product.id} label={product.name}>
                                {productVariantsList.map(v => (
                                  <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          placeholder="0.00"
                          className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none"
                          dir="ltr"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(item.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={activeItems.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-neutral-50 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-blue-600 font-medium text-sm flex items-center gap-1 hover:text-blue-700 transition-colors"
                >
                  <Plus size={16} /> إضافة صنف آخر
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">ملاحظات (اختياري)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                rows={2}
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-xl font-medium transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-medium transition-colors"
              >
                حفظ وترحيل (خصم من المخزون)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div>
        {!materialIssues || materialIssues.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
            <PackageMinus size={48} className="mb-4 text-neutral-300" />
            <p className="font-medium text-lg text-neutral-700">لا توجد سندات صرف</p>
            <p className="text-sm mt-1">لم يتم صرف أي مواد للأقسام بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {materialIssues.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((issue) => {
              const department = departments?.find(d => d.id === issue.departmentId);
              const warehouse = warehouses?.find(w => w.id === issue.warehouseId);
              const items = materialIssueItems?.filter(i => i.issueId === issue.id) || [];
              const isExpanded = expandedIssue === issue.id;

              return (
                <div key={issue.id} className="group">
                  <div 
                    onClick={() => toggleExpand(issue.id)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-neutral-50' : 'hover:bg-neutral-50/50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                        <PackageMinus size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-800">
                          صرف إلى: {department?.name || 'قسم غير معروف'} 
                          {issue.issueNumber && <span className="text-neutral-400 text-sm font-normal mr-2">#{issue.issueNumber}</span>}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 font-medium">
                          <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            مُرحّل
                          </span>
                          <span>•</span>
                          <span>{new Date(issue.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{warehouse?.name || 'مستودع غير معروف'}</span>
                          <span>•</span>
                          <span>المستلم: {issue.issuedBy}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-left font-bold text-lg text-neutral-800" dir="ltr">
                        {items.length} أصناف
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
                            <th className="py-3 px-4">الكمية المنصرفة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {items.map(item => {
                            const variant = variants?.find(v => v.id === item.variantId);
                            const product = products?.find(p => p.id === variant?.productId);
                            const unit = units?.find(u => u.id === variant?.unitId);
                            return (
                              <tr key={item.id}>
                                <td className="py-3 px-4 font-medium text-neutral-700">
                                  {product?.name} - {variant?.name}
                                </td>
                                <td className="py-3 px-4 text-neutral-500">{unit?.name || '-'}</td>
                                <td className="py-3 px-4 font-bold text-blue-600" dir="ltr">{item.quantity}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {issue.notes && (
                        <div className="mt-4 text-sm text-neutral-600 bg-white p-4 rounded-xl border border-neutral-100">
                          <strong>ملاحظات:</strong> {issue.notes}
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
