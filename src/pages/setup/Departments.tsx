import React, { useState } from 'react';
import { db, syncEngine, LocalDepartment } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Network, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const Departments = () => {
  const departments = useLiveQuery(() => db.departments.toArray());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const editDepartment = (dept: LocalDepartment) => {
    setName(dept.name);
    setDescription(dept.description || '');
    setEditingId(dept.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingId) {
        const dept = await db.departments.get(editingId);
        if (dept) {
          await syncEngine.addOperation('departments', 'UPDATE', {
            ...dept,
            name,
            description
          });
          toast.success('تم التحديث بنجاح');
        }
      } else {
        await syncEngine.addOperation('departments', 'INSERT', {
          id: uuidv4(),
          name,
          description,
          createdAt: new Date().toISOString(),
        });
        toast.success('تمت الإضافة بنجاح');
      }
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">الأقسام وجهات الاستخدام</h1>
          <p className="text-neutral-500 mt-1">إدارة الأقسام (مثل المفصصة، الخياطة) لتوجيه المنصرف الداخلي لها.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة قسم
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-neutral-800 mb-4">
            {editingId ? 'تعديل قسم' : 'قسم جديد'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">اسم القسم *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="مثال: الخياطة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">الوصف</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
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
                حفظ
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments?.map((dept) => (
          <div key={dept.id} className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Network size={24} />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => editDepartment(dept)}
                  className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-neutral-800 text-lg">{dept.name}</h3>
            {dept.description && (
              <p className="text-neutral-500 text-sm mt-1">{dept.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
