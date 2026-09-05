import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Building2, Edit2, Info } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalDepartment } from '../lib/db';
import { DepartmentFormDialog } from '../components/departments/DepartmentFormDialog';
import { DepartmentDetailsDialog } from '../components/departments/DepartmentDetailsDialog';

export function Departments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<LocalDepartment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Local-First Data Fetching
  const departments = useLiveQuery(() => db.departments.toArray()) || [];

  const filteredDepartments = departments.filter(d => {
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) ||
           (d.description && d.description.toLowerCase().includes(q));
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleEdit = (department: LocalDepartment) => {
    setSelectedDepartment(department);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedDepartment(null);
    setIsFormOpen(true);
  };

  const handleViewDetails = (department: LocalDepartment) => {
    setSelectedDepartment(department);
    setIsDetailsOpen(true);
  };

  return (
    <AppLayout 
      pageTitle="مراكز الاستخدام"
      headerSubtitle="إدارة الأقسام ومراكز التكلفة"
      pageActions={
        <Button variant="default" onClick={handleAddNew}>
          <Plus size={18} className="me-2" />
          إضافة قسم
        </Button>
      }
    >
      <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-8">
        <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
              <Input 
                placeholder="بحث باسم القسم أو الوصف..." 
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
                  <TableHead>اسم القسم</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] mb-3">
                          <Building2 size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">لا توجد أقسام</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                          {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لم تقم بإضافة أي قسم بعد'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDepartments.map(department => (
                    <TableRow key={department.id} className="group hover:bg-[var(--color-muted)]/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold">
                            {department.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-[var(--color-foreground)]">
                            {department.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-[var(--color-muted-foreground)] truncate max-w-xs">
                          {department.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(department)}
                            title="التفاصيل"
                          >
                            <Info size={14} />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                            onClick={() => handleEdit(department)}
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

      <DepartmentFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        department={selectedDepartment}
      />

      <DepartmentDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        department={selectedDepartment}
      />
    </AppLayout>
  );
}
