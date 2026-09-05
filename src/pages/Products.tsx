import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Filter, Package, AlertCircle, ScanBarcode, MapPin, CheckCircle2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { ProductFormDialog } from '../components/products/ProductFormDialog';
import { ProductDetailsDialog } from '../components/products/ProductDetailsDialog';

export function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Local-First Data Fetching
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const variants = useLiveQuery(() => db.variants.toArray()) || [];
  const categories = useLiveQuery(() => db.categories.toArray()) || [];
  const units = useLiveQuery(() => db.units.toArray()) || [];
  const balances = useLiveQuery(() => db.stockMovements.toArray()) || []; // In real scenario, use stock_balances

  // Calculate global balance per variant
  const variantBalances: Record<string, number> = {};
  balances.forEach(m => {
    const qty = parseFloat(m.quantity);
    const isNegative = ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(m.type);
    const sign = isNegative ? -1 : 1;
    variantBalances[m.variantId] = (variantBalances[m.variantId] || 0) + (qty * sign);
  });

  // Calculate Product Stats
  const productStats: Record<string, { totalVariants: number, totalQty: number, lowStock: number }> = {};
  products.forEach(p => {
    productStats[p.id] = { totalVariants: 0, totalQty: 0, lowStock: 0 };
  });

  variants.forEach(v => {
    if (productStats[v.productId]) {
      productStats[v.productId].totalVariants++;
      const qty = variantBalances[v.id] || 0;
      productStats[v.productId].totalQty += qty;
      
      const product = products.find(p => p.id === v.productId);
      const minStock = product?.minStockLevel ? parseFloat(product.minStockLevel) : 0;
      if (qty > 0 && minStock > 0 && qty <= minStock) {
        productStats[v.productId].lowStock++;
      } else if (qty > 0 && qty <= 10 && minStock === 0) {
        // Fallback default low stock threshold for demo if minStock not set
        productStats[v.productId].lowStock++;
      }
    }
  });

  const getCategoryName = (id?: string) => {
    if (!id) return 'غير مصنف';
    return categories.find(c => c.id === id)?.name || 'غير مصنف';
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const openAddForm = () => {
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const openDetails = (product: any) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  return (
    <AppLayout 
      pageTitle="الأصناف والمواد"
      headerSubtitle="إدارة الأصناف وأنواعها في المستودعات (Product Master)"
      pageActions={
        <Button variant="default" onClick={openAddForm}>
          <Plus size={18} className="me-2" />
          إضافة صنف جديد
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
                  placeholder="بحث عن صنف..." 
                  className="ps-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Select 
                className="w-full sm:w-48"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">جميع التصنيفات</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <Button variant="secondary" className="w-full sm:w-auto px-3">
                <Filter size={16} className="me-2" />
                تصفية
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[var(--color-surface)]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">الصنف الأساسي</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead className="text-center">الأنواع (Variants)</TableHead>
                  <TableHead className="text-center">إجمالي الكمية</TableHead>
                  <TableHead className="text-center">نواقص</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] mb-3">
                          <Package size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">لا توجد أصناف</h3>
                        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                          {searchQuery ? 'لا توجد نتائج تطابق بحثك' : 'لم تقم بإضافة أي أصناف بعد'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map(product => {
                    const stats = productStats[product.id] || { totalVariants: 0, totalQty: 0, lowStock: 0 };
                    
                    return (
                      <TableRow key={product.id} className="group cursor-pointer hover:bg-[var(--color-muted)]/30 transition-colors" onClick={() => openDetails(product)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]">
                              <Package size={18} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-[var(--color-foreground)] truncate">{product.name}</span>
                              <span className="text-xs text-[var(--color-muted-foreground)] truncate mt-0.5">
                                الحد الأدنى للطلب: {product.minStockLevel || '0'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal bg-[var(--color-muted)] text-[var(--color-foreground)]">
                            {getCategoryName(product.categoryId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-mono shadow-[var(--shadow-neu-inner)]">
                            {stats.totalVariants}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-[var(--color-foreground)]">
                            {stats.totalQty.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {stats.lowStock > 0 ? (
                            <Badge variant="danger" className="gap-1 bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20 shadow-none">
                              <AlertCircle size={12} />
                              {stats.lowStock}
                            </Badge>
                          ) : (
                            <Badge variant="success" className="gap-1 bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20 shadow-none">
                              <CheckCircle2 size={12} />
                              جيد
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(product);
                            }}
                          >
                            التفاصيل
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

      {/* Forms & Dialogs */}
      <ProductFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        categories={categories}
        units={units}
      />
      
      {selectedProduct && (
        <ProductDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          product={selectedProduct}
          categoryName={getCategoryName(selectedProduct.categoryId)}
          variants={variants.filter(v => v.productId === selectedProduct.id)}
          units={units}
          variantBalances={variantBalances}
        />
      )}
    </AppLayout>
  );
}
