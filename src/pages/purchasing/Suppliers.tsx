import React, { useState } from 'react';
import { db, syncEngine, LocalSupplier } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Users, Plus, Edit2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const Suppliers = () => {
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supplierData = { name, phone, email, createdAt: new Date().toISOString() };
      if (editingId) {
        await syncEngine.addOperation('suppliers', 'UPDATE', { id: editingId, ...supplierData });
        toast.success('تم تحديث المورد بنجاح');
      } else {
        await syncEngine.addOperation('suppliers', 'INSERT', { id: uuidv4(), ...supplierData });
        toast.success('تمت إضافة المورد بنجاح');
      }
      resetForm();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const editSupplier = (s: LocalSupplier) => {
    setEditingId(s.id);
    setName(s.name);
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setIsFormOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <Users className="text-primary-500" />
            الموردين
          </h1>
          <p className="text-neutral-500 text-sm mt-1">إدارة قائمة الموردين وبيانات التواصل الخاصة بهم</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة مورد
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-lg font-semibold mb-4 text-neutral-800">
            {editingId ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">اسم المورد <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  placeholder="اسم الشركة أو الشخص"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  placeholder="رقم التواصل"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  placeholder="example@domain.com"
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
                حفظ المورد
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {suppliers === undefined ? (
          <div className="p-8 flex justify-center text-neutral-400">جاري التحميل...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
            <Users size={48} className="mb-4 text-neutral-300" />
            <p className="font-medium text-lg text-neutral-700">لا يوجد موردين</p>
            <p className="text-sm mt-1">ابدأ بإنشاء أول مورد للبدء في عمليات الشراء</p>
          </div>
        ) : (
          <table className="w-full text-right text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-600 font-medium">
              <tr>
                <th className="px-6 py-4">اسم المورد</th>
                <th className="px-6 py-4">معلومات التواصل</th>
                <th className="px-6 py-4 w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-800">{s.name}</td>
                  <td className="px-6 py-4 text-neutral-500">
                    {s.phone && <div className="flex items-center gap-2 mb-1"><Phone size={14} className="text-neutral-400" /> <span dir="ltr">{s.phone}</span></div>}
                    {s.email && <div className="flex items-center gap-2"><Mail size={14} className="text-neutral-400" /> <span dir="ltr">{s.email}</span></div>}
                    {!s.phone && !s.email && '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => editSupplier(s)}
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
