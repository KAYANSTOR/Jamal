import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Filter, Warehouse as WarehouseIcon, MapPin, Package, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalWarehouse } from '../lib/db';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { WarehouseFormDialog } from '../components/warehouses/WarehouseFormDialog';
import { WarehouseDetailsDialog } from '../components/warehouses/WarehouseDetailsDialog';

export function Warehouses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<LocalWarehouse | null>(null);

  const openAddForm = () => {
    setSelectedWarehouse(null);
    setIsFormOpen(true);
  };

  const openEditForm = (warehouse: LocalWarehouse) => {
    setSelectedWarehouse(warehouse);
    setIsFormOpen(true);
  };

  const openDetails = (warehouse: LocalWarehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDetailsOpen(true);
  };

  // Local-First Data Fetching
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];
  const movements = useLiveQuery(() => db.stockMovements.orderBy('date').reverse().toArray()) || [];

  // Computed Stats per Warehouse
  const warehouseStats: Record<string, { totalItems: number, qty: number, lowStock: number, lastMove: Date | null }> = {};
  
  warehouses.forEach(wh => {
    warehouseStats[wh.id] = { totalItems: 0, qty: 0, lowStock: 0, lastMove: null };
  });

  const balancesByWhAndVar: Record<string, Record<string, number>> = {};

  movements.forEach(m => {
    const qty = parseFloat(m.quantity);
    const isNegative = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
    const sign = isNegative ? -1 : 1;
    
    // Wh balance
    if (!balancesByWhAndVar[m.warehouseId]) balancesByWhAndVar[m.warehouseId] = {};
    balancesByWhAndVar[m.warehouseId][m.variantId] = (balancesByWhAndVar[m.warehouseId][m.variantId] || 0) + (qty * sign);
    
    // Wh last move
    if (warehouseStats[m.warehouseId]) {
       const moveDate = new Date(m.date);
       if (!warehouseStats[m.warehouseId].lastMove || moveDate > warehouseStats[m.warehouseId].lastMove!) {
          warehouseStats[m.warehouseId].lastMove = moveDate;
       }
    }
  });
  
  // Aggregate wh stats
  Object.keys(balancesByWhAndVar).forEach(whId => {
    const vars = balancesByWhAndVar[whId];
    if (warehouseStats[whId]) {
       Object.values(vars).forEach(qty => {
          if (qty > 0) warehouseStats[whId].totalItems++;
          warehouseStats[whId].qty += qty;
          if (qty > 0 && qty <= 10) warehouseStats[whId].lowStock++;
       });
    }
  });

  const filteredWarehouses = warehouses.filter(wh => 
    wh.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout 
      pageTitle="إدارة المخازن"
      headerSubtitle="عرض ومتابعة كافة المخازن المسجلة في النظام"
      pageActions={
        <Button variant="default" onClick={openAddForm}>
          <Plus size={18} className="me-2" />
          إضافة مخزن جديد
        </Button>
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative w-full sm:w-96">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={18} />
          <Input 
            placeholder="بحث عن مخزن..." 
            className="ps-10 bg-[var(--color-surface)] shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="secondary" className="shadow-[var(--shadow-soft)] shrink-0">
          <Filter size={16} className="me-2" />
          تصفية النتائج
        </Button>
      </div>

      {filteredWarehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[var(--color-surface)] rounded-2xl shadow-[var(--shadow-soft)] ring-1 ring-[var(--color-border)] text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] mb-4">
            <WarehouseIcon size={32} />
          </div>
          <h3 className="text-xl font-bold text-[var(--color-foreground)] mb-2">لا توجد مخازن</h3>
          <p className="text-[var(--color-muted-foreground)] max-w-md">
            {searchQuery ? "لم يتم العثور على مخازن مطابقة لبحثك. جرب كلمات مفتاحية أخرى." : "لم تقم بإضافة أي مخازن للنظام حتى الآن."}
          </p>
          {!searchQuery && (
            <Button variant="default" className="mt-6" onClick={openAddForm}>
              <Plus size={18} className="me-2" />
              إضافة أول مخزن
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWarehouses.map((wh) => {
            const stats = warehouseStats[wh.id] || { totalItems: 0, qty: 0, lowStock: 0, lastMove: null };
            return (
              <Card key={wh.id} className="overflow-hidden group hover:shadow-md transition-shadow border-0 ring-1 ring-[var(--color-border)] shadow-[var(--shadow-soft)]">
                <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-3 bg-[var(--color-surface)] rounded-xl shadow-[var(--shadow-soft)] text-[var(--color-primary-dark)]">
                      <WarehouseIcon size={24} />
                    </div>
                    <Badge variant={wh.status === 'ACTIVE' ? 'success' : 'secondary'} className="shadow-[var(--shadow-soft)]">
                      {wh.status === 'ACTIVE' ? 'نشط' : 'متوقف'}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold mt-2">{wh.name}</CardTitle>
                  <div className="flex items-center text-sm text-[var(--color-muted-foreground)] mt-1.5">
                    <MapPin size={14} className="me-1.5" />
                    المركز الرئيسي
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--color-muted)]/50 shadow-[var(--shadow-neu-inner)]">
                      <div className="flex items-center text-xs text-[var(--color-muted-foreground)]">
                        <Package size={14} className="me-1.5 text-[var(--color-primary)]" />
                        الكمية الإجمالية
                      </div>
                      <span className="text-lg font-bold text-[var(--color-foreground)] px-1">{stats.qty}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--color-danger)]/5 shadow-[var(--shadow-neu-inner)]">
                      <div className="flex items-center text-xs text-[var(--color-danger)]">
                        <AlertCircle size={14} className="me-1.5" />
                        نواقص الرصيد
                      </div>
                      <span className="text-lg font-bold text-[var(--color-danger)] px-1">{stats.lowStock}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--color-muted-foreground)]">عدد الأصناف (أنواع):</span>
                      <span className="font-semibold text-[var(--color-foreground)]">{stats.totalItems}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--color-muted-foreground)]">آخر تحديث:</span>
                      <span className="font-medium text-[var(--color-foreground)]" dir="ltr">
                        {stats.lastMove ? format(stats.lastMove, 'dd/MM/yyyy HH:mm') : 'لا يوجد'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-[var(--color-primary)] text-[var(--color-primary-dark)] hover:bg-[var(--color-primary)]/5"
                      onClick={() => openDetails(wh)}
                    >
                      التفاصيل
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      onClick={() => openEditForm(wh)}
                    >
                      تعديل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Forms & Dialogs */}
      <WarehouseFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        warehouse={selectedWarehouse}
      />
      
      <WarehouseDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        warehouse={selectedWarehouse}
        stats={selectedWarehouse ? (warehouseStats[selectedWarehouse.id] || { totalItems: 0, qty: 0, lowStock: 0, lastMove: null }) : { totalItems: 0, qty: 0, lowStock: 0, lastMove: null }}
      />
    </AppLayout>
  );
}
