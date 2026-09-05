import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { Warehouses } from './pages/Warehouses';
import { Products } from './pages/Products';
import { Purchases } from './pages/Purchases';
import { Suppliers } from './pages/Suppliers';
import { Departments } from './pages/Departments';
import { MaterialIssues } from './pages/MaterialIssues';
import { MaterialReturns } from './pages/MaterialReturns';
import { StockTransfers } from './pages/StockTransfers';
import { Reports } from './pages/Reports';
import { OpeningBalances } from './pages/OpeningBalances';
import { PhysicalInventory } from './pages/PhysicalInventory';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/products" element={<Products />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/issues" element={<MaterialIssues />} />
        <Route path="/returns" element={<MaterialReturns />} />
          <Route path="/transfers" element={<StockTransfers />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/opening-balances" element={<OpeningBalances />} />
        <Route path="/inventory-count" element={<PhysicalInventory />} />
        {/* Fallback route for unknown paths - renders Dashboard temporarily */}
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
