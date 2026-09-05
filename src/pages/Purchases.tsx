import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Filter, ShoppingCart, Calendar, MapPin, Truck } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalPurchase } from '../lib/db';
import { format } from 'date-fns';
import { PurchaseFormDialog } from '../components/purchases/PurchaseFormDialog';
import { PurchaseDetailsDialog } from '../components/purchases/PurchaseDetailsDialog';

export function Purchases() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<LocalPurchase | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Local-First Data Fetching
  const purchases = useLiveQuery(() => db.purchases.toArray()) || [];
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  const getSupplierName = (id: string) => {
    return suppliers.find(s => s.id === id)?.name || 'مورد غير معروف';
  };

  const getWarehouseName = (id: string) => {
    return warehouses.find(w => w.id === id)?.name || 'مخزن غير معروف';
  };

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = 
      (p.invoiceNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      getSupplierName(p.supplierId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="secondary">مسودة</Badge>;
      case 'CONFIRMED': return <Badge variant="primary" className="bg-[var(--color-primary)] text-white">مؤكد</Badge>;
      case 'PARTIAL': return <Badge variant="warning">استلام جزئي</Badge>;
      case 'RECEIVED': return <Badge variant="success">مستلم بالكامل</Badge>;
      case 'CANCELLED': return <Badge variant="danger">ملغي</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppLayout 
      pageTitle="المشتريات والاستلام"
      headerSubtitle="إدارة أوامر الشراء واستلام المواد"
      pageActions={
        <Button variant="default" onClick={() => setIsFormOpen(true)}>
          <Plus size={18} className="me-2" />
          أمر شراء جديد
        </Button>
      }
    >
      <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-8">
        <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
                <Input 
                  placeholder="بحث برقم الفاتورة أو المورد..." 
                  className="ps-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Select 
                className="w-full sm:w-48"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">جميع الحالات</option>
                <option value="DRAFT">مسودة</option>
                <option value="CONFIRMED">مؤكد</option>
                <option value="PARTIAL">استلام جزئي</option>
                <option value="RECEIVED">مستلم بالكامل</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[var(--color-surface)]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px]">رقم الفاتورة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>المخزن المستلم</TableHead>
                  <TableHead className="text-center">الإجمالي</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] mb-3">
                          <ShoppingCart size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">لا توجد أوامر شراء</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                          {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لم تقم بإنشاء أي أمر شراء بعد'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map(purchase => (
                    <TableRow key={purchase.id} className="group hover:bg-[var(--color-muted)]/30 transition-colors">
                      <TableCell>
                        <span className="font-semibold text-[var(--color-foreground)]">
                          {purchase.invoiceNumber || 'مسودة غير مرقمة'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar size={14} className="me-1.5 text-[var(--color-muted-foreground)]" />
                          <span dir="ltr">{format(new Date(purchase.date), 'dd/MM/yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Truck size={14} className="text-[var(--color-primary)]" />
                          <span className="font-medium text-[var(--color-foreground)]">{getSupplierName(purchase.supplierId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <MapPin size={14} className="me-1.5 text-[var(--color-muted-foreground)]" />
                          {getWarehouseName(purchase.warehouseId)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-[var(--color-foreground)] font-mono">
                          {parseFloat(purchase.totalAmount).toLocaleString('ar-SA')}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(purchase.status)}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setSelectedPurchase(purchase);
                            setIsDetailsOpen(true);
                          }}
                        >
                          التفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PurchaseFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        suppliers={suppliers}
        warehouses={warehouses}
      />

      <PurchaseDetailsDialog 
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        purchase={selectedPurchase}
        suppliers={suppliers}
        warehouses={warehouses}
      />
    </AppLayout>
  );
}
