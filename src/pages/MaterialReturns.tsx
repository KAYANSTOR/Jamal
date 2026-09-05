import React, { useState, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, FileText, Info, Building2, MapPin, Calendar, ArrowLeftRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalStockMovement } from '../lib/db';
import { format } from 'date-fns';
import { MaterialReturnFormDialog } from '../components/material-returns/MaterialReturnFormDialog';
import { MaterialReturnDetailsDialog } from '../components/material-returns/MaterialReturnDetailsDialog';

export function MaterialReturns() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Local-First Data Fetching
  const returns = useLiveQuery(() => db.stockMovements.where('type').equals('INTERNAL_ISSUE_RETURN').toArray()) || [];
  const issues = useLiveQuery(() => db.materialIssues.toArray()) || [];
  const departments = useLiveQuery(() => db.departments.toArray()) || [];
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  const getDepartmentName = (id: string) => departments.find(d => d.id === id)?.name || 'غير معروف';
  const getWarehouseName = (id: string) => warehouses.find(w => w.id === id)?.name || 'غير معروف';

  // Group returns by referenceId and date
  const groupedReturns = useMemo(() => {
    const groups: Record<string, { referenceId: string; date: string; warehouseId: string; items: LocalStockMovement[]; totalQty: number }> = {};
    
    returns.forEach(movement => {
      if (!movement.referenceId) return; // Defensive
      // Normalize date to YYYY-MM-DD for grouping if they happen on the same day, 
      // or just group by the exact timestamp if generated together.
      // Backend uses the same date object for the whole batch, so exact match is fine.
      const key = `${movement.referenceId}_${movement.date}`;
      
      if (!groups[key]) {
        groups[key] = {
          referenceId: movement.referenceId,
          date: movement.date,
          warehouseId: movement.warehouseId,
          items: [],
          totalQty: 0
        };
      }
      groups[key].items.push(movement);
      groups[key].totalQty += parseFloat(movement.quantity || '0');
    });
    
    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [returns]);

  const filteredReturns = groupedReturns.filter(session => {
    const issue = issues.find(i => i.id === session.referenceId);
    const dName = issue ? getDepartmentName(issue.departmentId).toLowerCase() : '';
    const wName = getWarehouseName(session.warehouseId).toLowerCase();
    const issueNum = issue?.issueNumber?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    
    return issueNum.includes(q) || dName.includes(q) || wName.includes(q);
  });

  const handleViewDetails = (session: any) => {
    setSelectedSession(session);
    setIsDetailsOpen(true);
  };

  return (
    <AppLayout 
      pageTitle="مرتجعات المواد"
      headerSubtitle="إدارة المرتجعات من الأقسام إلى المستودعات"
      pageActions={
        <Button variant="default" onClick={() => setIsFormOpen(true)}>
          <Plus size={18} className="me-2" />
          إنشاء مرتجع مواد
        </Button>
      }
    >
      <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-8">
        <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
              <Input 
                placeholder="بحث برقم السند، القسم، أو المخزن..." 
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
                  <TableHead>سند الصرف الأصلي</TableHead>
                  <TableHead>تاريخ المرتجع</TableHead>
                  <TableHead>القسم (المعيد)</TableHead>
                  <TableHead>مخزن الإرجاع</TableHead>
                  <TableHead className="text-center">إجمالي الكمية</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] mb-3">
                          <ArrowLeftRight size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">لا توجد مرتجعات</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                          {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لم تقم بإنشاء أي مرتجعات مواد بعد'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((session, index) => {
                    const issue = issues.find(i => i.id === session.referenceId);
                    
                    return (
                      <TableRow key={`${session.referenceId}_${index}`} className="group hover:bg-[var(--color-muted)]/30 transition-colors">
                        <TableCell>
                          <span className="font-semibold text-[var(--color-foreground)]" dir="ltr">
                            {issue?.issueNumber || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar size={14} className="me-1.5 text-[var(--color-muted-foreground)]" />
                            <span dir="ltr">{format(new Date(session.date), 'dd/MM/yyyy')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-[var(--color-primary)]" />
                            <span className="font-medium">{issue ? getDepartmentName(issue.departmentId) : '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-[var(--color-primary)]" />
                            <span>{getWarehouseName(session.warehouseId)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-[var(--color-primary)]">
                          {session.totalQty}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleViewDetails(session)}
                            title="التفاصيل"
                          >
                            <Info size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <MaterialReturnFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        issues={issues}
      />

      <MaterialReturnDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        returnSession={selectedSession}
        issues={issues}
        warehouses={warehouses}
      />
    </AppLayout>
  );
}
