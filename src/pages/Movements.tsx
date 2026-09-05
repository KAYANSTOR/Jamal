import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

export const Movements = () => {
  const movements = useLiveQuery(() => db.stockMovements.reverse().sortBy('date'));
  const warehouses = useLiveQuery(() => db.warehouses.toArray());
  const variants = useLiveQuery(() => db.variants.toArray());

  const getWarehouseName = (id: string) => warehouses?.find(w => w.id === id)?.name || id;
  const getVariantName = (id: string) => variants?.find(v => v.id === id)?.name || id;

  const typeLabels: Record<string, string> = {
    'PURCHASE': 'مشتريات',
    'ISSUE': 'صرف',
    'TRANSFER_IN': 'تحويل وارد',
    'TRANSFER_OUT': 'تحويل صادر',
    'ADJUSTMENT_IN': 'تسوية بزيادة',
    'ADJUSTMENT_OUT': 'تسوية بنقص',
    'OPENING_BALANCE': 'رصيد افتتاحي'
  };

  const typeColors: Record<string, string> = {
    'PURCHASE': 'bg-green-100 text-green-800',
    'ISSUE': 'bg-red-100 text-red-800',
    'TRANSFER_IN': 'bg-blue-100 text-blue-800',
    'TRANSFER_OUT': 'bg-orange-100 text-orange-800',
    'OPENING_BALANCE': 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">سجل حركات المخزون</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع الحركة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المخزن</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصنف (Variant)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movements?.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(m.date).toLocaleString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColors[m.type] || 'bg-gray-100 text-gray-800'}`}>
                    {typeLabels[m.type] || m.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getWarehouseName(m.warehouseId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getVariantName(m.variantId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900" dir="ltr">
                  {Number(m.quantity) > 0 ? '+' : ''}{m.quantity}
                </td>
              </tr>
            ))}
            {movements?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">لا يوجد حركات مسجلة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
