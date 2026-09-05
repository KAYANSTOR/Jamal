import React, { useState } from 'react';
import { db, syncEngine, LocalProduct, LocalVariant } from '../../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Box, Plus, Edit2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const Products = () => {
  const products = useLiveQuery(() => db.products.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const units = useLiveQuery(() => db.units.toArray());
  const variants = useLiveQuery(() => db.variants.toArray());

  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Product Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  
  // Variants Form State
  const [activeVariants, setActiveVariants] = useState<any[]>([{ id: uuidv4(), name: 'الافتراضي', unitId: '', sku: '', barcode: '', attributes: '' }]);

  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeVariants.length === 0) {
      toast.error('يجب إضافة متغير واحد على الأقل للمنتج');
      return;
    }

    try {
      const productId = uuidv4();
      
      // Insert Product
      await syncEngine.addOperation('products', 'INSERT', {
        id: productId,
        name,
        categoryId,
        description,
      });

      // Insert Variants
      for (const v of activeVariants) {
        await syncEngine.addOperation('productVariants', 'INSERT', {
          id: v.id,
          productId,
          name: v.name,
          unitId: v.unitId || null,
          sku: v.sku || null,
          barcode: v.barcode || null,
          attributes: v.attributes || null,
        });
      }

      toast.success('تمت إضافة المنتج بنجاح');
      resetForm();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const resetForm = () => {
    setName('');
    setCategoryId('');
    setDescription('');
    setActiveVariants([{ id: uuidv4(), name: 'الافتراضي', unitId: '', sku: '', barcode: '', attributes: '' }]);
    setIsFormOpen(false);
  };

  const addVariantField = () => {
    setActiveVariants([...activeVariants, { id: uuidv4(), name: '', unitId: '', sku: '', barcode: '', attributes: '' }]);
  };

  const removeVariantField = (id: string) => {
    if (activeVariants.length === 1) return;
    setActiveVariants(activeVariants.filter(v => v.id !== id));
  };

  const updateVariant = (id: string, field: string, value: string) => {
    setActiveVariants(activeVariants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const toggleExpand = (productId: string) => {
    if (expandedProduct === productId) setExpandedProduct(null);
    else setExpandedProduct(productId);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <Box className="text-primary-500" />
            دليل الأصناف
          </h1>
          <p className="text-neutral-500 text-sm mt-1">إدارة المنتجات الأساسية ومتغيراتها (الألوان، المقاسات، الخ)</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-neutral-800 hover:bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          إضافة منتج
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-xl font-bold mb-6 text-neutral-800 border-b border-neutral-100 pb-4">إضافة منتج جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Product Details */}
            <div>
              <h3 className="text-sm font-bold text-primary-500 uppercase tracking-wider mb-4">البيانات الأساسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">اسم المنتج <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">الفئة</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  >
                    <option value="">-- بدون فئة --</option>
                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">الوصف</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border-neutral-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Variants */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-primary-500 uppercase tracking-wider">المتغيرات (Variants)</h3>
                <button
                  type="button"
                  onClick={addVariantField}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  <Plus size={16} /> إضافة متغير آخر
                </button>
              </div>
              
              <div className="space-y-4">
                {activeVariants.map((v, index) => (
                  <div key={v.id} className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                    {activeVariants.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeVariantField(v.id)}
                        className="absolute top-2 left-2 text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">اسم المتغير <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={v.name}
                        onChange={(e) => updateVariant(v.id, 'name', e.target.value)}
                        placeholder="مثال: أحمر / XL"
                        className="w-full border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">الوحدة</label>
                      <select
                        value={v.unitId}
                        onChange={(e) => updateVariant(v.id, 'unitId', e.target.value)}
                        className="w-full border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">-- اختياري --</option>
                        {units?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">SKU</label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariant(v.id, 'sku', e.target.value)}
                        className="w-full border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">الباركود</label>
                      <input
                        type="text"
                        value={v.barcode}
                        onChange={(e) => updateVariant(v.id, 'barcode', e.target.value)}
                        className="w-full border-neutral-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">خصائص (JSON)</label>
                      <input
                        type="text"
                        value={v.attributes}
                        onChange={(e) => updateVariant(v.id, 'attributes', e.target.value)}
                        placeholder='{"color":"red"}'
                        className="w-full border-neutral-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-1 focus:ring-primary-500"
                        dir="ltr"
                      />
                    </div>
                  </div>
                ))}
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
                حفظ المنتج
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {products === undefined ? (
          <div className="p-8 flex justify-center text-neutral-400">جاري التحميل...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
            <Box size={48} className="mb-4 text-neutral-300" />
            <p className="font-medium text-lg text-neutral-700">لا توجد منتجات</p>
            <p className="text-sm mt-1">قم بإضافة أول منتج لتبدأ إدارة المخزون</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {products.map((product) => {
              const productCategory = categories?.find(c => c.id === product.categoryId);
              const productVariants = variants?.filter(v => v.productId === product.id) || [];
              const isExpanded = expandedProduct === product.id;

              return (
                <div key={product.id} className="group">
                  <div 
                    onClick={() => toggleExpand(product.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${isExpanded ? 'bg-primary-50 text-primary-600' : 'bg-neutral-100 text-neutral-500'}`}>
                        <Box size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-800">{product.name}</h4>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {productCategory ? productCategory.name : 'بدون فئة'} • {productVariants.length} متغيرات
                        </p>
                      </div>
                    </div>
                    <div className="text-neutral-400">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-neutral-50/50 p-4 border-t border-neutral-100">
                      <table className="w-full text-right text-sm">
                        <thead className="text-xs text-neutral-500 uppercase tracking-wider">
                          <tr>
                            <th className="pb-3 pr-4 font-medium">اسم المتغير</th>
                            <th className="pb-3 font-medium">الوحدة</th>
                            <th className="pb-3 font-medium">SKU</th>
                            <th className="pb-3 font-medium">الباركود</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {productVariants.map(variant => {
                            const unit = units?.find(u => u.id === variant.unitId);
                            return (
                              <tr key={variant.id}>
                                <td className="py-2 pr-4 font-medium text-neutral-700">{variant.name}</td>
                                <td className="py-2 text-neutral-500">{unit ? unit.name : '-'}</td>
                                <td className="py-2 text-neutral-500" dir="ltr">{variant.sku || '-'}</td>
                                <td className="py-2 text-neutral-500" dir="ltr">{variant.barcode || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
