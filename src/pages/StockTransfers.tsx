import React, { useState, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select } from '../components/ui/select';
import { Plus, Search, Filter, Info, Building2, Calendar, ArrowLeftRight, Check, X, Edit, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { StockTransferFormDialog } from '../components/stock-transfers/StockTransferFormDialog';
import { StockTransferDetailsDialog } from '../components/stock-transfers/StockTransferDetailsDialog';
import { StockTransferRepository } from '../lib/repositories';

export function StockTransfers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [draftToEdit, setDraftToEdit] = useState<any | null>(null);

  // Local-First Data Fetching
  const drafts = useLiveQuery(() => db.stockTransferDrafts.toArray()) || [];
  const transferMovements = useLiveQuery(() => db.stockMovements.where('type').anyOf(['TRANSFER_OUT', 'TRANSFER_IN', 'TRANSFER_CANCELLED']).toArray()) || [];
  const warehouses = useLiveQuery(() => db.warehouses.toArray()) || [];

  const getWarehouseName = (id: string) => warehouses.find(w => w.id === id)?.name || 'غير معروف';

  // Construct virtual transfer ledger
  const allTransfers = useMemo(() => {
    const list: any[] = [];
    
    // 1. Add Drafts
    for (const d of drafts) {
      list.push({
        id: d.id,
        sourceWarehouseId: d.sourceWarehouseId,
        destinationWarehouseId: d.destinationWarehouseId,
        date: d.date,
        status: 'DRAFT',
        items: d.items,
        notes: d.notes
      });
    }

    // 2. Add movements-based transfers
    const transferGroups: Record<string, any[]> = {};
    for (const m of transferMovements) {
      if (!m.referenceId || !m.referenceId.startsWith('TRF-')) continue;
      if (!transferGroups[m.referenceId]) transferGroups[m.referenceId] = [];
      transferGroups[m.referenceId].push(m);
    }

    for (const [refId, movements] of Object.entries(transferGroups)) {
      const outMovements = movements.filter(m => m.type === 'TRANSFER_OUT');
      const inMovements = movements.filter(m => m.type === 'TRANSFER_IN');
      const cancelMovements = movements.filter(m => m.type === 'TRANSFER_CANCELLED');
      
      if (outMovements.length === 0) continue; // Invalid transfer
      
      // Parse notes to get dest and notes
      let destId = '';
      let notes = '';
      try {
        const parsed = JSON.parse(outMovements[0].notes || '{}');
        destId = parsed.destId;
        notes = parsed.notes;
      } catch (e) {
        // Handle old/invalid format
      }

      let status = 'SENT';
      if (cancelMovements.length > 0) status = 'CANCELLED';
      else if (inMovements.length > 0) status = 'RECEIVED';

      list.push({
        id: refId,
        sourceWarehouseId: outMovements[0].warehouseId,
        destinationWarehouseId: destId,
        date: outMovements[0].date,
        status,
        items: outMovements.map(m => ({ variantId: m.variantId, quantity: m.quantity })),
        notes
      });
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [drafts, transferMovements]);

  const filteredTransfers = allTransfers.filter(tr => {
    const sName = getWarehouseName(tr.sourceWarehouseId).toLowerCase();
    const dName = getWarehouseName(tr.destinationWarehouseId).toLowerCase();
    const q = searchQuery.toLowerCase();
    
    const matchesSearch = 
      tr.id.toLowerCase().includes(q) ||
      sName.includes(q) || 
      dName.includes(q);
      
    const matchesStatus = statusFilter === 'ALL' || tr.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (transfer: any) => {
    setSelectedTransfer(transfer);
    setIsDetailsOpen(true);
  };

  const handleEditDraft = (transfer: any) => {
    setDraftToEdit(transfer);
    setIsFormOpen(true);
  };

  const handleDeleteDraft = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المسودة؟')) {
      await StockTransferRepository.deleteDraft(id);
    }
  };

  const handleReceive = async (transfer: any) => {
    if (window.confirm('هل أنت متأكد من استلام هذه المواد في المخزن الوجهة؟')) {
      await StockTransferRepository.receiveTransfer(transfer.id, new Date().toISOString(), transfer.destinationWarehouseId, transfer.items);
    }
  };

  const handleCancel = async (transfer: any) => {
    if (window.confirm('هل أنت متأكد من إلغاء هذا التحويل وإعادة المواد للمخزن المصدر؟')) {
      await StockTransferRepository.cancelTransfer(transfer.id, new Date().toISOString(), transfer.sourceWarehouseId, transfer.items);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'DRAFT': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">مسودة</span>;
      case 'SENT': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">مرسل</span>;
      case 'RECEIVED': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">مستلم</span>;
      case 'CANCELLED': return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)]">ملغي</span>;
      default: return null;
    }
  };

  return (
    <AppLayout 
      pageTitle="تحويلات المخزون"
      headerSubtitle="إدارة نقل المواد بين المستودعات المختلفة"
      pageActions={
        <Button variant="default" onClick={() => { setDraftToEdit(null); setIsFormOpen(true); }}>
          <Plus size={18} className="me-2" />
          تحويل مخزني جديد
        </Button>
      }
    >
      <Card className="shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-8">
        <CardHeader className="border-b border-[var(--color-border)] pb-4 bg-[var(--color-muted)]/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" size={16} />
              <Input 
                placeholder="بحث برقم التحويل أو المخازن..." 
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
                <option value="DRAFT">مسودة</option>
                <option value="SENT">مرسل</option>
                <option value="RECEIVED">مستلم</option>
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
                  <TableHead>رقم التحويل</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>من مخزن</TableHead>
                  <TableHead>إلى مخزن</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] mb-3">
                          <ArrowLeftRight size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">لا يوجد تحويلات</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                          {searchQuery || statusFilter !== 'ALL' 
                            ? 'لا توجد نتائج تطابق بحثك' 
                            : 'لم تقم بإنشاء أي تحويلات مخزنية بعد'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransfers.map(tr => (
                    <TableRow key={tr.id} className="group hover:bg-[var(--color-muted)]/30 transition-colors">
                      <TableCell>
                        <span className="font-semibold text-[var(--color-foreground)]" dir="ltr">
                          {tr.id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar size={14} className="me-1.5 text-[var(--color-muted-foreground)]" />
                          <span dir="ltr">{format(new Date(tr.date), 'dd/MM/yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-[var(--color-primary)]" />
                          <span className="font-medium">{getWarehouseName(tr.sourceWarehouseId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-[var(--color-primary)]" />
                          <span>{getWarehouseName(tr.destinationWarehouseId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(tr.status)}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {tr.status === 'DRAFT' && (
                            <>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8 text-[var(--color-primary)]"
                                onClick={() => handleEditDraft(tr)}
                                title="تعديل المسودة"
                              >
                                <Edit size={14} />
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                                onClick={() => handleDeleteDraft(tr.id)}
                                title="حذف المسودة"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </>
                          )}
                          
                          {tr.status === 'SENT' && (
                            <>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8 text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
                                onClick={() => handleReceive(tr)}
                                title="استلام المواد"
                              >
                                <Check size={14} />
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="icon" 
                                className="h-8 w-8 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                                onClick={() => handleCancel(tr)}
                                title="إلغاء وإعادة للمصدر"
                              >
                                <X size={14} />
                              </Button>
                            </>
                          )}

                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(tr)}
                            title="التفاصيل"
                          >
                            <Info size={14} />
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

      <StockTransferFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        warehouses={warehouses}
        draft={draftToEdit}
        onSuccess={() => setIsFormOpen(false)}
      />

      <StockTransferDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        transfer={selectedTransfer}
        warehouses={warehouses}
      />
    </AppLayout>
  );
}
