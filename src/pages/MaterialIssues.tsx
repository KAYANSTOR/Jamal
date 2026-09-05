import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select } from '../components/ui/select';
import { Plus, Search, Filter, FileText, Info, Building2, MapPin, Calendar, Ban, CheckCircle2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalMaterialIssue } from '../lib/db';
import { format } from 'date-fns';
import { MaterialIssueFormDialog } from '../components/material-issues/MaterialIssueFormDialog';
import { MaterialIssueDetailsDialog } from '../components/material-issues/MaterialIssueDetailsDialog';
import { MaterialIssueRepository } from '../lib/repositories';

export function MaterialIssues() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<LocalMaterialIssue | null>(null);

  // Local-First Data Fetching
  const issues = useLiveQuery(() => db.materialIssues.toArray()) || [];
  const departments = useLiveQuery(() => db.departments.toArray()) || [];
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  const getDepartmentName = (id: string) => departments.find(d => d.id === id)?.name || 'غير معروف';
  const getWarehouseName = (id: string) => warehouses.find(w => w.id === id)?.name || 'غير معروف';

  const filteredIssues = issues.filter(issue => {
    const dName = getDepartmentName(issue.departmentId).toLowerCase();
    const wName = getWarehouseName(issue.warehouseId).toLowerCase();
    const q = searchQuery.toLowerCase();
    
    const matchesSearch = 
      (issue.issueNumber?.toLowerCase() || '').includes(q) ||
      (issue.issuedBy?.toLowerCase() || '').includes(q) ||
      dName.includes(q) || 
      wName.includes(q);
      
    const matchesStatus = statusFilter === 'ALL' || issue.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleViewDetails = (issue: LocalMaterialIssue) => {
    setSelectedIssue(issue);
    setIsDetailsOpen(true);
  };

  const handleCancelIssue = async (issue: LocalMaterialIssue) => {
    if (window.confirm('هل أنت متأكد من إلغاء هذا السند؟ سيتم عكس الحركات المخزنية فوراً.')) {
      try {
        await MaterialIssueRepository.cancelMaterialIssue(issue.id);
      } catch (err) {
        console.error("Cancel failed", err);
        alert('فشل في الإلغاء');
      }
    }
  };

  const handleSettleIssue = async (issue: LocalMaterialIssue) => {
    if (!window.confirm('سيتم توفية سند الصرف وإغلاقه نهائياً بعد التأكد من معالجة كامل الكميات. هل تريد المتابعة؟')) {
      return;
    }

    try {
      await MaterialIssueRepository.settleMaterialIssue(issue.id);
    } catch (err) {
      console.error('Settle failed', err);
      if (err instanceof Error && err.message === 'ISSUE_HAS_OUTSTANDING_QUANTITY') {
        alert('لا يمكن توفية السند: توجد كميات لم تُرجع أو تُستبدل بعد.');
      } else {
        alert(err instanceof Error ? err.message : 'فشل في توفية السند');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'POSTED': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">معتمد</span>;
      case 'SETTLED': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">موفّى</span>;
      case 'CANCELLED': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)]">ملغي</span>;
      default: return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">{status}</span>;
    }
  };

  return (
    <AppLayout 
      pageTitle="الصرف الداخلي"
      headerSubtitle="إدارة صرف المواد للأقسام ومراكز التكلفة"
      pageActions={
        <Button variant="default" onClick={() => setIsFormOpen(true)}>
          <Plus size={18} className="me-2" />
          إنشاء سند صرف
        </Button>
      }
    >
      <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-8">
        <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
              <Input 
                placeholder="بحث برقم السند، المستلم، أو القسم..." 
                className="ps-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[var(--color-muted-foreground)]" />
                <span className="text-sm text-[var(--color-muted-foreground)]">الحالة:</span>
              </div>
              <Select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-[140px]"
              >
                <option value="ALL">الكل</option>
                <option value="POSTED">معتمد</option>
                <option value="SETTLED">موفّى</option>
                <option value="CANCELLED">ملغي</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[var(--color-surface)]">
                <TableRow className="hover:bg-transparent">
                  <TableHead>رقم السند</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>المخزن (المصدر)</TableHead>
                  <TableHead>المستلم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] mb-3">
                          <FileText size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">لا توجد سندات صرف</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                          {searchQuery || statusFilter !== 'ALL' 
                            ? 'لا توجد نتائج تطابق بحثك' 
                            : 'لم تقم بإنشاء أي سندات صرف داخلي بعد'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIssues.map(issue => (
                    <TableRow key={issue.id} className="group hover:bg-[var(--color-muted)]/30 transition-colors">
                      <TableCell>
                        <span className="font-semibold text-[var(--color-foreground)]" dir="ltr">
                          {issue.issueNumber || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar size={14} className="me-1.5 text-[var(--color-muted-foreground)]" />
                          <span dir="ltr">{format(new Date(issue.date), 'dd/MM/yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-[var(--color-primary)]" />
                          <span className="font-medium">{getDepartmentName(issue.departmentId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-[var(--color-primary)]" />
                          <span>{getWarehouseName(issue.warehouseId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {issue.issuedBy}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(issue.status)}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(issue)}
                            title="التفاصيل"
                          >
                            <Info size={14} />
                          </Button>
                          {issue.status === 'POSTED' && (
                            <>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                                onClick={() => handleSettleIssue(issue)}
                                title="توفية وإغلاق السند"
                              >
                                <CheckCircle2 size={14} />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                                onClick={() => handleCancelIssue(issue)}
                                title="إلغاء السند"
                              >
                                <Ban size={14} />
                              </Button>
                            </>
                          )}
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

      <MaterialIssueFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        departments={departments}
        warehouses={warehouses}
      />

      <MaterialIssueDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        issue={selectedIssue}
        departments={departments}
        warehouses={warehouses}
      />
    </AppLayout>
  );
}
