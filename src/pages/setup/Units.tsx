import React, { useState } from 'react';
import { db, syncEngine, LocalUnit } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Ruler, Plus, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const Units = () => {
  const units = useLiveQuery(() => db.units.toArray());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const unitData = { name, symbol };
      if (editingId) {
        await syncEngine.addOperation('units', 'UPDATE', { id: editingId, ...unitData });
        toast.success('تم تحديث الوحدة بنجاح');
      } else {
        await syncEngine.addOperation('units', 'INSERT', { id: uuidv4(), ...unitData });
        toast.success('تمت إضافة الوحدة بنجاح');
      }
      resetForm();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const resetForm = () => {
    setName('');
    setSymbol('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const editUnit = (u: LocalUnit) => {
    setEditingId(u.id);
    setName(u.name);
    setSymbol(u.symbol || '');
    setIsFormOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <Ruler className="text-primary-500" />
            وحدات القياس
          </h1>
          <p className="text-neutral-500 text-sm mt-1">إدارة وحدات القياس (قطعة، متر، كجم...)</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة وحدة
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-lg font-semibold mb-4 text-neutral-800">
            {editingId ? 'تعديل الوحدة' : 'إضافة وحدة جديدة'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">اسم الوحدة</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  placeholder="مثال: قطعة، كيلوجرام..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">الرمز (اختياري)</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  placeholder="مثال: pcs, kg, m"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-colors font-medium text-sm"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-xl transition-colors font-medium text-sm"
              >
                حفظ الوحدة
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {units === undefined ? (
          <div className="p-8 flex justify-center text-neutral-400">جاري التحميل...</div>
        ) : units.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
            <Ruler size={48} className="mb-4 text-neutral-300" />
            <p className="font-medium text-lg text-neutral-700">لا توجد وحدات قياس</p>
            <p className="text-sm mt-1">ابدأ بإنشاء أول وحدة قياس لاستخدامها مع المنتجات</p>
          </div>
        ) : (
          <table className="w-full text-right text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-600 font-medium">
              <tr>
                <th className="px-6 py-4">اسم الوحدة</th>
                <th className="px-6 py-4">الرمز</th>
                <th className="px-6 py-4 w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-800">{u.name}</td>
                  <td className="px-6 py-4 text-neutral-500" dir="ltr">{u.symbol || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => editUnit(u)}
                      className="text-neutral-400 hover:text-primary-500 transition-colors p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
