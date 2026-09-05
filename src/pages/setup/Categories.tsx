import React, { useEffect, useState } from 'react';
import { db, syncEngine, LocalCategory } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { FolderTree, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const Categories = () => {
  const categories = useLiveQuery(() => db.categories.toArray());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryData = { name, description };
      if (editingId) {
        await syncEngine.addOperation('categories', 'UPDATE', { id: editingId, ...categoryData });
        toast.success('تم تحديث الفئة بنجاح');
      } else {
        await syncEngine.addOperation('categories', 'INSERT', { id: uuidv4(), ...categoryData });
        toast.success('تمت إضافة الفئة بنجاح');
      }
      resetForm();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const editCategory = (cat: LocalCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsFormOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <FolderTree className="text-primary-500" />
            فئات الأصناف
          </h1>
          <p className="text-neutral-500 text-sm mt-1">إدارة مجموعات وتصنيفات المنتجات</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة فئة
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-lg font-semibold mb-4 text-neutral-800">
            {editingId ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">اسم الفئة</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  placeholder="مثال: إلكترونيات، ملابس..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">الوصف (اختياري)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  placeholder="وصف مختصر للفئة"
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
                حفظ الفئة
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {categories === undefined ? (
          <div className="p-8 flex justify-center text-neutral-400">جاري التحميل...</div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
            <FolderTree size={48} className="mb-4 text-neutral-300" />
            <p className="font-medium text-lg text-neutral-700">لا توجد فئات</p>
            <p className="text-sm mt-1">ابدأ بإنشاء أول فئة لتصنيف منتجاتك</p>
          </div>
        ) : (
          <table className="w-full text-right text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-600 font-medium">
              <tr>
                <th className="px-6 py-4">اسم الفئة</th>
                <th className="px-6 py-4">الوصف</th>
                <th className="px-6 py-4 w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-800">{cat.name}</td>
                  <td className="px-6 py-4 text-neutral-500">{cat.description || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => editCategory(cat)}
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
