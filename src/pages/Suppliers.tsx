import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, User, Edit2, Info, Mail, Phone } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalSupplier } from '../lib/db';
import { SupplierFormDialog } from '../components/suppliers/SupplierFormDialog';
import { SupplierDetailsDialog } from '../components/suppliers/SupplierDetailsDialog';

export function Suppliers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<LocalSupplier | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Local-First Data Fetching
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) ||
           (s.phone && s.phone.toLowerCase().includes(q)) ||
           (s.email && s.email.toLowerCase().includes(q));
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleEdit = (supplier: LocalSupplier) => {
    setSelectedSupplier(supplier);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedSupplier(null);
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  const handleViewDetails = (supplier: LocalSupplier) => {
    setSelectedSupplier(supplier);
    setIsDetailsOpen(true);
  };

  return (
    <AppLayout 
      pageTitle="الموردين"
      headerSubtitle="إدارة بيانات الموردين وجهات الاتصال"
      pageActions={
        <Button variant="default" onClick={handleAddNew}>
          <Plus size={18} className="me-2" />
          إضافة مورد
        </Button>
      }
    >
      <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-8">
        <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
              <Input 
                placeholder="بحث باسم المورد، الهاتف، أو البريد الإلكتروني..." 
                className="ps-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[var(--color-surface)]">
                <TableRow className="hover:bg-transparent">
                  <TableHead>اسم المورد</TableHead>
                  <TableHead>رقم الهاتف</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] mb-3">
                          <User size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">لا يوجد موردين</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                          {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لم تقم بإضافة أي مورد بعد'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map(supplier => (
                    <TableRow key={supplier.id} className="group hover:bg-[var(--color-muted)]/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold">
                            {supplier.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-[var(--color-foreground)]">
                            {supplier.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Phone size={14} className="me-1.5 text-[var(--color-muted-foreground)]" />
                          <span dir="ltr">{supplier.phone || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Mail size={14} className="me-1.5 text-[var(--color-muted-foreground)]" />
                          <span dir="ltr">{supplier.email || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(supplier)}
                            title="التفاصيل"
                          >
                            <Info size={14} />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                            onClick={() => handleEdit(supplier)}
                            title="تعديل"
                          >
                            <Edit2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SupplierFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        supplier={selectedSupplier}
      />

      <SupplierDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        supplier={selectedSupplier}
      />
    </AppLayout>
  );
}
